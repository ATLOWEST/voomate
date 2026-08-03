/**
 * Cross-tenant read test.
 *
 * `relrowsecurity = true` only proves RLS is switched on. It says nothing about whether the
 * policies are correct — a policy with a `using (true)` clause reports exactly the same. This
 * script does the thing that actually matters: it creates two organizations, becomes a member
 * of one, and checks it cannot see the other.
 *
 * Run it after any change to `10_rls_policies.sql`. A leak here is the one bug in this product
 * that ends it, because a merchant seeing another merchant's conversations is not a bug report,
 * it is a breach notification.
 *
 *   npm run db:verify
 *
 * Everything it creates is rolled back, so it is safe against a live database.
 */
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { loadEnv } from './load-env.mjs';

loadEnv();

const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_DIRECT_URL is not set.');
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 20, onnotice: () => {} });

/** Thrown at the end of the transaction to roll the probe data back. Not a failure. */
class RollbackSignal extends Error {}

const results = [];
const check = (name, passed, detail) => {
  results.push({ name, passed, detail });
  console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const orgA = randomUUID();
const orgB = randomUUID();
const userA = randomUUID();
const userB = randomUUID();
const agentA = randomUUID();
const agentB = randomUUID();

try {
  await sql.begin(async (tx) => {
    // Seeding runs as the table owner, which bypasses RLS — that is the point: we are setting
    // up a world that the policies then have to filter correctly.
    await tx`insert into public.users (id, email, display_name)
             values (${userA}, ${`rls-a-${userA}@test.invalid`}, 'Tenant A'),
                    (${userB}, ${`rls-b-${userB}@test.invalid`}, 'Tenant B')`;

    await tx`insert into public.organizations (id, name, slug)
             values (${orgA}, 'Tenant A', ${`rls-a-${orgA.slice(0, 8)}`}),
                    (${orgB}, 'Tenant B', ${`rls-b-${orgB.slice(0, 8)}`})`;

    await tx`insert into public.organization_members (organization_id, user_id, role)
             values (${orgA}, ${userA}, 'owner'),
                    (${orgB}, ${userB}, 'owner')`;

    const agentDefaults = {
      language: JSON.stringify({ primary: 'en-IN', additional: [], autoDetect: true }),
      appearance: JSON.stringify({ position: 'bottom-right', accentColor: '#4f46e5' }),
    };
    await tx`insert into public.agents
               (id, organization_id, name, website_url, language, persona, appearance, embed_key)
             values
               (${agentA}, ${orgA}, 'Agent A', 'https://a.test.invalid',
                ${agentDefaults.language}, ${JSON.stringify({ displayName: 'Aria', tone: 'friendly' })},
                ${agentDefaults.appearance}, ${`emk_a_${agentA.slice(0, 8)}`}),
               (${agentB}, ${orgB}, 'Agent B', 'https://b.test.invalid',
                ${agentDefaults.language}, ${JSON.stringify({ displayName: 'Bella', tone: 'friendly' })},
                ${agentDefaults.appearance}, ${`emk_b_${agentB.slice(0, 8)}`})`;

    // Become tenant A, as the dashboard's Supabase client does: the `authenticated` role plus
    // a JWT whose `sub` is the user. auth.uid() reads that claim, and every policy hangs off it.
    const becomeUserA = async () => {
      await tx`select set_config('role', 'authenticated', true)`;
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userA, role: 'authenticated' })}, true)`;
    };
    const becomeOwner = async () => {
      await tx`select set_config('role', 'postgres', true)`;
      await tx`select set_config('request.jwt.claims', '', true)`;
    };

    await becomeUserA();

    const orgs = await tx`select id from public.organizations order by name`;
    check(
      'organizations: sees own only',
      orgs.length === 1 && orgs[0].id === orgA,
      `saw ${orgs.length} row(s)`,
    );

    const agents = await tx`select id, organization_id from public.agents`;
    check(
      'agents: sees own only',
      agents.length === 1 && agents[0].id === agentA,
      `saw ${agents.length} row(s)`,
    );

    // The direct attack: name the other tenant's row explicitly. A filtered query returning
    // nothing is the correct outcome; RLS makes a foreign row invisible rather than forbidden.
    const targeted = await tx`select id from public.agents where id = ${agentB}`;
    check('agents: foreign id by primary key returns nothing', targeted.length === 0);

    const users = await tx`select id from public.users`;
    check('users: sees own row only', users.length === 1 && users[0].id === userA);

    // Writing into another tenant is the more damaging direction — it is how one merchant
    // would poison another's knowledge base.
    let insertBlocked = false;
    try {
      await tx.savepoint(async (sp) => {
        await sp`insert into public.agents
                   (organization_id, name, website_url, language, persona, appearance, embed_key)
                 values (${orgB}, 'Injected', 'https://x.test.invalid',
                   ${agentDefaults.language}, ${JSON.stringify({ displayName: 'X', tone: 'friendly' })},
                   ${agentDefaults.appearance}, ${`emk_x_${randomUUID().slice(0, 8)}`})`;
      });
    } catch {
      insertBlocked = true;
    }
    check('agents: insert into a foreign org is rejected', insertBlocked);

    // An UPDATE that matches no visible row silently affects zero rows, which is the correct
    // and safest failure mode: no error to probe with, no data changed.
    const updated = await tx`update public.agents set name = 'Hijacked'
                             where id = ${agentB} returning id`;
    check('agents: update of a foreign row affects nothing', updated.length === 0);

    const deleted = await tx`delete from public.agents where id = ${agentB} returning id`;
    check('agents: delete of a foreign row affects nothing', deleted.length === 0);

    // Confirm the seed really did exist. Without this, every check above would also "pass"
    // against an empty table — the test would be measuring nothing.
    await becomeOwner();
    const all = await tx`select id from public.agents where id in (${agentA}, ${agentB})`;
    check(
      'control: both agents exist when RLS is bypassed',
      all.length === 2,
      `${all.length} of 2`,
    );

    // Everything above was a probe, not a fixture. Roll it back.
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

const failed = results.filter((r) => !r.passed);
console.log(
  `\n${results.length - failed.length}/${results.length} passed — test data rolled back.`,
);
process.exit(failed.length === 0 ? 0 : 1);
