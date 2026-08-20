/**
 * End-to-end smoke test against a running API.
 *
 * Walks the path a merchant actually walks — sign in, create an agent, add knowledge, wait for
 * it to index, ask a question, read the citations, publish — and fails loudly if any step does
 * not behave. Every layer is real: real Supabase auth, real RLS, real Titan embeddings, real
 * Bedrock generation. Nothing is mocked, because the whole value of this script is catching the
 * failures that only appear when the real pieces are wired together.
 *
 *   npm run dev --workspace @soniq/api      # in one terminal
 *   npm run smoke -- you@example.com 'password'
 *
 * It cleans up after itself: the agent it creates is deleted at the end, and the cascade takes
 * its knowledge with it. A failure part-way leaves the agent behind on purpose — you will want
 * to look at it.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// An exported-but-empty variable must not beat the file — see packages/db/scripts/load-env.mjs.
const envPath = join(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = trimmed.slice(eq + 1).trim();
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:${process.env.API_PORT ?? '4000'}`;

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: npm run smoke -- you@example.com 'password'");
  process.exit(1);
}
if (!supabaseUrl || !anonKey) {
  console.error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
  process.exit(1);
}

let passed = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) {
    console.error('\nSmoke test failed.');
    process.exit(1);
  }
  passed += 1;
};

const step = (label) => console.log(`\n${label}`);

/** Authenticated API call. Throws with the server's message, which is written to be read. */
const call = async (path, { method = 'GET', body, token, organizationId } = {}) => {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(organizationId ? { 'x-organization-id': organizationId } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (response.status === 204) return undefined;
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = payload?.error?.message ?? response.statusText;
    throw new Error(`${method} ${path} → ${String(response.status)} ${message}`);
  }
  return payload;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- 1. Sign in -----------------------------------------------------------------------------

step('1. Authentication');

const signIn = await fetch(new URL('/auth/v1/token?grant_type=password', supabaseUrl), {
  method: 'POST',
  headers: { apikey: anonKey, 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const session = await signIn.json();
check(
  'sign in with email and password',
  signIn.ok && Boolean(session.access_token),
  signIn.ok ? '' : JSON.stringify(session),
);

const token = session.access_token;

// The API verifies this against the project's published JWKS rather than a shared secret. That
// it works at all is the proof the ES256 path is wired correctly.
const alg = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString()).alg;
check('token is asymmetrically signed (JWKS verification path)', alg === 'ES256', `alg=${alg}`);

const health = await call('/health');
check('API is reachable', health?.status === 'ok', apiUrl);

// --- 2. Tenancy -----------------------------------------------------------------------------

step('2. Tenancy');

const { organizations } = await call('/v1/organizations', { token });
check(
  'user belongs to at least one organization',
  organizations.length > 0,
  organizations.map((o) => o.name).join(', '),
);

const organizationId = organizations[0].id;

// The organization header is not optional and not inferred. A request without it must fail,
// because inferring it is exactly how a write lands in the wrong tenant.
let unscopedRejected = false;
try {
  await call('/v1/agents', { token });
} catch {
  unscopedRejected = true;
}
check('a request without x-organization-id is rejected', unscopedRejected);

// --- 3. Create an agent ----------------------------------------------------------------------

step('3. Agent');

const suffix = Date.now().toString(36);
const { agent } = await call('/v1/agents', {
  method: 'POST',
  token,
  organizationId,
  body: { name: `Smoke test ${suffix}`, websiteUrl: 'https://example.com' },
});
check('agent created', Boolean(agent?.id), agent.id);
check('starts as a draft', agent.status === 'draft');
check('embed key generated', typeof agent.embedKey === 'string' && agent.embedKey.length >= 16);
check(
  'own site allowlisted by default',
  agent.allowedOrigins.includes('https://example.com'),
  agent.allowedOrigins.join(', '),
);

let failure;
try {
  // Publishing with an empty knowledge base must be refused. An agent that confidently knows
  // nothing is worse for the merchant than a clear error here.
  let publishRejected = false;
  try {
    await call(`/v1/agents/${agent.id}/publish`, { method: 'POST', token, organizationId });
  } catch (error) {
    publishRejected = String(error).includes('index');
  }
  check('publish is refused before anything is indexed', publishRejected);

  // --- 4. Knowledge --------------------------------------------------------------------------

  step('4. Knowledge');

  await call(`/v1/agents/${agent.id}/knowledge/qa`, {
    method: 'POST',
    token,
    organizationId,
    body: {
      question: 'How long do I have to return an item?',
      answer:
        'You have 30 days from the delivery date to start a return. Items must be unused and in their original packaging. Refunds are issued to the original payment method within 5 business days of us receiving the item.',
    },
  });
  check('Q&A pair accepted', true);

  await call(`/v1/agents/${agent.id}/knowledge/text`, {
    method: 'POST',
    token,
    organizationId,
    body: {
      title: 'Delivery times',
      content:
        'Standard delivery takes 3 to 5 working days within the UK. Express delivery arrives the next working day if ordered before 2pm. We do not currently ship outside the UK and Ireland.',
    },
  });
  check('manual text accepted', true);

  // Indexing runs in the background so the merchant is not left staring at a spinner while an
  // embedding call happens. Polling here is what a merchant's dashboard does too.
  let sources = [];
  for (let attempt = 0; attempt < 30; attempt += 1) {
    ({ sources } = await call(`/v1/agents/${agent.id}/knowledge`, { token, organizationId }));
    if (sources.length === 2 && sources.every((s) => s.status === 'ready')) break;
    if (sources.some((s) => s.status === 'failed')) break;
    await sleep(1000);
  }
  check(
    'both sources indexed',
    sources.length === 2 && sources.every((s) => s.status === 'ready'),
    sources.map((s) => `${s.title}=${s.status}`).join(', '),
  );

  // --- 5. The answer loop --------------------------------------------------------------------

  step('5. Answering');

  const asked = await call(`/v1/agents/${agent.id}/ask`, {
    method: 'POST',
    token,
    organizationId,
    body: { question: 'Can I send something back if I changed my mind?', channel: 'text' },
  });

  check('a question gets an answer', typeof asked.answer === 'string' && asked.answer.length > 0);
  check('the answer is grounded in stored content', asked.ungrounded === false);
  check(
    'citations returned',
    asked.citations.length > 0,
    asked.citations.map((c) => `${c.title} ${c.score.toFixed(2)}`).join(' · '),
  );
  // Deliberately paraphrased — "send something back" shares no keyword with "return an item".
  // Matching it is the thing vector search does that a keyword index cannot.
  check(
    'the paraphrased question found the returns policy, not the delivery note',
    asked.citations[0].title.toLowerCase().includes('return'),
    asked.citations[0].title,
  );
  check(
    'the answer mentions the 30 day window',
    asked.answer.includes('30'),
    asked.answer.slice(0, 120).replace(/\n/g, ' '),
  );
  console.log(
    `        latency: ${asked.latency.embeddingMs}ms embed · ${asked.latency.retrievalMs}ms search` +
      ` · ${asked.latency.firstTokenMs}ms to first token · ${asked.latency.totalMs}ms total`,
  );

  // A question the corpus cannot answer must come back ungrounded rather than invented. This is
  // the single most important behaviour in the product.
  const offTopic = await call(`/v1/agents/${agent.id}/ask`, {
    method: 'POST',
    token,
    organizationId,
    body: { question: 'What is the capital of Mongolia?', channel: 'text' },
  });
  check(
    'an unanswerable question does not get an invented answer',
    offTopic.ungrounded === true || !offTopic.answer.toLowerCase().includes('ulaanbaatar'),
    offTopic.answer.slice(0, 100).replace(/\n/g, ' '),
  );

  // --- 6. Streaming --------------------------------------------------------------------------

  step('6. Streaming');

  const stream = await fetch(`${apiUrl}/v1/agents/${agent.id}/ask`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'text/event-stream',
      authorization: `Bearer ${token}`,
      'x-organization-id': organizationId,
    },
    body: JSON.stringify({ question: 'How fast is delivery?', channel: 'voice' }),
  });
  check('stream opens', stream.ok && stream.headers.get('content-type')?.includes('event-stream'));

  const decoder = new TextDecoder();
  let raw = '';
  let deltas = 0;
  let done;
  for await (const chunk of stream.body) {
    raw += decoder.decode(chunk, { stream: true });
    let boundary = raw.indexOf('\n\n');
    while (boundary !== -1) {
      const frame = raw.slice(0, boundary);
      raw = raw.slice(boundary + 2);
      boundary = raw.indexOf('\n\n');
      const name = /^event: (.+)$/m.exec(frame)?.[1];
      const data = /^data: (.+)$/m.exec(frame)?.[1];
      if (name === 'delta') deltas += 1;
      if (name === 'done' && data) done = JSON.parse(data);
      if (name === 'error') throw new Error(`stream error: ${data}`);
    }
  }
  check('answer arrived incrementally', deltas > 1, `${String(deltas)} chunks`);
  check('a final result followed the deltas', Boolean(done?.answer));
  // The voice channel must not emit markdown — a screen reader saying "asterisk asterisk" is
  // the whole reason the two channels are prompted differently.
  check(
    'the voice answer contains no markdown',
    !/[*#`]/.test(done.answer),
    done.answer.slice(0, 100).replace(/\n/g, ' '),
  );

  // --- 7. Publish ----------------------------------------------------------------------------

  step('7. Publish');

  const published = await call(`/v1/agents/${agent.id}/publish`, {
    method: 'POST',
    token,
    organizationId,
  });
  check('activation succeeds once knowledge is indexed', published.agent.status === 'active');
  check('publishedAt recorded', Boolean(published.agent.publishedAt));

  // --- 8. Crawling a real website --------------------------------------------------------------

  step('8. Crawling');

  // A sandbox published specifically for people to practise scraping against, so pointing a
  // test at it repeatedly is what it is for. Deliberately last: it adds a third source, and the
  // earlier checks assert on an agent with exactly two.
  const site = 'https://books.toscrape.com';

  const registered = await call(`/v1/agents/${agent.id}/knowledge/website`, {
    method: 'POST',
    token,
    organizationId,
    body: { url: site, maxPages: 4, maxDepth: 2 },
  });
  check('website source registered', registered.source.status === 'pending', site);

  let crawled;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const { sources } = await call(`/v1/agents/${agent.id}/knowledge`, { token, organizationId });
    crawled = sources.find((s) => s.id === registered.source.id);
    if (crawled.status === 'ready' || crawled.status === 'failed') break;
    await sleep(1000);
  }
  check(
    'the crawl finished',
    crawled.status === 'ready',
    `${crawled.status}${crawled.errorMessage ? `: ${crawled.errorMessage}` : ''}`,
  );
  check(
    'it read more than one page',
    crawled.documentCount > 1,
    `${String(crawled.documentCount)} pages`,
  );

  const { documents } = await call(
    `/v1/agents/${agent.id}/knowledge/${registered.source.id}/documents`,
    { token, organizationId },
  );
  check(
    'every crawled page indexed',
    documents.every((d) => d.status === 'ready'),
    documents.map((d) => `${d.url}=${d.status}`).join(' · '),
  );
  // Each page must be its own document. One document holding the whole site means the
  // extractor collapsed the crawl, and every citation would point at the homepage.
  check(
    'pages are stored with their own URLs',
    new Set(documents.map((d) => d.url)).size === documents.length,
  );

  const aboutSite = await call(`/v1/agents/${agent.id}/ask`, {
    method: 'POST',
    token,
    organizationId,
    body: { question: 'What kind of books do you sell?', channel: 'text' },
  });
  check(
    'a question about the crawled site is answered from the crawl',
    aboutSite.ungrounded === false &&
      aboutSite.citations.some((c) => (c.url ?? '').startsWith('http')),
    aboutSite.citations.map((c) => c.url ?? c.title).join(' · '),
  );
} catch (error) {
  failure = error;
} finally {
  if (!failure) {
    await call(`/v1/agents/${agent.id}`, { method: 'DELETE', token, organizationId });
    console.log(`\ncleaned up agent ${agent.id}`);
  } else {
    console.error(`\nleaving agent ${agent.id} in place for inspection`);
  }
}

if (failure) {
  console.error(`\n${failure.stack ?? String(failure)}`);
  process.exit(1);
}

console.log(`\n${String(passed)} checks passed.`);
