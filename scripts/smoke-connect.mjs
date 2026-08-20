import { createHash, randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import postgres from 'postgres';
import { syncStoreProduct } from '../apps/connect-store-example/dist/store-sync.js';
import { loadEnv } from '../packages/db/scripts/load-env.mjs';

loadEnv();

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const apiBase = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const widgetBase = (process.env.WEB_AGENT_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const widgetOrigin = process.env.WEB_AGENT_ORIGIN ?? 'http://localhost:3000';
const endpoint = `${apiBase}/v1/connect/sync`;
const db = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const startedAt = new Date();
const marker = Date.now().toString(36);
const privateValues = {
  supplierToken: 'supplier_token_must_never_leave_store',
  internalNotes: 'Wholesale exception is private and must never be indexed.',
  lastCustomerEmail: 'private-customer@example.test',
};
const initialProduct = {
  id: 'smoke/mercury-care',
  public: {
    name: 'Mercury Care Plan',
    description:
      `Mercury Care reference ${marker}. Includes glacier-blue replacement seals ` +
      'and priority setup assistance.',
    displayPrice: '$39',
    supportPlan: 'Renews every 17 months.',
    url: 'https://example.invalid/support/mercury-care',
    tags: ['support', 'renewal'],
  },
  private: {
    costPrice: 7.25,
    marginPercent: 81,
    ...privateValues,
  },
};
const updatedProduct = {
  ...initialProduct,
  public: {
    ...initialProduct.public,
    displayPrice: '$41',
    supportPlan: 'Renews every 19 months.',
  },
};
const publicItem = (product) => ({
  type: 'product',
  id: product.id,
  content: [
    `Product: ${product.public.name}`,
    product.public.description,
    `Public price: ${product.public.displayPrice}`,
    `Support plan: ${product.public.supportPlan}`,
  ].join('\n\n'),
  metadata: {
    title: product.public.name,
    sourceUrl: product.public.url,
    tags: product.public.tags,
  },
});
const batchItem = {
  type: 'faq',
  id: 'smoke/batch-check',
  content: `Batch marker ${marker}. Priority setup assistance is available on weekdays.`,
  metadata: { title: 'Priority setup FAQ' },
};

const postWidget = async (path, body, token) => {
  const response = await fetch(`${widgetBase}${path}`, {
    method: 'POST',
    headers: {
      origin: widgetOrigin,
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Widget request failed with HTTP ${response.status}.`);
  return payload;
};

const duration = async (operation) => {
  const before = performance.now();
  const result = await operation();
  return { result, milliseconds: Math.round(performance.now() - before) };
};

let temporaryKeyId;
let smokeAgent;
try {
  const [agent] = await db`
    select id, organization_id, status, embed_key
    from agents
    where status = 'active'
      and ${widgetOrigin} = any(allowed_origins)
    order by published_at desc nulls last
    limit 1
  `;
  if (!agent) throw new Error('The configured Web Agent was not found.');
  if (agent.status !== 'active') throw new Error('The configured Web Agent is not active.');
  smokeAgent = agent;

  // Remove rows created by the pre-release smoke script, whose identity incorrectly included
  // `type`. Production identity is the stable `id` alone.
  await db`
    delete from knowledge_sources
    where organization_id = ${agent.organization_id}
      and agent_id = ${agent.id}
      and type = 'api_sync'
      and external_id = ${`support_plan:${initialProduct.id}`}
  `;

  const secret = `sk_${randomBytes(32).toString('base64url')}`;
  const hash = createHash('sha256').update(secret).digest('hex');
  const [createdKey] = await db`
    insert into api_keys
      (organization_id, agent_id, name, key_hash, key_prefix, scopes, expires_at)
    values
      (${agent.organization_id}, ${agent.id}, 'Connect smoke test', ${hash},
       ${secret.slice(0, 11)}, array['knowledge:write'], now() + interval '1 hour')
    returning id
  `;
  temporaryKeyId = createdKey.id;

  const invalid = await fetch(endpoint, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'product', id: 'bad', content: '   ' }),
  });
  if (invalid.status !== 400) {
    throw new Error(`Invalid payload returned HTTP ${invalid.status}, expected 400.`);
  }
  console.log('Validation: empty content rejected cleanly (HTTP 400).');

  const secretPayload = await fetch(endpoint, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'product',
      id: 'bad-secret',
      content: 'Internal config: api_key=abcdefghijklmnopqrstuvwx',
    }),
  });
  if (secretPayload.status !== 400) {
    throw new Error(`Credential payload returned HTTP ${secretPayload.status}, expected 400.`);
  }

  const privateMetadata = await fetch(endpoint, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      ...publicItem(initialProduct),
      id: 'bad-metadata',
      metadata: { title: 'Invalid', internalNotes: 'Must not be accepted.' },
    }),
  });
  if (privateMetadata.status !== 400) {
    throw new Error(`Private metadata returned HTTP ${privateMetadata.status}, expected 400.`);
  }
  console.log(
    'Security: credential-like content and non-allowlisted metadata rejected (HTTP 400).',
  );

  const firstTimed = await duration(() =>
    syncStoreProduct({ tenantKey: secret, product: initialProduct, endpoint }),
  );
  const first = firstTimed.result;
  if (!first.ok || first.status !== 'synced' || first.embeddingTokens <= 0) {
    throw new Error(`First SDK sync did not embed content: ${JSON.stringify(first)}`);
  }
  console.log(
    `Installed SDK: synced ${first.chunks} chunk(s), ${first.embeddingTokens} embedding tokens in ${firstTimed.milliseconds}ms.`,
  );

  const secondTimed = await duration(() =>
    syncStoreProduct({ tenantKey: secret, product: initialProduct, endpoint }),
  );
  const second = secondTimed.result;
  if (!second.ok || second.status !== 'unchanged' || second.embeddingTokens !== 0) {
    throw new Error(`Second SDK sync was not deduplicated: ${JSON.stringify(second)}`);
  }
  console.log(
    `Dedupe: identical sync returned unchanged with 0 embedding tokens in ${secondTimed.milliseconds}ms.`,
  );

  const [dedupeAudit] = await db`
    select
      count(*) filter (where (metadata->>'embeddingTokens')::int > 0)::int as embedding_operations,
      count(*) filter (where metadata->>'status' = 'unchanged')::int as unchanged_operations
    from audit_logs
    where organization_id = ${agent.organization_id}
      and action = 'knowledge.sync'
      and metadata->>'externalId' = ${initialProduct.id}
      and created_at >= ${startedAt}
  `;
  if (dedupeAudit.embedding_operations !== 1 || dedupeAudit.unchanged_operations < 1) {
    throw new Error(`Audit did not prove dedupe: ${JSON.stringify(dedupeAudit)}`);
  }
  console.log('Audit: exactly one embedding operation for the initial + identical repeat.');

  const batch = await fetch(endpoint, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify({ items: [publicItem(initialProduct), batchItem] }),
  });
  const batchPayload = await batch.json();
  if (!batch.ok || batchPayload.items?.length !== 2) {
    throw new Error(`Batch sync failed with HTTP ${batch.status}.`);
  }
  console.log(`Batch mode: accepted ${batchPayload.items.length} items in one request.`);

  const updateTimed = await duration(() =>
    syncStoreProduct({ tenantKey: secret, product: updatedProduct, endpoint }),
  );
  const updated = updateTimed.result;
  if (!updated.ok || updated.status !== 'synced' || updated.embeddingTokens <= 0) {
    throw new Error(`Changed store record was not re-indexed: ${JSON.stringify(updated)}`);
  }
  console.log(
    `Live update: changed fact replaced the stable item in ${updateTimed.milliseconds}ms (${updated.embeddingTokens} tokens).`,
  );

  const [stored] = await db`
    select
      count(distinct s.id)::int as source_count,
      count(distinct d.id)::int as document_count,
      count(distinct c.id)::int as chunk_count,
      string_agg(distinct d.content, E'\n') as document_content,
      string_agg(distinct c.content, E'\n') as chunk_content,
      string_agg(distinct d.metadata::text, E'\n') as metadata_content
    from knowledge_sources s
    join knowledge_documents d on d.source_id = s.id
    join knowledge_chunks c on c.document_id = d.id
    where s.organization_id = ${agent.organization_id}
      and s.agent_id = ${agent.id}
      and s.type = 'api_sync'
      and s.external_id = ${initialProduct.id}
  `;
  const indexedText = [stored.document_content, stored.chunk_content, stored.metadata_content]
    .filter(Boolean)
    .join('\n');
  const leaked = Object.values(privateValues).find((value) => indexedText.includes(value));
  if (
    stored.source_count !== 1 ||
    stored.document_count !== 1 ||
    stored.chunk_count < 1 ||
    leaked
  ) {
    throw new Error(
      'Stored knowledge failed stable-upsert or public-field isolation verification.',
    );
  }
  if (!indexedText.includes('19 months') || indexedText.includes('17 months')) {
    throw new Error('Stored knowledge does not contain only the latest product fact.');
  }
  console.log(
    'Data isolation: one current source/document; no private store fields reached storage.',
  );

  const [observable] = await db`
    select
      (select count(*)::int
       from agent_run_events
       where organization_id = ${agent.organization_id}
         and agent_id = ${agent.id}
         and stage = 'knowledge_sync'
         and created_at >= ${startedAt}) as log_events,
      (select coalesce(sum(quantity), 0)::int
       from usage_records
       where organization_id = ${agent.organization_id}
         and agent_id = ${agent.id}
         and kind = 'embedding_input_tokens'
         and created_at >= ${startedAt}) as usage_tokens
  `;
  if (observable.log_events < 3 || observable.usage_tokens < first.embeddingTokens) {
    throw new Error(`Logs/Usage did not record the sync: ${JSON.stringify(observable)}`);
  }
  console.log(
    `Observability: ${observable.log_events} Logs events and ${observable.usage_tokens} metered embedding tokens.`,
  );

  const session = await postWidget('/api/web-agent/session', { publicKey: agent.embed_key });
  const answer = await postWidget(
    '/api/web-agent/messages',
    {
      message: 'How often does the Mercury Care Plan renew?',
      pageUrl: `${widgetOrigin}/connect-smoke`,
    },
    session.session.token,
  );
  if (!/(19|nineteen)\s+months?/i.test(answer.message ?? '')) {
    throw new Error(`Web Agent did not retrieve the latest synced fact: ${String(answer.message)}`);
  }
  console.log(`Web Agent latest-data retrieval: ${answer.message}`);
  console.log('Voomate Connect installed-SDK smoke test passed end to end.');
} finally {
  if (temporaryKeyId) {
    await db`delete from api_keys where id = ${temporaryKeyId}`.catch(() => undefined);
  }
  if (smokeAgent) {
    await db`
      delete from knowledge_sources
      where organization_id = ${smokeAgent.organization_id}
        and agent_id = ${smokeAgent.id}
        and type = 'api_sync'
        and external_id = ${batchItem.id}
    `.catch(() => undefined);
  }
  await db.end();
}
