/**
 * Create a confirmed dev user and give them an organization.
 *
 * Signing up through the dashboard sends a confirmation email, which is the right behaviour
 * for real users and an obstacle for a developer who wants to look at the UI. This uses the
 * Supabase admin API to create the account already confirmed, then seeds the one thing the
 * dashboard cannot function without: an organization the user owns. Every tenant-scoped route
 * requires an `x-organization-id` the caller is a member of, so a user with no organization
 * sees nothing but empty states.
 *
 *   npm run dev:user -- you@example.com
 *   npm run dev:user -- you@example.com 'a-password-you-choose'
 *
 * With no password argument one is generated and printed. It is printed once and not stored;
 * put it in a password manager. This needs the service role key, so it is a local developer
 * tool — never run it from anything a user can reach.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Same reasoning as packages/db/scripts/load-env.mjs: an exported-but-empty variable must not
// beat the file, because that failure looks like a bad credential rather than a missing one.
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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;

if (!supabaseUrl || !serviceKey || !databaseUrl) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL must be set in .env');
  process.exit(1);
}

const [email, providedPassword] = process.argv.slice(2);
if (!email) {
  console.error('Usage: npm run dev:user -- you@example.com [password]');
  process.exit(1);
}

// Long and random beats memorable: this is pasted once into a password manager, and a weak
// password on an account that owns a Supabase project is not worth the convenience.
const password = providedPassword ?? `Soniq-${randomBytes(12).toString('base64url')}`;

const admin = async (path, init = {}) => {
  const response = await fetch(new URL(path, supabaseUrl), {
    ...init,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} → ${String(response.status)} ${JSON.stringify(body)}`);
  }
  return body;
};

// Idempotent: re-running with the same email reuses the account rather than erroring, so this
// is safe to run again after a database reset.
const existing = await admin(`/auth/v1/admin/users?page=1&per_page=1000`);
const found = (existing.users ?? []).find((u) => u.email === email);

let userId;
if (found) {
  userId = found.id;
  console.log(`user already exists: ${email} (${userId})`);
  if (providedPassword) {
    await admin(`/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
    console.log('password updated');
  }
} else {
  const created = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      // The whole point: skip the confirmation email.
      email_confirm: true,
      user_metadata: { full_name: email.split('@')[0] },
    }),
  });
  userId = created.id;
  console.log(`created user: ${email} (${userId})`);
  if (!providedPassword) {
    console.log(`password: ${password}`);
    console.log('\nSave that generated password now — it is not stored anywhere.');
  } else {
    console.log('password accepted without printing it.');
  }
}

const sql = postgres(databaseUrl, { prepare: false, max: 1, onnotice: () => {} });

try {
  // `handle_new_user` mirrors auth.users into public.users on signup, but it is a trigger on
  // an INSERT that may have happened before this migration existed. Upsert rather than assume.
  await sql`insert into public.users (id, email, display_name)
            values (${userId}, ${email}, ${email.split('@')[0]})
            on conflict (id) do update set email = excluded.email`;

  const [membership] = await sql`
    select o.id, o.name from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.user_id = ${userId} limit 1`;

  if (membership) {
    console.log(`\norganization: ${membership.name} (${membership.id})`);
  } else {
    const slug = `dev-${randomBytes(4).toString('hex')}`;
    const [org] = await sql`insert into public.organizations (name, slug)
                            values ('Dev workspace', ${slug}) returning id, name`;
    await sql`insert into public.organization_members (organization_id, user_id, role)
              values (${org.id}, ${userId}, 'owner')`;
    console.log(`\ncreated organization: ${org.name} (${org.id})`);
  }
} finally {
  await sql.end({ timeout: 5 });
}

console.log('\nSign in at http://localhost:3001');
