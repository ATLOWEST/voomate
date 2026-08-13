/** Real AWS voice smoke: Generative Polly → streaming Transcribe → shared Nova turn → Generative Polly. */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import {
  StartStreamTranscriptionCommand,
  TranscribeStreamingClient,
} from '@aws-sdk/client-transcribe-streaming';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(separator + 1).trim();
  }
}

const dashboard = process.env.WEB_AGENT_BACKEND_ORIGIN ?? 'http://localhost:3001';
const origin = process.env.WEB_AGENT_SMOKE_ORIGIN ?? 'http://localhost:3000';
const publicKey = process.env.WEB_AGENT_PUBLIC_KEY ?? 'test-embed-key';
const region = process.env.POLLY_REGION ?? process.env.AWS_REGION ?? 'us-east-1';
const voice = process.env.POLLY_VOICE_ID ?? 'Danielle';
const phrase = 'What color did I just tell you was my favorite?';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`ok  ${message}`);
};

const polly = new PollyClient({ region });
const speak = async (text) => {
  const startedAt = Date.now();
  const response = await polly.send(
    new SynthesizeSpeechCommand({
      Text: text,
      VoiceId: voice,
      Engine: 'generative',
      OutputFormat: 'pcm',
      SampleRate: '16000',
    }),
  );
  const chunks = [];
  let firstByteLatencyMs;
  for await (const chunk of response.AudioStream) {
    firstByteLatencyMs ??= Date.now() - startedAt;
    chunks.push(chunk);
  }
  return { audio: Buffer.concat(chunks), firstByteLatencyMs };
};

const voiceTurnStartedAt = Date.now();
const { audio: visitorAudio } = await speak(phrase);
assert(visitorAudio.length > 16_000, 'Polly Generative produced visitor audio');

async function* audioStream() {
  for (let offset = 0; offset < visitorAudio.length; offset += 3_200) {
    yield { AudioEvent: { AudioChunk: visitorAudio.subarray(offset, offset + 3_200) } };
  }
}

const transcribe = new TranscribeStreamingClient({
  region: process.env.TRANSCRIBE_REGION ?? region,
});
const transcribeStartedAt = Date.now();
const transcription = await transcribe.send(
  new StartStreamTranscriptionCommand({
    LanguageCode: 'en-US',
    MediaEncoding: 'pcm',
    MediaSampleRateHertz: 16_000,
    EnablePartialResultsStabilization: true,
    PartialResultsStability: 'high',
    VocabularyName: process.env.TRANSCRIBE_VOCABULARY_NAME,
    AudioStream: audioStream(),
  }),
);
let partialCount = 0;
let finalTranscript = '';
let finalConfidence = 0;
for await (const event of transcription.TranscriptResultStream) {
  for (const result of event.TranscriptEvent?.Transcript?.Results ?? []) {
    const text = result.Alternatives?.[0]?.Transcript?.trim();
    if (!text) continue;
    if (result.IsPartial) partialCount += 1;
    else {
      finalTranscript = text;
      const confidences = (result.Alternatives?.[0]?.Items ?? [])
        .map((item) => Number(item.Confidence))
        .filter(Number.isFinite);
      finalConfidence = confidences.length
        ? confidences.reduce((total, value) => total + value, 0) / confidences.length
        : 0;
    }
  }
}
assert(partialCount > 0, 'Transcribe streaming returned partial transcripts');
assert(finalTranscript.length > 0, 'Transcribe streaming returned a final transcript');
assert(
  finalConfidence >= Number(process.env.TRANSCRIBE_MIN_CONFIDENCE ?? 0.78),
  `Transcribe final confidence passed the production gate (${finalConfidence.toFixed(3)})`,
);
const transcribeLatencyMs = Date.now() - transcribeStartedAt;

const sessionResponse = await fetch(`${dashboard}/api/web-agent/session`, {
  method: 'POST',
  headers: { origin, 'content-type': 'application/json' },
  body: JSON.stringify({ publicKey }),
});
const session = await sessionResponse.json();
assert(sessionResponse.ok && session.session?.token, 'origin-bound widget session was minted');

const typedResponse = await fetch(`${dashboard}/api/web-agent/messages`, {
  method: 'POST',
  headers: {
    origin,
    authorization: `Bearer ${session.session.token}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Please remember that my favorite color is cobalt blue.',
    imageIds: [],
    pageUrl: `${origin}/voice-smoke`,
  }),
});
const typedTurn = await typedResponse.json();
assert(
  typedResponse.ok && typedTurn.conversationId,
  `typed turn created the shared conversation (HTTP ${typedResponse.status}: ${JSON.stringify(typedTurn)})`,
);

const agentResponse = await fetch(`${dashboard}/api/web-agent/messages/stream`, {
  method: 'POST',
  headers: {
    origin,
    authorization: `Bearer ${session.session.token}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    message: finalTranscript,
    conversationId: typedTurn.conversationId,
    imageIds: [],
    pageUrl: `${origin}/voice-smoke`,
  }),
});
assert(agentResponse.ok && agentResponse.body, 'shared Nova Web Agent stream opened');
let buffer = '';
let answer = '';
let done;
for await (const chunk of agentResponse.body) {
  buffer += new TextDecoder().decode(chunk, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';
  for (const line of lines) {
    if (!line) continue;
    const event = JSON.parse(line);
    if (event.type === 'delta') answer += event.text;
    if (event.type === 'done') done = event;
    if (event.type === 'error') throw new Error(event.error);
  }
}
assert(
  done?.conversationId && done?.runId && answer.length > 0,
  'Nova streamed a stored voice turn',
);
assert(/cobalt/i.test(answer), 'spoken follow-up recalled context from the typed turn');

const { audio: assistantAudio, firstByteLatencyMs } = await speak(answer);
assert(assistantAudio.length > 16_000, 'Polly Generative produced the assistant response');

const voiceEvent = (stage, latencyMs) =>
  fetch(`${dashboard}/api/web-agent/voice/events`, {
    method: 'POST',
    headers: {
      origin,
      authorization: `Bearer ${session.session.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      conversationId: done.conversationId,
      runId: done.runId,
      stage,
      status: 'success',
      latencyMs,
      metrics: {},
    }),
  });
const eventResponses = await Promise.all([
  voiceEvent('transcribe_final', transcribeLatencyMs),
  voiceEvent('tts_first_audio', firstByteLatencyMs),
  voiceEvent('voice_turn_complete', Date.now() - voiceTurnStartedAt),
]);
assert(
  eventResponses.every((response) => response.ok),
  'voice stage latencies were accepted',
);

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from('agent_run_events')
    .select('stage,latency_ms')
    .eq('run_id', done.runId);
  if (error) throw error;
  assert(
    data.some((event) => event.stage === 'bedrock_inline_agent'),
    'Nova agent runtime is visible in Logs',
  );
  assert(
    data.some((event) => event.stage === 'transcribe_final' && event.latency_ms !== null),
    'Transcribe latency is visible in Logs',
  );
  assert(
    data.some((event) => event.stage === 'tts_first_audio' && event.latency_ms !== null),
    'Polly first-audio latency is visible in Logs',
  );
  assert(
    data.some((event) => event.stage === 'response_returned'),
    'voice completion is visible in Logs',
  );
}

console.log(
  JSON.stringify({
    conversationId: done.conversationId,
    partialTranscripts: partialCount,
    finalTranscript,
    finalConfidence: Number(finalConfidence.toFixed(3)),
    responseCharacters: answer.length,
    assistantAudioBytes: assistantAudio.length,
  }),
);
