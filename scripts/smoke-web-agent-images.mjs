/* global Blob, FormData */

import postgres from 'postgres';
import sharp from 'sharp';
import { loadEnv } from '../packages/db/scripts/load-env.mjs';

loadEnv();

const baseUrl = (process.env.WEB_AGENT_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const origin = process.env.WEB_AGENT_ORIGIN ?? 'http://localhost:3000';
const publicKey = process.env.WEB_AGENT_PUBLIC_KEY ?? 'test-embed-key';

async function post(path, body, token, expected = 200) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      origin,
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status !== expected) {
    throw new Error(
      `${path}: expected ${expected}, got ${response.status} ${JSON.stringify(payload)}`,
    );
  }
  return payload;
}

async function uploadSigned(url, bytes, type, name) {
  const body = new FormData();
  body.append('cacheControl', '0');
  body.append('', new Blob([bytes], { type }), name);
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'x-upsert': 'false' },
    body,
  });
  if (!response.ok)
    throw new Error(`Storage upload failed: ${response.status} ${await response.text()}`);
}

async function postStream(path, body, token) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { origin, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok || !response.body) {
    throw new Error(`${path}: stream failed with ${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let message = '';
  let conversationId;
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line) continue;
      const event = JSON.parse(line);
      if (event.type === 'start') conversationId = event.conversationId;
      if (event.type === 'delta') message += event.text;
      if (event.type === 'done') {
        conversationId = event.conversationId ?? conversationId;
        if (!message) message = event.message;
      }
      if (event.type === 'error') throw new Error(event.error);
    }
    if (done) break;
  }
  return { conversationId, message };
}

function packageSvg(label, damaged) {
  return Buffer.from(`
    <svg width="1800" height="1200" xmlns="http://www.w3.org/2000/svg">
      <rect width="1800" height="1200" fill="#f5efe3"/>
      <rect x="260" y="230" width="1280" height="720" rx="30" fill="#bd8b55" stroke="#684321" stroke-width="24"/>
      <path d="M900 230v720M260 460h1280" stroke="#684321" stroke-width="18"/>
      ${damaged ? '<path d="M1420 230l-180 170 145 95-210 190" fill="none" stroke="#dc2626" stroke-width="45"/><text x="1120" y="820" font-size="105" font-family="sans-serif" font-weight="bold" fill="#b91c1c">CRUSHED / TORN</text>' : ''}
      <rect x="350" y="520" width="650" height="250" fill="white" stroke="#111827" stroke-width="8"/>
      <text x="400" y="620" font-size="70" font-family="sans-serif" fill="#111827">ORDER DEMO-1001</text>
      <text x="400" y="710" font-size="50" font-family="sans-serif" fill="#111827">HANDLE WITH CARE</text>
      <text x="280" y="1080" font-size="65" font-family="sans-serif" fill="#334155">${label}</text>
    </svg>`);
}

const validImages = await Promise.all([
  sharp(packageSvg('Front view', true)).png().toBuffer(),
  sharp(packageSvg('Side view', true)).jpeg({ quality: 92 }).toBuffer(),
]);

const session = await post('/api/web-agent/session', { publicKey }, undefined, 201);
const token = session.session.token;
const sign = await post(
  '/api/web-agent/images/sign',
  {
    files: [
      { name: 'damaged-front.png', size: validImages[0].byteLength, type: 'image/png' },
      { name: 'damaged-side.jpg', size: validImages[1].byteLength, type: 'image/jpeg' },
    ],
  },
  token,
  201,
);
await uploadSigned(sign.uploads[0].signedUrl, validImages[0], 'image/png', 'damaged-front.png');
await uploadSigned(sign.uploads[1].signedUrl, validImages[1], 'image/jpeg', 'damaged-side.jpg');
const imageIds = sign.uploads.map((upload) => upload.id);
await post('/api/web-agent/images/finalize', { imageIds }, token);

const vision = await postStream(
  '/api/web-agent/messages/stream',
  {
    message: "What's wrong with this order package? Inspect both attached images.",
    imageIds,
    pageUrl: `${origin}/widget-demo.html`,
    channel: 'text',
  },
  token,
);
if (!/(damage|damaged|crush|crushed|tear|torn|box|package)/i.test(vision.message)) {
  throw new Error(`Nova Pro did not describe the visible package issue: ${vision.message}`);
}
console.log('PASS two valid images → Nova Pro:', vision.message);

const tooMany = await post(
  '/api/web-agent/images/sign',
  {
    files: Array.from({ length: 3 }, (_, index) => ({
      name: `${index}.png`,
      size: 100,
      type: 'image/png',
    })),
  },
  token,
  400,
);
console.log('PASS third image rejected:', tooMany.error);

const oversized = await post(
  '/api/web-agent/images/sign',
  { files: [{ name: 'huge.jpg', size: 5 * 1024 * 1024 + 1, type: 'image/jpeg' }] },
  token,
  413,
);
console.log('PASS oversized image rejected:', oversized.error);

const fakeBytes = Buffer.from('this is text renamed to an image');
const fakeSign = await post(
  '/api/web-agent/images/sign',
  { files: [{ name: 'not-an-image.png', size: fakeBytes.byteLength, type: 'image/png' }] },
  token,
  201,
);
await uploadSigned(fakeSign.uploads[0].signedUrl, fakeBytes, 'image/png', 'not-an-image.png');
const disguised = await post(
  '/api/web-agent/images/finalize',
  { imageIds: [fakeSign.uploads[0].id] },
  token,
  400,
);
console.log('PASS renamed non-image rejected:', disguised.error);

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to verify usage logs.');
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const [trace] = await sql`
  select
    count(*) filter (where stage = 'image_attachments_loaded')::int as attachment_events,
    count(*) filter (where stage = 'nova_inference' and status = 'success')::int as inference_events,
    max((metadata ->> 'imageCount')::int) as max_images,
    max((metadata ->> 'visionRequestInputTokens')::int) as vision_request_tokens
  from agent_run_events
  where conversation_id = ${vision.conversationId}
`;
const [usage] = await sql`
  select coalesce(sum(quantity), 0)::int as image_tokens
  from usage_records
  where conversation_id = ${vision.conversationId}
    and kind = 'image_input_tokens'
`;
await sql.end();
if (
  trace.max_images !== 2 ||
  !trace.vision_request_tokens ||
  usage.image_tokens !== trace.vision_request_tokens
) {
  throw new Error(`Image trace/usage verification failed: ${JSON.stringify({ trace, usage })}`);
}
console.log(
  `PASS Logs + Usage record 2 images / ${trace.vision_request_tokens} actual request input tokens.`,
);
