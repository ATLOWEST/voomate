import fetch from 'node-fetch';
import postgres from 'postgres';
import fs from 'fs';

// Load env variables
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].trim().replace(/^"|"$/g, '');
});

const WEB_AGENT_URL = 'http://127.0.0.1:3001';
const WEB_AGENT_PUBLIC_KEY = 'test-embed-key';
const WEB_AGENT_ORIGIN = 'http://localhost:3000';

async function post(path, body, token) {
  const response = await fetch(`${WEB_AGENT_URL}${path}`, {
    method: 'POST',
    headers: {
      Origin: WEB_AGENT_ORIGIN,
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(payload)}`);
  return payload;
}

async function runTest() {
  console.log('1. Starting session...');
  const session = await post('/api/web-agent/session', {
    publicKey: WEB_AGENT_PUBLIC_KEY,
  });
  console.log('Session token received:', session.session.token.substring(0, 10) + '...');

  console.log('2. Sending prompt: "what is this product about"');
  const result = await post(
    '/api/web-agent/messages',
    {
      message: 'what is this product about',
      pageUrl: `${WEB_AGENT_ORIGIN}/`,
    },
    session.session.token,
  );

  console.log('Response from agent:');
  console.log('--------------------------------------------------');
  console.log(result.message);
  console.log('--------------------------------------------------');

  console.log('3. Fetching token usage from database for this conversation...');

  const sql = postgres(process.env.DATABASE_DIRECT_URL);

  // Wait a moment for events to flush to DB
  await new Promise((r) => setTimeout(r, 1000));

  try {
    const res = await sql`
      SELECT kind, SUM(amount) as total
      FROM usage_events
      WHERE agent_id = (SELECT id FROM agents WHERE public_key = ${WEB_AGENT_PUBLIC_KEY} LIMIT 1)
      AND created_at >= NOW() - INTERVAL '1 minute'
      GROUP BY kind
    `;

    console.log('Token usage metrics for recent events:');
    for (const row of res) {
      console.log(`- ${row.kind}: ${row.total}`);
    }

    if (res.length === 0) {
      console.log(
        'No token usage found in the last minute. The events might not be flushed to the DB yet, or the prompt used a mock model.',
      );
    }
  } catch (error) {
    console.error('Error fetching metrics from DB:', error);
  } finally {
    await sql.end();
  }
}

runTest().catch(console.error);
