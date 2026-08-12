/** Real AWS smoke for Voomate's Transcribe custom vocabulary using noisy synthetic speech. */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import {
  StartStreamTranscriptionCommand,
  TranscribeStreamingClient,
} from '@aws-sdk/client-transcribe-streaming';

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

const region = process.env.TRANSCRIBE_REGION ?? process.env.AWS_REGION ?? 'us-east-1';
const vocabularyName = process.env.TRANSCRIBE_VOCABULARY_NAME;
if (!vocabularyName) throw new Error('TRANSCRIBE_VOCABULARY_NAME is required.');

const phrase =
  'Voomate Web Agent adds a voice widget to your website. Voomate connects Nova Pro, Pipecat, and Shopify.';
const polly = new PollyClient({ region: process.env.POLLY_REGION ?? region });
const speech = await polly.send(
  new SynthesizeSpeechCommand({
    Text: phrase,
    VoiceId: process.env.POLLY_VOICE_ID ?? 'Danielle',
    Engine: 'generative',
    OutputFormat: 'pcm',
    SampleRate: '16000',
  }),
);

const chunks = [];
for await (const chunk of speech.AudioStream) chunks.push(chunk);
const cleanAudio = Buffer.concat(chunks);

// Add deterministic low-level white noise to approximate a casual laptop-microphone test while
// keeping the smoke reproducible. PCM values are clamped to signed 16-bit range.
const noisyAudio = Buffer.from(cleanAudio);
let state = 0x5eed1234;
for (let offset = 0; offset + 1 < noisyAudio.length; offset += 2) {
  state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
  const sample = noisyAudio.readInt16LE(offset);
  const noise = Math.round(((state / 0xffffffff) * 2 - 1) * 450);
  noisyAudio.writeInt16LE(Math.max(-32_768, Math.min(32_767, sample + noise)), offset);
}

async function transcribe(vocabulary) {
  async function* audioStream() {
    for (let offset = 0; offset < noisyAudio.length; offset += 3_200) {
      yield { AudioEvent: { AudioChunk: noisyAudio.subarray(offset, offset + 3_200) } };
    }
  }

  const client = new TranscribeStreamingClient({ region });
  const response = await client.send(
    new StartStreamTranscriptionCommand({
      LanguageCode: 'en-US',
      MediaEncoding: 'pcm',
      MediaSampleRateHertz: 16_000,
      EnablePartialResultsStabilization: true,
      PartialResultsStability: 'high',
      VocabularyName: vocabulary,
      AudioStream: audioStream(),
    }),
  );
  let final = '';
  let partials = 0;
  for await (const event of response.TranscriptResultStream) {
    for (const result of event.TranscriptEvent?.Transcript?.Results ?? []) {
      const text = result.Alternatives?.[0]?.Transcript?.trim();
      if (!text) continue;
      if (result.IsPartial) partials += 1;
      else final += `${final ? ' ' : ''}${text}`;
    }
  }
  client.destroy();
  return { final, partials };
}

const baseline = await transcribe(undefined);
const customized = await transcribe(vocabularyName);
if ((customized.final.match(/\bvoomate\b/gi) ?? []).length < 2) {
  throw new Error(`Custom vocabulary did not recognize Voomate: ${customized.final}`);
}
if (
  !/\b(?:web agent|web-agent)\b/i.test(customized.final) ||
  !/\bwidget\b/i.test(customized.final)
) {
  throw new Error(`Product terms were not recognized: ${customized.final}`);
}

console.log(
  JSON.stringify({
    vocabularyName,
    baseline: baseline.final,
    customized: customized.final,
    partialTranscripts: customized.partials,
    noisyPcmBytes: noisyAudio.length,
  }),
);
