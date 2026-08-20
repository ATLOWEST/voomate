/**
 * End-to-end voice smoke test against a running API.
 *
 * The text smoke test proves retrieval works. This one proves a *conversation* works: speech in
 * one end, speech out the other, fast enough to talk to. Every layer is real — real Transcribe,
 * real Bedrock, real Polly, a real WebSocket with a real origin check.
 *
 *   npm run dev --workspace @soniq/api        # in one terminal
 *   npm run smoke:voice -- you@example.com 'password'
 *
 * The visitor's voice is synthesised with Polly rather than checked in as a recording. Two
 * reasons: a repository is the wrong place for a megabyte of audio, and a fixture recorded once
 * on one machine tests one accent forever. Generating it means the question can be changed by
 * editing a string.
 *
 * What it measures, and why these numbers and not others:
 *
 *   - **Speech to speech.** From the last frame of the visitor's audio to the first byte of the
 *     agent's. This is the only latency number a visitor experiences; everything else is
 *     bookkeeping. The budget is 1.2 seconds (docs/phase-3-voice.md).
 *   - **The stages behind it.** Transcribe's final result, retrieval, first token, first audio.
 *     A missed budget is useless without knowing which stage ate it.
 *
 * It cleans up after itself. A failure part-way leaves the agent behind on purpose.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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
const socketUrl = `${apiUrl.replace(/^http/, 'ws')}/v1/widget/voice`;

/** The website the widget pretends to be embedded on. Must match the agent's allowlist. */
const MERCHANT_SITE = 'https://example.com';

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: npm run smoke:voice -- you@example.com 'password'");
  process.exit(1);
}
if (!supabaseUrl || !anonKey) {
  console.error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
  process.exit(1);
}

const { default: WebSocket } = await import('ws');
const { PollyClient, SynthesizeSpeechCommand } = await import('@aws-sdk/client-polly');

// --- Reporting -------------------------------------------------------------------------------

let passed = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) {
    console.error('\nVoice smoke test failed.');
    process.exit(1);
  }
  passed += 1;
};

const step = (label) => console.log(`\n${label}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    throw new Error(
      `${method} ${path} → ${String(response.status)} ${payload?.error?.message ?? response.statusText}`,
    );
  }
  return payload;
};

// --- The visitor's voice -----------------------------------------------------------------------

const polly = new PollyClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

/**
 * Synthesise a question as the exact format a browser microphone would send.
 *
 * 16 kHz mono 16-bit PCM, which is what `VOICE_SAMPLE_RATE` fixes and what Transcribe wants.
 * A neural voice, because a robotic one transcribes worse than a person does and this test is
 * meant to fail on our bugs, not on a deliberately poor recording.
 */
const speak = async (text) => {
  const result = await polly.send(
    new SynthesizeSpeechCommand({
      Text: text,
      VoiceId: 'Joanna',
      Engine: 'neural',
      OutputFormat: 'pcm',
      SampleRate: '16000',
    }),
  );

  const chunks = [];
  for await (const chunk of result.AudioStream) chunks.push(chunk);
  return Buffer.concat(chunks);
};

const FRAME_BYTES = 640; // 20 ms at 16 kHz, mono, 16-bit
const SILENCE_FRAME = Buffer.alloc(FRAME_BYTES);

/**
 * Feed audio to the socket at the rate a microphone would produce it.
 *
 * Pacing matters. The server's end-of-utterance detection is a wall-clock judgement about how
 * long the visitor has been quiet; audio delivered as fast as the socket accepts it would look
 * like someone speaking at twenty times normal speed and going silent instantly, which is not a
 * situation any of the tuning was done for.
 */
const streamAudio = async (socket, pcm) => {
  const started = Date.now();
  let sent = 0;

  for (let offset = 0; offset + FRAME_BYTES <= pcm.length; offset += FRAME_BYTES) {
    socket.send(pcm.subarray(offset, offset + FRAME_BYTES));
    sent += 1;
    // Sleep to the schedule rather than a fixed 20 ms, so timer drift does not accumulate into
    // audio arriving slower than real time over a long question.
    const behind = started + sent * 20 - Date.now();
    if (behind > 0) await sleep(behind);
  }

  return Date.now();
};

/** Silence, so the server hears the visitor stop talking. */
const streamSilence = async (socket, ms) => {
  for (let elapsed = 0; elapsed < ms; elapsed += 20) {
    socket.send(SILENCE_FRAME);
    await sleep(20);
  }
};

// --- 1. Set up an agent with something to say --------------------------------------------------

step('1. An active agent');

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
check('organization resolved', Boolean(organizationId), organizations[0].name);

const { agent } = await call('/v1/agents', {
  method: 'POST',
  token,
  organizationId,
  body: { name: `Voice smoke ${Date.now().toString(36)}`, websiteUrl: MERCHANT_SITE },
});
check('agent created', Boolean(agent?.id), agent.id);
check('voice is on by default', agent.voiceEnabled === true);

let failure;
try {
  await call(`/v1/agents/${agent.id}/knowledge/qa`, {
    method: 'POST',
    token,
    organizationId,
    body: {
      question: 'How long do I have to return an item?',
      answer:
        'You have 30 days from the delivery date to start a return. Items must be unused and in their original packaging.',
    },
  });

  let sources = [];
  for (let attempt = 0; attempt < 30; attempt += 1) {
    ({ sources } = await call(`/v1/agents/${agent.id}/knowledge`, { token, organizationId }));
    if (sources.length > 0 && sources.every((source) => source.status === 'ready')) break;
    await sleep(1000);
  }
  check(
    'knowledge indexed',
    sources.every((source) => source.status === 'ready'),
  );

  // Set explicitly, because an agent with no greeting opens a voice session in silence and the
  // visitor has nothing to tell them it is working. The greeting is also the first turn the
  // session ever runs, so it exercises synthesis before anything is asked.
  await call(`/v1/agents/${agent.id}`, {
    method: 'PATCH',
    token,
    organizationId,
    body: { persona: { greeting: 'Hi! Ask me anything about your order.' } },
  });

  const published = await call(`/v1/agents/${agent.id}/publish`, {
    method: 'POST',
    token,
    organizationId,
  });
  check('agent active', published.agent.status === 'active');

  // --- 2. The widget handshake ----------------------------------------------------------------

  step('2. Session');

  // No dashboard token from here on. This is the public path, and the only thing vouching for
  // the caller is the embed key plus the browser-set Origin header.
  const sessionResponse = await fetch(`${apiUrl}/v1/widget/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: MERCHANT_SITE },
    body: JSON.stringify({ embedKey: agent.embedKey, channel: 'voice' }),
  });
  const widget = await sessionResponse.json();
  check(
    'embed key exchanged for a session token',
    sessionResponse.ok && Boolean(widget.session?.token),
  );
  check('the agent reports voice as available', widget.agent.voiceEnabled === true);
  // This response is served to any website the merchant allowlisted. It must carry presentation
  // and nothing else — no instructions, no knowledge base identifiers, nothing a competitor could
  // read off the merchant's own public pages.
  check(
    'the session response carries no agent internals',
    widget.agent.instructions === undefined && widget.agent.knowledgeBaseId === undefined,
    Object.keys(widget.agent).join(', '),
  );

  const wrongSite = await fetch(`${apiUrl}/v1/widget/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://not-the-merchant.test' },
    body: JSON.stringify({ embedKey: agent.embedKey, channel: 'voice' }),
  });
  check(
    'the same embed key is refused from another website',
    wrongSite.status >= 400,
    String(wrongSite.status),
  );

  // --- 3. The conversation ---------------------------------------------------------------------

  step('3. Speaking');

  const question = 'Can I send something back if I changed my mind?';
  const questionAudio = await speak(question);
  check(
    'the visitor question was synthesised',
    questionAudio.length > FRAME_BYTES * 25,
    `${(questionAudio.length / 32_000).toFixed(1)}s of audio`,
  );

  const socket = new WebSocket(socketUrl, { origin: MERCHANT_SITE });

  /** Everything the server said, in order, so a failure can be read afterwards. */
  const events = [];
  const audioIn = { frames: 0, bytes: 0, firstAt: 0 };
  let ready;
  let finalTranscript;
  let turnEnd;
  let ducked = false;
  let cancelled = false;
  let fatal;

  const waitFor = (predicate, timeoutMs, label) =>
    new Promise((resolve, reject) => {
      const started = Date.now();
      const poll = setInterval(() => {
        const value = predicate();
        if (value) {
          clearInterval(poll);
          resolve(value);
          return;
        }
        if (fatal) {
          clearInterval(poll);
          reject(new Error(`server refused the session: ${fatal.code} ${fatal.message}`));
          return;
        }
        if (Date.now() - started > timeoutMs) {
          clearInterval(poll);
          reject(new Error(`timed out waiting for ${label}. saw: ${events.join(', ')}`));
        }
      }, 20);
    });

  socket.on('message', (data, isBinary) => {
    if (isBinary) {
      if (audioIn.firstAt === 0) audioIn.firstAt = Date.now();
      audioIn.frames += 1;
      audioIn.bytes += data.length;
      return;
    }

    const message = JSON.parse(data.toString('utf8'));
    events.push(message.type);

    switch (message.type) {
      case 'ready':
        ready = message;
        break;
      case 'transcript':
        if (message.final) finalTranscript = message;
        break;
      case 'turn-end':
        turnEnd = message;
        break;
      case 'duck':
        ducked = true;
        break;
      case 'cancel':
        cancelled = true;
        break;
      case 'error':
        if (message.fatal) fatal = message;
        break;
      default:
        break;
    }
  });

  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });

  socket.send(
    JSON.stringify({
      type: 'start',
      protocolVersion: 1,
      sessionToken: widget.session.token,
      pageUrl: `${MERCHANT_SITE}/returns`,
    }),
  );

  await waitFor(() => ready, 10_000, 'the session to be accepted');
  check(
    'the socket accepted the session token',
    Boolean(ready.conversationId),
    ready.conversationId,
  );
  check(
    'a voice was locked for the session',
    Boolean(ready.voice?.voiceId),
    `${ready.voice.voiceId} ${ready.voice.engine}${ready.voice.degraded ? ' (degraded)' : ''}`,
  );

  // The greeting is a turn like any other. Let it finish, or the question would arrive as an
  // interruption and this would be testing barge-in instead.
  await waitFor(() => turnEnd, 20_000, 'the greeting to finish');
  const greeting = turnEnd;
  check('the greeting was spoken', audioIn.bytes > 0, `${(audioIn.bytes / 32_000).toFixed(1)}s`);
  turnEnd = undefined;
  audioIn.firstAt = 0;
  const audioBeforeQuestion = audioIn.bytes;

  // Let the greeting finish playing out. The server tracks playback, and speaking over it would
  // be read — correctly — as an interruption.
  await sleep(Math.min(12_000, (audioIn.bytes / 32_000) * 1000));

  const spokeUntil = await streamAudio(socket, questionAudio);
  // Real silence, not an abrupt stop. End-of-utterance is a judgement about how long someone has
  // been quiet, and a socket that simply goes silent is a different signal from a quiet room.
  await streamSilence(socket, 1400);

  await waitFor(() => finalTranscript, 15_000, 'a final transcript');
  const heardAt = Date.now();
  check(
    'the question was transcribed',
    finalTranscript.text.length > 0,
    `"${finalTranscript.text}"`,
  );
  const heardWords = finalTranscript.text.toLowerCase();
  check(
    'the transcript resembles what was said',
    heardWords.includes('back') || heardWords.includes('mind') || heardWords.includes('send'),
    `"${finalTranscript.text}"`,
  );

  await waitFor(() => audioIn.firstAt > 0, 15_000, 'the agent to start speaking');
  const speechToSpeech = audioIn.firstAt - spokeUntil;

  await waitFor(() => turnEnd, 30_000, 'the answer to finish');
  check('the answer arrived as audio', audioIn.bytes > audioBeforeQuestion);
  check(
    'the answer is grounded in the merchant’s own content',
    turnEnd.ungrounded !== true,
    turnEnd.text.slice(0, 100).replace(/\n/g, ' '),
  );
  check(
    'the answer mentions the 30 day window',
    turnEnd.text.includes('30'),
    turnEnd.text.slice(0, 120),
  );
  // A synthesiser reads what it is given. Markdown in a voice answer is heard as "asterisk
  // asterisk", and there is no way for the visitor to tell it was formatting.
  check('the spoken answer contains no markdown', !/[*#`]/.test(turnEnd.text));

  // --- 4. Latency -------------------------------------------------------------------------------

  step('4. Latency');

  const stages = turnEnd.latency ?? {};
  console.log(
    `        stages: ${Object.entries(stages)
      .map(([name, value]) => `${name}=${String(Math.round(value))}ms`)
      .join(' · ')}`,
  );
  console.log(`        end of speech → first audio out: ${String(speechToSpeech)}ms`);
  console.log(`        end of speech → final transcript: ${String(heardAt - spokeUntil)}ms`);

  // Two thresholds on purpose. 1200 ms is the product target and the number to design against;
  // 3000 ms is where a conversation stops being one. Failing the test at the target would mean
  // a red build every time us-east-1 has a slow minute, so the target is reported and the
  // usability floor is enforced.
  if (speechToSpeech > 1200) {
    console.log(`        note: over the 1200ms target by ${String(speechToSpeech - 1200)}ms`);
  }
  check(
    'the agent replies fast enough to hold a conversation',
    speechToSpeech < 3000,
    `${String(speechToSpeech)}ms`,
  );

  // --- 5. Barge-in -------------------------------------------------------------------------------

  step('5. Interrupting');

  // The single most complained-about failure in voice products is an agent that will not stop
  // talking. Ask something long enough to still be speaking when it is interrupted.
  finalTranscript = undefined;
  turnEnd = undefined;
  socket.send(
    JSON.stringify({
      type: 'text',
      content: 'Tell me everything about your returns policy in detail.',
    }),
  );

  await waitFor(() => events.includes('turn-start'), 15_000, 'the agent to start answering');
  const bytesAtInterrupt = audioIn.bytes;
  await sleep(700); // Let it get properly under way.

  socket.send(JSON.stringify({ type: 'interrupt' }));
  await waitFor(() => cancelled, 5000, 'the server to cancel the turn');
  check('pressing stop cancels the turn', cancelled === true);

  const bytesAfterCancel = audioIn.bytes;
  await sleep(1000);
  check(
    'no further audio is sent after the cancel',
    audioIn.bytes === bytesAfterCancel,
    `${String(audioIn.bytes - bytesAtInterrupt)} bytes before it stopped`,
  );

  // --- 6. Ending ---------------------------------------------------------------------------------

  step('6. Ending');

  socket.send(JSON.stringify({ type: 'end' }));
  await waitFor(
    () => events.includes('ended') || socket.readyState > 1,
    5000,
    'the session to end',
  );
  check('the session ended cleanly', true);
  socket.close();

  console.log(
    `\n        conversation ${ready.conversationId}: ${String(audioIn.frames)} audio frames in,` +
      ` ${(audioIn.bytes / 32_000).toFixed(1)}s of speech, greeting "${greeting.text.slice(0, 60)}"` +
      `${ducked ? ', ducked at least once' : ''}`,
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
process.exit(0);
