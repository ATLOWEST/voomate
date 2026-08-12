# Voomate voice service

Pipecat runs the browser media session. Audio stays on the AWS-native path:
Amazon Transcribe streaming → the existing Next.js Web Agent runtime (Nova + harness + RAG +
tools) → Amazon Polly **Generative**.

```bash
npm run dev:voice
```

The command loads the repository-root `.env`, so there is no separate credentials-copying step.
Those server-only values never reach the widget.

The browser receives only a short-lived widget token and the voice service URL. AWS credentials
remain in the service's normal AWS credential chain. Set `WIDGET_TOKEN_SECRET` to exactly the same
secret as the dashboard, plus `WEB_AGENT_BACKEND_ORIGIN`, `POLLY_REGION`, `TRANSCRIBE_REGION`, and
optionally `POLLY_VOICE_ID`. `POLLY_ENGINE` may only be `generative`; startup fails closed rather
than silently downgrading voice quality.
