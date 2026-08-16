"""Voomate Web Agent voice mode: browser WebRTC → Transcribe → Nova runtime → Polly."""

import argparse
import json
import os
import sys
import time
from collections import defaultdict, deque

import jwt
from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.runner.types import RunnerArguments
from pipecat.runner.utils import create_transport
from pipecat.services.aws.tts import AWSPollyTTSService
from pipecat.transports.base_transport import BaseTransport, TransportParams

from voomate_voice.bridge import VoomateAgentBridge
from voomate_voice.polly import StreamingGenerativePollyTTSService
from voomate_voice.security import redact_session_body, verify_widget_token
from voomate_voice.telemetry import VoiceTelemetryProcessor, VoiceTelemetryState
from voomate_voice.transcribe import VocabularyTranscribeSTTService

transport_params = {
    "webrtc": lambda: TransportParams(audio_in_enabled=True, audio_out_enabled=True),
}


def _bounded_env(name: str, default: float, minimum: float, maximum: float) -> float:
    try:
        return min(max(float(os.getenv(name, str(default))), minimum), maximum)
    except ValueError:
        return default


def production_vad_params() -> VADParams:
    """Conservative speech gate: ambient sound must not become a customer turn."""
    return VADParams(
        confidence=_bounded_env("VOICE_VAD_CONFIDENCE", 0.82, 0.5, 0.98),
        start_secs=_bounded_env("VOICE_VAD_START_SECS", 0.25, 0.1, 1.0),
        stop_secs=_bounded_env("VOICE_VAD_STOP_SECS", 0.65, 0.2, 2.0),
        min_volume=_bounded_env("VOICE_VAD_MIN_VOLUME", 0.7, 0.1, 1.0),
    )


def generative_polly_settings() -> AWSPollyTTSService.Settings:
    engine = os.getenv("POLLY_ENGINE", "generative")
    if engine != "generative":
        raise RuntimeError("Voomate voice requires POLLY_ENGINE=generative; fallback is disabled")
    return AWSPollyTTSService.Settings(
        voice=os.getenv("POLLY_VOICE_ID", "Danielle"),
        engine="generative",
        language=os.getenv("VOICE_LANGUAGE", "en-US"),
        rate=os.getenv("POLLY_SPEECH_RATE", "1.05"),
    )


def required_transcribe_vocabulary_name() -> str:
    """Require the vocabulary contract instead of silently running generic recognition."""
    vocabulary_name = os.getenv("TRANSCRIBE_VOCABULARY_NAME", "").strip()
    if not vocabulary_name:
        raise RuntimeError(
            "Voomate voice requires TRANSCRIBE_VOCABULARY_NAME; generic Transcribe is disabled"
        )
    return vocabulary_name


async def run_bot(transport: BaseTransport, runner_args: RunnerArguments):
    body = runner_args.body or {}
    logger.info("Starting authenticated voice session {}", redact_session_body(body))
    token = str(body.get("sessionToken", ""))
    claims = verify_widget_token(token, os.environ["WIDGET_TOKEN_SECRET"])
    backend_origin = os.getenv("WEB_AGENT_BACKEND_ORIGIN", "http://localhost:3001")
    conversation_id = body.get("conversationId") or None
    page_url = body.get("pageUrl") or None
    page_context = body.get("pageContext") if isinstance(body.get("pageContext"), dict) else None

    stt = VocabularyTranscribeSTTService(
        region=os.getenv("TRANSCRIBE_REGION", os.getenv("AWS_REGION", "us-east-1")),
        language=os.getenv("VOICE_LANGUAGE", "en-US"),
        vocabulary_name=required_transcribe_vocabulary_name(),
    )
    tts = StreamingGenerativePollyTTSService(
        region=os.getenv("POLLY_REGION", "us-east-1"),
        settings=generative_polly_settings(),
    )
    bridge = VoomateAgentBridge(
        backend_origin=backend_origin,
        token=token,
        widget_origin=claims.origin,
        conversation_id=conversation_id,
        page_url=page_url,
        page_context=page_context,
    )
    telemetry_state = VoiceTelemetryState()
    telemetry_in = VoiceTelemetryProcessor(
        backend_origin=backend_origin,
        token=token,
        widget_origin=claims.origin,
        bridge=bridge,
        state=telemetry_state,
        mode="input",
        min_transcript_confidence=_bounded_env("TRANSCRIBE_MIN_CONFIDENCE", 0.78, 0.5, 0.98),
        vocabulary_enabled=stt.vocabulary_enabled,
    )
    telemetry_out = VoiceTelemetryProcessor(
        backend_origin=backend_origin,
        token=token,
        widget_origin=claims.origin,
        bridge=bridge,
        state=telemetry_state,
        mode="output",
    )
    context = LLMContext()
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            vad_analyzer=SileroVADAnalyzer(params=production_vad_params())
        ),
    )
    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            telemetry_in,
            user_aggregator,
            bridge,
            tts,
            telemetry_out,
            transport.output(),
            assistant_aggregator,
        ]
    )
    task = PipelineTask(
        pipeline,
        params=PipelineParams(enable_metrics=True, enable_usage_metrics=True),
        idle_timeout_secs=runner_args.pipeline_idle_timeout_secs,
    )
    runner = PipelineRunner(handle_sigint=runner_args.handle_sigint)

    @transport.event_handler("on_client_connected")
    async def on_client_connected(_transport, _client):
        logger.info("Voice client connected for agent {}", claims.agent_id)

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(_transport, _client):
        logger.info("Voice client disconnected for agent {}", claims.agent_id)
        await task.cancel()

    await runner.run(task)


async def bot(runner_args: RunnerArguments):
    transport = await create_transport(runner_args, transport_params)
    await run_bot(transport, runner_args)


class VoiceAuthMiddleware:
    """Reject unauthenticated voice starts before Pipecat allocates session state."""

    def __init__(self, app):
        self.app = app
        self._starts: dict[str, deque[float]] = defaultdict(deque)

    async def __call__(self, scope, receive, send):
        path = scope.get("path", "")
        method = scope.get("method", "")
        protected = method == "POST" and path in {"/start", "/api/offer"}
        if scope.get("type") != "http" or not protected:
            await self.app(scope, receive, send)
            return

        chunks = []
        more = True
        while more:
            message = await receive()
            chunks.append(message.get("body", b""))
            more = message.get("more_body", False)
        raw_body = b"".join(chunks)
        try:
            request = json.loads(raw_body)
            body = request.get("body", request.get("request_data", {}))
            claims = verify_widget_token(
                str(body.get("sessionToken", "")), os.environ["WIDGET_TOKEN_SECRET"]
            )
            headers = {
                key.decode("latin1").lower(): value.decode("latin1")
                for key, value in scope.get("headers", [])
            }
            if headers.get("origin", "").lower() != claims.origin:
                raise ValueError("Voice request origin mismatch")
            now = time.monotonic()
            starts = self._starts[f"{claims.key_fingerprint}:{claims.origin}"]
            while starts and starts[0] < now - 60:
                starts.popleft()
            if len(starts) >= 6:
                await self._reject(send, 429, "Too many voice sessions. Please try again shortly.")
                return
            starts.append(now)
        except (KeyError, TypeError, ValueError, jwt.PyJWTError, json.JSONDecodeError):
            await self._reject(send, 401, "Invalid voice session.")
            return

        delivered = False

        async def replay_body():
            nonlocal delivered
            if delivered:
                return {"type": "http.request", "body": b"", "more_body": False}
            delivered = True
            return {"type": "http.request", "body": raw_body, "more_body": False}

        await self.app(scope, replay_body, send)

    @staticmethod
    async def _reject(send, status: int, message: str):
        payload = json.dumps({"error": message}).encode()
        await send(
            {
                "type": "http.response.start",
                "status": status,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"cache-control", b"no-store"),
                ],
            }
        )
        await send({"type": "http.response.body", "body": payload})


def secure_main():
    """Run Pipecat's WebRTC server with Voomate authentication in front of its routes."""
    import uvicorn
    from pipecat.runner.run import _create_server_app

    parser = argparse.ArgumentParser(description="Voomate Pipecat voice edge")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=7860)
    parser.add_argument("-t", "--transport", choices=["webrtc"], default="webrtc")
    parser.add_argument("-f", "--folder", default=None)
    parser.add_argument("--esp32", action="store_true", default=False)
    args = parser.parse_args()
    args.whatsapp = False
    args.proxy = None
    args.direct = False
    args.dialin = False

    logger.remove()
    # Never inherit the application-wide DEBUG setting here. Pipecat's runner debug records
    # include the complete WebRTC request body, which contains the short-lived session token.
    # Voice diagnostics use their own setting and intentionally reject TRACE/DEBUG levels.
    voice_log_level = os.getenv("VOICE_LOG_LEVEL", "INFO").upper()
    if voice_log_level not in {"INFO", "WARNING", "ERROR", "CRITICAL"}:
        voice_log_level = "INFO"
    logger.add(sys.stderr, level=voice_log_level)
    app = _create_server_app(args)
    app.add_middleware(VoiceAuthMiddleware)
    logger.info("Voomate voice edge ready on {}:{}", args.host, args.port)
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    secure_main()
