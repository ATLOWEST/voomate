import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from '../packages/db/scripts/load-env.mjs';

loadEnv();

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const db = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const agentId = '00000000-0000-0000-0000-000000000001';

await db.begin(async (transaction) => {
  const [agent] = await transaction`
    update agents
    set status = 'active',
        allowed_origins = array['http://localhost:3000', 'http://localhost:3001'],
        desired_state_revision = desired_state_revision + 1,
        observed_state_revision = desired_state_revision + 1,
        execution_lease_id = gen_random_uuid(),
        execution_lease_expires_at = now() + interval '20 minutes',
        published_at = coalesce(published_at, now()),
        updated_at = now()
    where id = ${agentId}
    returning organization_id
  `;
  if (!agent) throw new Error('Development Web Agent not found.');

  await transaction`
    insert into agent_active_tools
      (organization_id, agent_id, tool_name, status, config)
    values
      (${agent.organization_id}, ${agentId}, 'check_order_status', 'active', '{}'::jsonb)
    on conflict (agent_id, tool_name) do update
      set status = 'active', updated_at = now()
  `;

  await transaction`
    insert into web_agent_orders
      (organization_id, external_order_id, verification_email, status, order_date,
       estimated_delivery, carrier, tracking_number, internal_notes, cost_amount)
    values
      (${agent.organization_id}, 'DEMO-1001', 'demo@voomate.local', 'shipped',
       now() - interval '2 days', now() + interval '2 days', 'BlueDart', 'DEMO-AWB-1001',
       'LOCAL DEMO ONLY — must never reach the visitor', 499)
    on conflict (organization_id, external_order_id) do update
      set verification_email = excluded.verification_email,
          status = excluded.status,
          estimated_delivery = excluded.estimated_delivery,
          carrier = excluded.carrier,
          tracking_number = excluded.tracking_number,
          internal_notes = excluded.internal_notes,
          cost_amount = excluded.cost_amount,
          updated_at = now()
  `;
});

const [ready] = await db`
  select a.status,
         a.desired_state_revision,
         a.execution_lease_expires_at,
         a.allowed_origins,
         (select status from agent_active_tools
          where agent_id = a.id and tool_name = 'check_order_status') as tool_status,
         (select count(*)::int from web_agent_orders
          where organization_id = a.organization_id
            and external_order_id = 'DEMO-1001') as order_count
  from agents a
  where a.id = ${agentId}
`;

console.log(ready);
await db.end();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucketOptions = {
  public: false,
  fileSizeLimit: 5 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
};
const { data: existingBucket } = await supabase.storage.getBucket('web-agent-images');
const { error: bucketError } = existingBucket
  ? await supabase.storage.updateBucket('web-agent-images', bucketOptions)
  : await supabase.storage.createBucket('web-agent-images', bucketOptions);
if (bucketError) throw bucketError;
console.log({ imageBucket: 'web-agent-images', private: true, maxBytes: 5 * 1024 * 1024 });
