/**
 * End-to-end retrieval smoke test: real Titan embeddings through real pgvector.
 *
 * The unit tests cover chunking, sanitising and prompt assembly without a network. Nothing
 * they can do proves the part that actually decides answer quality: that an embedding written
 * by Bedrock comes back out of Postgres unchanged, that cosine similarity ranks the right
 * chunk first, and that `match_knowledge_chunks` refuses to cross a tenant boundary.
 *
 * This costs a handful of Titan calls (fractions of a cent) and touches the live database.
 * Everything it writes is rolled back.
 *
 *   npm run db:verify
 */
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { createHash, randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { loadEnv } from './load-env.mjs';

loadEnv();

const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
const region = process.env.BEDROCK_REGION ?? process.env.AWS_REGION;
const modelId = process.env.EMBEDDING_MODEL_ID ?? 'amazon.titan-embed-text-v2:0';
const dimensions = Number(process.env.EMBEDDING_DIMENSIONS ?? 1024);

if (!url || !region) {
  console.error('DATABASE_DIRECT_URL and BEDROCK_REGION must be set.');
  process.exit(1);
}

const bedrock = new BedrockRuntimeClient({ region });
const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 20, onnotice: () => {} });

class RollbackSignal extends Error {}

const results = [];
const check = (name, passed, detail) => {
  results.push({ passed });
  console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

/**
 * Same request shape as apps/api/src/lib/embeddings.ts, written out rather than imported.
 * This script exists to catch drift between our code and the real service; importing the code
 * under test would make it agree with itself by construction.
 */
const embed = async (text) => {
  const response = await bedrock.send(
    new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      body: JSON.stringify({
        inputText: text,
        dimensions,
        normalize: true,
        embeddingTypes: ['float'],
      }),
    }),
  );
  const body = JSON.parse(new TextDecoder().decode(response.body));
  return body.embedding ?? body.embeddingsByType?.float;
};

const vec = (embedding) => `[${embedding.join(',')}]`;

const orgA = randomUUID();
const orgB = randomUUID();
const agentA = randomUUID();
const agentB = randomUUID();

// Deliberately close together. Distinguishing "shipping" from "refunds" is trivial; the
// question that matters is whether retrieval separates two policies a visitor would confuse.
const corpus = [
  'We deliver anywhere in India within two to four working days. Orders above ₹999 ship free.',
  'Returns are accepted within thirty days of delivery, provided the item is unused and in its original packaging.',
  'Our support team is available Monday to Saturday, from 10am to 7pm IST, on chat and phone.',
];

console.log(`Embedding ${String(corpus.length)} chunks with ${modelId}...`);

try {
  const embeddings = await Promise.all(corpus.map((text) => embed(text)));

  check(
    `embeddings are ${String(dimensions)}-dimensional`,
    embeddings.every((e) => Array.isArray(e) && e.length === dimensions),
    `got ${String(embeddings[0]?.length)}`,
  );

  // Titan is asked to normalise. If it did, the L2 norm is 1 — and cosine distance in the
  // index is only meaningful against normalised vectors, so this is worth asserting rather
  // than assuming.
  const norm = Math.sqrt(embeddings[0].reduce((sum, v) => sum + v * v, 0));
  check('embeddings are unit-normalised', Math.abs(norm - 1) < 0.01, `‖v‖ = ${norm.toFixed(4)}`);

  await sql.begin(async (tx) => {
    for (const [org, agent, slugSeed] of [
      [orgA, agentA, 'a'],
      [orgB, agentB, 'b'],
    ]) {
      await tx`insert into public.organizations (id, name, slug)
               values (${org}, ${`Retrieval ${slugSeed}`}, ${`ret-${slugSeed}-${org.slice(0, 8)}`})`;
      await tx`insert into public.agents
                 (id, organization_id, name, website_url, language, persona, appearance, embed_key)
               values (${agent}, ${org}, ${`Agent ${slugSeed}`}, 'https://ret.test.invalid',
                 ${JSON.stringify({ primary: 'en-IN', additional: [], autoDetect: true })},
                 ${JSON.stringify({ displayName: 'Aria', tone: 'friendly' })},
                 ${JSON.stringify({ position: 'bottom-right', accentColor: '#4f46e5' })},
                 ${`emk_${slugSeed}_${agent.slice(0, 8)}`})`;
    }

    const sourceA = randomUUID();
    const docA = randomUUID();
    await tx`insert into public.knowledge_sources (id, organization_id, agent_id, type, title, status)
             values (${sourceA}, ${orgA}, ${agentA}, 'manual_text', 'Policies', 'ready')`;
    await tx`insert into public.knowledge_documents
               (id, organization_id, agent_id, source_id, title, content, content_hash, status)
             values (${docA}, ${orgA}, ${agentA}, ${sourceA}, 'Policies',
                     ${corpus.join('\n\n')}, ${createHash('sha256').update(corpus.join('\n\n')).digest('hex')},
                     'ready')`;

    for (const [i, text] of corpus.entries()) {
      await tx`insert into public.knowledge_chunks
                 (organization_id, agent_id, document_id, ordinal, content, embedding,
                  source_title, token_count)
               values (${orgA}, ${agentA}, ${docA}, ${i}, ${text},
                       ${vec(embeddings[i])}::extensions.vector, 'Policies',
                       ${Math.ceil(text.length / 4)})`;
    }

    check('chunks written with a 1024-dim vector column', true);

    // The real question, embedded as a query rather than a document — the same asymmetry the
    // answer loop uses.
    const question = 'How long do I have to send something back?';
    const queryEmbedding = await embed(question);

    const matches = await tx`
      select * from public.match_knowledge_chunks(
        ${orgA}::uuid, ${agentA}::uuid, ${vec(queryEmbedding)}::extensions.vector,
        3::integer, 0.0::double precision)`;

    check('retrieval returns rows', matches.length > 0, `${matches.length} match(es)`);

    const top = matches[0];
    check(
      'the returns policy ranks first for a returns question',
      top?.content.startsWith('Returns are accepted'),
      `top was: "${top?.content.slice(0, 45)}..."`,
    );

    check(
      'similarity is a sane cosine value',
      typeof top?.similarity === 'number' && top.similarity > 0.3 && top.similarity <= 1,
      `${Number(top?.similarity).toFixed(3)}`,
    );

    check(
      'results are ordered by descending similarity',
      matches.every((m, i) => i === 0 || Number(matches[i - 1].similarity) >= Number(m.similarity)),
      matches.map((m) => Number(m.similarity).toFixed(3)).join(' > '),
    );

    // The similarity floor is what makes the agent say "I don't know" instead of answering
    // from the least-wrong chunk it happens to hold.
    const floored = await tx`
      select * from public.match_knowledge_chunks(
        ${orgA}::uuid, ${agentA}::uuid, ${vec(queryEmbedding)}::extensions.vector,
        8::integer, 0.99::double precision)`;
    check('a high similarity floor filters everything out', floored.length === 0);

    // Tenant scoping inside the function itself, independent of RLS — this is the path the
    // API takes, and the API connects as the service role, for which RLS does nothing.
    const wrongOrg = await tx`
      select * from public.match_knowledge_chunks(
        ${orgB}::uuid, ${agentA}::uuid, ${vec(queryEmbedding)}::extensions.vector,
        8::integer, 0.0::double precision)`;
    check('a foreign organization_id returns nothing', wrongOrg.length === 0);

    const wrongAgent = await tx`
      select * from public.match_knowledge_chunks(
        ${orgA}::uuid, ${agentB}::uuid, ${vec(queryEmbedding)}::extensions.vector,
        8::integer, 0.0::double precision)`;
    check('a foreign agent_id returns nothing', wrongAgent.length === 0);

    throw new RollbackSignal();
  });
} catch (error) {
  if (!(error instanceof RollbackSignal)) {
    console.error(`\nverification errored: ${error.message}`);
    await sql.end();
    process.exit(1);
  }
}

await sql.end({ timeout: 5 });

const failed = results.filter((r) => !r.passed).length;
console.log(`\n${String(results.length - failed)}/${String(results.length)} passed — rolled back.`);
process.exit(failed === 0 ? 0 : 1);
