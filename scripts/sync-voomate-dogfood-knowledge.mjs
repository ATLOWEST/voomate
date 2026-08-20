import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { voomate } from '@voomate/connect';
import { loadEnv } from '../packages/db/scripts/load-env.mjs';

loadEnv();

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const endpoint = `${(process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '')}/v1/connect/sync`;
const agentId = process.env.VOOMATE_DOGFOOD_AGENT_ID ?? '00000000-0000-0000-0000-000000000001';
const content = await readFile(new URL('../knowledge/voomate-product.md', import.meta.url), 'utf8');
const db = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
let keyId;

try {
  const [agent] = await db`
    select id, organization_id
    from agents
    where id = ${agentId}::uuid and status = 'active'
    limit 1
  `;
  if (!agent) throw new Error('Active Voomate dogfood agent was not found.');

  // Remove only the two known SDK smoke-test fixtures from the production dogfood agent. They
  // were useful for validating Connect, but allowing fake merchant facts into Voomate's own
  // assistant would contaminate retrieval and demo answers.
  await db`
    delete from knowledge_sources
    where organization_id = ${agent.organization_id}
      and agent_id = ${agent.id}
      and external_id in ('smoke/mercury-care', 'smoke/batch-check')
  `;

  // The plaintext exists only in this process and is never printed or persisted. The server
  // stores only its SHA-256 hash, exactly as it does for customer-created Connect keys.
  const secret = `sk_${randomBytes(32).toString('base64url')}`;
  const keyHash = createHash('sha256').update(secret).digest('hex');
  const [key] = await db`
    insert into api_keys
      (organization_id, agent_id, name, key_hash, key_prefix, scopes, expires_at)
    values
      (${agent.organization_id}, ${agent.id}, 'Voomate dogfood knowledge sync', ${keyHash},
       ${secret.slice(0, 11)}, array['knowledge:write'], now() + interval '15 minutes')
    returning id
  `;
  keyId = key.id;

  const result = await voomate.sync({
    tenantKey: secret,
    endpoint,
    type: 'product_knowledge',
    id: 'voomate/product-overview',
    content,
    metadata: {
      title: 'Voomate product overview',
      sourceUrl: 'http://localhost:3000/',
      language: 'en-US',
      tags: ['voomate', 'product', 'agents', 'widget', 'voice'],
    },
  });
  if (!result.ok) throw new Error(`Dogfood knowledge sync failed: ${result.reason}`);

  console.log(
    JSON.stringify({
      status: result.status,
      chunks: result.chunks,
      embeddingTokens: result.embeddingTokens,
    }),
  );
} finally {
  if (keyId) await db`delete from api_keys where id = ${keyId}`.catch(() => undefined);
  await db.end();
}
