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


@dataclass
class VoiceTelemetryState:
    run_id: str = ""
    turn_started: float | None = None
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

    async def cleanup(self):
        await self._client.aclose()
        await super().cleanup()

    async def _emit(self, stage: str, latency_ms: int | None = None):
        payload = {
            "runId": self._bridge.run_id or self._state.run_id or str(uuid.uuid4()),
            "stage": stage,
            "status": "success",
            "metrics": {},
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

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        now = time.monotonic()
        if self._mode == "input" and isinstance(frame, UserStartedSpeakingFrame):
            self._state.speech_started = now
        elif self._mode == "input" and isinstance(frame, TranscriptionFrame):
            self._state.run_id = str(uuid.uuid4())
            self._state.turn_started = now
            self._state.first_audio_logged = False
            latency = (
                int((now - self._state.speech_started) * 1000)
                if self._state.speech_started
                else None
            )
            await self._emit("transcribe_final", latency)
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
