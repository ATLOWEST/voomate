import { performance } from 'node:perf_hooks';
import postgres from 'postgres';
import { loadEnv } from '../packages/db/scripts/load-env.mjs';

loadEnv();

const dashboard = (process.env.WEB_AGENT_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const origin = process.env.WEB_AGENT_ORIGIN ?? 'http://localhost:3000';
const publicKey = process.env.WEB_AGENT_PUBLIC_KEY ?? 'test-embed-key';

const sessionResponse = await fetch(`${dashboard}/api/web-agent/session`, {
  method: 'POST',
  headers: { origin, 'content-type': 'application/json' },
  body: JSON.stringify({ publicKey }),
});
if (!sessionResponse.ok) throw new Error(`Widget session failed: HTTP ${sessionResponse.status}`);
const { session } = await sessionResponse.json();

let conversationId;
const turn = async (message) => {
  const started = performance.now();
  const response = await fetch(`${dashboard}/api/web-agent/messages/stream`, {
    method: 'POST',
    headers: {
      origin,
      authorization: `Bearer ${session.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      message,
      channel: 'text',
      imageIds: [],
      pageUrl: `${origin}/`,
      ...(conversationId ? { conversationId } : {}),
    }),
  });
  if (!response.ok) throw new Error(`Agent turn failed: HTTP ${response.status}`);

  let buffer = '';
  let answer = '';
  let firstTokenMs;
  for await (const chunk of response.body) {
    buffer += new TextDecoder().decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line) continue;
      const event = JSON.parse(line);
      if (event.type === 'start') conversationId = event.conversationId;
      if (event.type === 'delta') {
        firstTokenMs ??= Math.round(performance.now() - started);
        answer += event.text;
      }
      if (event.type === 'error') throw new Error(event.error);
    }
  }
  return { answer: answer.trim(), firstTokenMs, totalMs: Math.round(performance.now() - started) };
};

const greeting = await turn('Hi, can you hear me?');
if (/\b(?:TestAgent|Web Agent)\b/i.test(greeting.answer)) {
  throw new Error(`Greeting repeated agent identity: ${greeting.answer}`);
}

const product = await turn('What is Voomate actually about?');
if (!/AI agent/i.test(product.answer) || /provide more details/i.test(product.answer)) {
  throw new Error(`Product answer was not direct and grounded: ${product.answer}`);
}

const noisy = await turn('I want a widget in my stool. Can my users talk with it?');
if (!/(chat|speak|voice|talk)/i.test(noisy.answer) || /provide more details/i.test(noisy.answer)) {
  throw new Error(`Noisy product question was not handled helpfully: ${noisy.answer}`);
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for trace verification.');
const db = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const events = await db`
  select stage, latency_ms, metadata
  from agent_run_events
  where conversation_id = ${conversationId}::uuid
  order by created_at asc
`;
await db.end();

const stages = new Set(events.map((event) => event.stage));
for (const expected of ['knowledge_retrieval', 'agent_runtime', 'nova_first_token']) {
  if (!stages.has(expected)) throw new Error(`Logs are missing ${expected}.`);
}
const grounded = events.some(
  (event) => event.stage === 'knowledge_retrieval' && Number(event.metadata?.sourceCount ?? 0) > 0,
);
if (!grounded) throw new Error('No product knowledge chunk was retrieved.');

console.log(
  JSON.stringify(
    {
      conversationId,
      greeting,
      product,
      noisy,
      loggedStages: [...stages],
    },
    null,
    2,
  ),
);
