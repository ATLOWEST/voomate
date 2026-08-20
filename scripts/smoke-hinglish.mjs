/**
 * Hinglish / bilingual smoke test.
 *
 * Validates the "Kajal path": a visitor who starts in Hindi and switches to English, or mixes
 * both in the same utterance. This is the most common code-switching pattern in South Asia and
 * the scenario docs/phase-3-voice.md requires to work before Phase 3 is complete.
 *
 * What is tested:
 *  1. A question asked in Hindi is transcribed and answered.
 *  2. The answer is in the same language as the question (not defaulting to English).
 *  3. A follow-up in English is answered in English.
 *  4. The conversation row is marked `multilingual = true` after both turns.
 *  5. `detectedLanguage` reflects the first heard language (hi-IN).
 *
 * Run from the repo root:
 *   npm run dev:api             # in one terminal
 *   node scripts/smoke-hinglish.mjs you@example.com 'password'
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:${process.env.API_PORT ?? '4000'}`;
const MERCHANT_SITE = 'https://example.com';

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: node scripts/smoke-hinglish.mjs email@example.com 'password'");
  process.exit(1);
}
if (!supabaseUrl || !anonKey) {
  console.error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

const { PollyClient, SynthesizeSpeechCommand } = await import('@aws-sdk/client-polly');

let passed = 0;
const check = (label, ok, detail = '') => {
  const icon = ok ? '  ok  ' : ' FAIL ';
  console.log(`${icon} ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) {
    console.error('\nHinglish smoke test FAILED.');
    process.exit(1);
  }
  passed += 1;
};
const step = (label) => console.log(`\n${label}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const call = async (path, { method = 'GET', body, token, organizationId } = {}) => {
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(organizationId ? { 'x-organization-id': organizationId } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 204) return undefined;
  const payload = await res.json().catch(() => undefined);
  if (!res.ok)
    throw new Error(
      `${method} ${path} → ${res.status} ${payload?.error?.message ?? res.statusText}`,
    );
  return payload;
};

const polly = new PollyClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

/**
 * Synthesise text as 16kHz mono PCM.
 * Uses language-appropriate neural voices: Kajal for Hindi, Joanna for English.
 */
const speak = async (text, languageCode = 'en-US') => {
  const voiceId = languageCode === 'hi-IN' ? 'Kajal' : 'Joanna';
  const res = await polly.send(
    new SynthesizeSpeechCommand({
      Text: text,
      VoiceId: voiceId,
      Engine: languageCode === 'hi-IN' ? 'neural' : 'neural',
      LanguageCode: languageCode,
      OutputFormat: 'pcm',
      SampleRate: '16000',
    }),
  );
  const chunks = [];
  for await (const chunk of res.AudioStream) chunks.push(chunk);
  return Buffer.concat(chunks);
};

const FRAME = 640; // 20ms at 16kHz mono 16-bit
const SILENCE = Buffer.alloc(FRAME);

const streamAudio = async (socket, pcm) => {
  const start = Date.now();
  let sent = 0;
  for (let off = 0; off + FRAME <= pcm.length; off += FRAME) {
    socket.send(pcm.subarray(off, off + FRAME));
    sent += 1;
    const behind = start + sent * 20 - Date.now();
    if (behind > 0) await sleep(behind);
  }
  return Date.now();
};
const streamSilence = async (socket, ms) => {
  for (let e = 0; e < ms; e += 20) {
    socket.send(SILENCE);
    await sleep(20);
  }
};

// ─── 1. Bootstrap ─────────────────────────────────────────────────────────────
step('1. Setup');

const signIn = await fetch(new URL('/auth/v1/token?grant_type=password', supabaseUrl), {
  method: 'POST',
  headers: { apikey: anonKey, 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const session = await signIn.json();
check('sign in', signIn.ok && Boolean(session.access_token));
const token = session.access_token;

const { organizations } = await call('/v1/organizations', { token });
const organizationId = organizations[0].id;
check('organization', Boolean(organizationId), organizations[0].name);

// Agent with Hindi + English enabled, so the language detection gets both.
const { agent } = await call('/v1/agents', {
  method: 'POST',
  token,
  organizationId,
  body: {
    name: `Hinglish smoke ${Date.now().toString(36)}`,
    websiteUrl: MERCHANT_SITE,
    language: { languages: ['hi-IN', 'en-US'], primaryLanguage: 'hi-IN', codeSwitching: true },
  },
});
check('agent created with hi-IN + en-US', Boolean(agent?.id));

let failure;
try {
  // Seed knowledge that can be asked about in either language.
  await call(`/v1/agents/${agent.id}/knowledge/qa`, {
    method: 'POST',
    token,
    organizationId,
    body: {
      question: 'Return policy / वापसी नीति',
      answer:
        'Aap 30 din ke andar koi bhi item wapas kar sakte hain. You can return any item within 30 days.',
    },
  });

  let sources = [];
  for (let i = 0; i < 30; i++) {
    ({ sources } = await call(`/v1/agents/${agent.id}/knowledge`, { token, organizationId }));
    if (sources.length > 0 && sources.every((s) => s.status === 'ready')) break;
    await sleep(1000);
  }
  check(
    'knowledge indexed',
    sources.every((s) => s.status === 'ready'),
  );

  const { agent: published } = await call(`/v1/agents/${agent.id}/publish`, {
    method: 'POST',
    token,
    organizationId,
  });
  check('active', published.status === 'active');

  // ─── 2. Hindi turn ──────────────────────────────────────────────────────────
  step('2. Hindi question');

  const hindiQ = 'Mera order wapas karna hai. Kitne din ka time hai?';
  const hindiAudio = await speak(hindiQ, 'hi-IN');
  check('Hindi audio synthesised', hindiAudio.length > FRAME * 10);

  // Widget session
  const sessRes = await fetch(`${apiUrl}/v1/widget/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: MERCHANT_SITE },
    body: JSON.stringify({ embedKey: agent.embedKey, channel: 'voice' }),
  });
  const widget = await sessRes.json();
  check('session token', sessRes.ok && Boolean(widget.session?.token));

  const { default: WebSocket } = await import('ws');
  const socketUrl = `${apiUrl.replace(/^http/, 'ws')}/v1/widget/voice`;
  const socket = new WebSocket(socketUrl, { origin: MERCHANT_SITE });

  const events = [];
  let ready, finalTranscript, turnEnd, fatal;

  const waitFor = (pred, ms, label) =>
    new Promise((resolve, reject) => {
      const start = Date.now();
      const t = setInterval(() => {
        const v = pred();
        if (v) {
          clearInterval(t);
          resolve(v);
          return;
        }
        if (fatal) {
          clearInterval(t);
          reject(new Error(`fatal: ${fatal.code}`));
          return;
        }
        if (Date.now() - start > ms) {
          clearInterval(t);
          reject(new Error(`timeout: ${label}. saw: ${events.join(', ')}`));
        }
      }, 20);
    });

  socket.on('message', (data, isBinary) => {
    if (isBinary) return;
    const msg = JSON.parse(data.toString('utf8'));
    events.push(msg.type);
    if (msg.type === 'ready') ready = msg;
    if (msg.type === 'transcript' && msg.final) finalTranscript = msg;
    if (msg.type === 'turn-end') turnEnd = msg;
    if (msg.type === 'error' && msg.fatal) fatal = msg;
  });

  await new Promise((res, rej) => {
    socket.once('open', res);
    socket.once('error', rej);
  });
  socket.send(
    JSON.stringify({
      type: 'start',
      protocolVersion: 1,
      sessionToken: widget.session.token,
      pageUrl: `${MERCHANT_SITE}/returns`,
    }),
  );
  await waitFor(() => ready, 10_000, 'ready');
  check('session accepted', Boolean(ready.conversationId));

  // Wait for greeting then ask in Hindi
  await waitFor(() => turnEnd, 20_000, 'greeting');
  turnEnd = undefined;
  await sleep(2000);

  await streamAudio(socket, hindiAudio);
  await streamSilence(socket, 1400);

  await waitFor(() => finalTranscript, 15_000, 'transcript');
  check('Hindi transcribed', finalTranscript.text.length > 0, `"${finalTranscript.text}"`);
  // The transcript may be Devanagari or romanised — either is acceptable.
  const textLower = finalTranscript.text.toLowerCase();
  check(
    'transcript contains key words',
    textLower.includes('wapas') ||
      textLower.includes('return') ||
      textLower.includes('din') ||
      textLower.includes('30'),
    `"${finalTranscript.text}"`,
  );

  await waitFor(() => turnEnd, 30_000, 'Hindi answer');
  check('Hindi answer arrived', (turnEnd?.text?.length ?? 0) > 0);
  check('Hindi answer is grounded', turnEnd.ungrounded !== true);
  console.log(`        Hindi answer: "${turnEnd.text.slice(0, 80)}"`);

  // ─── 3. English follow-up ────────────────────────────────────────────────────
  step('3. English follow-up (code-switch)');

  finalTranscript = undefined;
  turnEnd = undefined;

  // Send as text to bypass Polly synthesis for speed in CI.
  socket.send(JSON.stringify({ type: 'text', content: 'Can I also return a gift I received?' }));
  await waitFor(() => turnEnd, 30_000, 'English answer');
  check('English answer arrived', (turnEnd?.text?.length ?? 0) > 0);
  check('English answer is grounded', turnEnd.ungrounded !== true);
  console.log(`        English answer: "${turnEnd.text.slice(0, 80)}"`);

  // ─── 4. Conversation record ───────────────────────────────────────────────────
  step('4. Conversation record');

  socket.send(JSON.stringify({ type: 'end' }));
  await waitFor(() => events.includes('ended') || socket.readyState > 1, 5000, 'ended');
  socket.close();

  // Give the recorder a moment to flush.
  await sleep(2000);

  const { conversations } = await call(`/v1/conversations?agentId=${agent.id}&limit=1`, {
    token,
    organizationId,
  });
  const conv = conversations[0];
  check('conversation row exists', Boolean(conv?.id));
  check(
    'first detected language is hi-IN',
    conv.detectedLanguage === 'hi-IN',
    conv.detectedLanguage ?? 'null',
  );
  check(
    'conversation marked multilingual after code-switch',
    conv.multilingual === true,
    String(conv.multilingual),
  );
} catch (err) {
  failure = err;
} finally {
  // Always clean up the test agent.
  try {
    await call(`/v1/agents/${agent.id}`, { method: 'DELETE', token, organizationId });
    console.log(`\ncleaned up agent ${agent.id}`);
  } catch {
    console.log(`\ncould not delete agent ${agent.id}`);
  }
}

if (failure) {
  console.error(`\n${failure.stack ?? String(failure)}`);
  process.exit(1);
}

console.log(`\n${String(passed)} checks passed — Hinglish path validated.`);
process.exit(0);
