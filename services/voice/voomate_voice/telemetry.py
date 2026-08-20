"""Allowlisted voice latency events. No transcript or audio content is recorded."""

import time
import uuid
from dataclasses import dataclass

import httpx
from loguru import logger
from pipecat.frames.frames import (
    Frame,
    InterruptionFrame,
    TranscriptionFrame,
    TTSAudioRawFrame,
    UserStartedSpeakingFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.processors.frameworks.rtvi.frames import RTVIServerMessageFrame


def transcript_confidence(result) -> float | None:
    """Return mean pronunciation confidence from an AWS final result."""
    if not isinstance(result, dict):
        return None
    alternatives = result.get("Alternatives")
    if not isinstance(alternatives, list) or not alternatives:
        return None
    items = alternatives[0].get("Items", []) if isinstance(alternatives[0], dict) else []
    values = []
    for item in items:
        if not isinstance(item, dict) or item.get("Type") == "punctuation":
            continue
        try:
            values.append(float(item["Confidence"]))
        except (KeyError, TypeError, ValueError):
            continue
    return sum(values) / len(values) if values else None


def should_accept_transcript(
    frame: TranscriptionFrame, minimum: float
) -> tuple[bool, float | None]:
    confidence = transcript_confidence(frame.result)
    meaningful = len(frame.text.strip()) >= 2
    return meaningful and confidence is not None and confidence >= minimum, confidence


@dataclass
class VoiceTelemetryState:
    run_id: str = ""
    turn_started: float | None = None
    first_model_text_logged: bool = False
    first_audio_logged: bool = False
    speech_started: float | None = None


class VoiceTelemetryProcessor(FrameProcessor):
    def __init__(
        self,
        *,
        backend_origin: str,
        token: str,
        widget_origin: str,
        bridge,
        state: VoiceTelemetryState,
        mode: str,
        min_transcript_confidence: float = 0.78,
        vocabulary_enabled: bool = False,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self._url = f"{backend_origin.rstrip('/')}/api/web-agent/voice/events"
        self._token = token
        self._origin = widget_origin
        self._bridge = bridge
        self._state = state
        self._mode = mode
        self._client = httpx.AsyncClient(timeout=4)
        self._min_transcript_confidence = min_transcript_confidence
        self._vocabulary_enabled = vocabulary_enabled

    async def cleanup(self):
        await self._client.aclose()
        await super().cleanup()

    async def _emit(
        self,
        stage: str,
        latency_ms: int | None = None,
        *,
        status: str = "success",
        metrics: dict[str, float | bool] | None = None,
    ):
        payload = {
            "runId": self._bridge.run_id or self._state.run_id or str(uuid.uuid4()),
            "stage": stage,
            "status": status,
            "metrics": metrics or {},
        }
        if self._bridge.conversation_id:
            payload["conversationId"] = self._bridge.conversation_id
        if latency_ms is not None:
            payload["latencyMs"] = latency_ms
        try:
            await self._client.post(
                self._url,
                headers={"authorization": f"Bearer {self._token}", "origin": self._origin},
                json=payload,
            )
        except httpx.HTTPError:
            logger.warning("Voice telemetry delivery failed")

    async def record_first_model_text(self):
        """Record model time-to-first-text once, without recording generated text."""
        if self._state.first_model_text_logged:
            return
        self._state.first_model_text_logged = True
        now = time.monotonic()
        latency = (
            int((now - self._state.turn_started) * 1000) if self._state.turn_started else None
        )
        await self._emit("llm_first_text", latency)

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        now = time.monotonic()
        if self._mode == "input" and isinstance(frame, UserStartedSpeakingFrame):
            self._state.speech_started = now
        elif self._mode == "input" and isinstance(frame, TranscriptionFrame):
            accepted, confidence = should_accept_transcript(frame, self._min_transcript_confidence)
            confidence_metric = confidence if confidence is not None else 0.0
            if not accepted:
                await self._emit(
                    "transcribe_discarded",
                    status="error",
                    metrics={
                        "confidence": confidence_metric,
                        "threshold": self._min_transcript_confidence,
                        "vocabularyEnabled": self._vocabulary_enabled,
                        "missingConfidence": confidence is None,
                    },
                )
                await self.push_frame(
                    RTVIServerMessageFrame(
                        data={
                            "type": "voomate-transcript-discarded",
                            "confidence": confidence_metric,
                        }
                    ),
                    direction,
                )
                return
            self._state.run_id = str(uuid.uuid4())
            self._state.turn_started = now
            self._state.first_model_text_logged = False
            self._state.first_audio_logged = False
            latency = (
                int((now - self._state.speech_started) * 1000)
                if self._state.speech_started
                else None
            )
            await self._emit(
                "transcribe_final",
                latency,
                metrics={
                    "confidence": confidence_metric,
                    "threshold": self._min_transcript_confidence,
                    "vocabularyEnabled": self._vocabulary_enabled,
                },
            )
        elif (
            self._mode == "output"
            and isinstance(frame, TTSAudioRawFrame)
            and not self._state.first_audio_logged
        ):
            self._state.first_audio_logged = True
            latency = (
                int((now - self._state.turn_started) * 1000) if self._state.turn_started else None
            )
            await self._emit("tts_first_audio", latency)
        elif self._mode == "input" and isinstance(frame, InterruptionFrame):
            await self._emit("voice_interrupted")
        await self.push_frame(frame, direction)
