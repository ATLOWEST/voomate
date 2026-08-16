# Voice quality and cost benchmark

## Current production contract

The voice edge starts only when all three quality controls are present:

- Amazon Polly uses the Generative engine. A Neural or Standard configuration fails at startup.
- Amazon Transcribe uses a named custom vocabulary. An unset vocabulary fails at startup.
- Conservative VAD and a transcription-confidence gate discard silence, ambient noise, and
  untrusted final transcripts before they can reach the Web Agent.

The local vocabulary smoke check verifies the configured vocabulary corrects the supplied noisy
phrase from `Wu mate`, `Vume`, and `Pipe Cat` to `Voomate`, `Voomate`, and `Pipecat`.

## Side-by-side acceptance run

Record the same ten short phrases in a normal room, with two deliberate silence/noise intervals.
Use the same microphone, browser, and network for Voomate and the ElevenLabs public demo.

1. "Can you explain what this page does?"
2. "Please take me to pricing."
3. "What does the Growth plan include?"
4. "Can you understand me?"
5. "Tell me about Voomate."
6. "Where is order DEMO-1001?"
7. "My email is demo@voomate.local."
8. "Is the blue jacket in stock?"
9. "I want to set up my account."
10. "Why is it so serious or what?"

For each product, record: exact transcript, word-error rate, whether silence produced a turn,
time from end-of-speech to first audio, and a 1–5 listener naturalness score. Do not declare
quality parity until the run contains all ten spoken phrases and the two deliberate noise periods.

## Cost model (US East, before infrastructure and telephony)

Use observed usage rather than a single marketing number:

```
voice_cost =
  transcribed_minutes * 0.0100 +
  generated_characters / 1_000_000 * 30.00 +
  nova_input_tokens / 1_000_000 * 0.80 +
  nova_output_tokens / 1_000_000 * 3.20
```

Amazon's published example maps one million Polly characters to about 1,388 minutes of speech.
That makes Generative Polly about $0.0216 per fully agent-spoken minute. At a more typical 50%
agent talk ratio, it is about $0.0108 per conversation minute. With an illustrative 1,200 Nova
input and 150 output tokens per minute, Nova adds about $0.00144. The comparable AWS service cost
is therefore approximately $0.0222 per conversation minute at that talk ratio, before Bedrock
Agent, embedding, network, logging, storage, and telephony costs.

ElevenLabs currently lists $0.08 per additional agent minute, with LLM and telephony charged
separately. That makes the AWS voice-service baseline about 72% lower under the stated
assumptions, not a final gross-margin claim. Recalculate from production usage before publishing
pricing or margin claims.

Sources checked 2026-08-16:

- https://aws.amazon.com/transcribe/pricing/
- https://aws.amazon.com/polly/pricing/
- https://aws.amazon.com/bedrock/pricing/
- https://elevenlabs.io/pricing/agents
