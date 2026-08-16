"""Pipecat processor that reuses the existing Next.js Web Agent runtime."""

import json
from collections.abc import AsyncIterator
from typing import Any
from urllib.parse import urlparse

import httpx
from pipecat.frames.frames import (
    Frame,
    LLMContextFrame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    LLMTextFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.processors.frameworks.rtvi.frames import (
    RTVIClientMessageFrame,
    RTVIServerMessageFrame,
    RTVIServerResponseFrame,
)


def latest_user_text(context: Any) -> str | None:
    """Extract only text from the latest user turn; images/instructions are not accepted here."""
    for message in reversed(context.get_messages()):
        if not isinstance(message, dict) or message.get("role") != "user":
            continue
        content = message.get("content")
        if isinstance(content, str):
            return content.strip() or None
        if isinstance(content, list):
            text = "".join(
                part.get("text", "")
                for part in content
                if isinstance(part, dict) and isinstance(part.get("text"), str)
            ).strip()
            return text or None
    return None


async def iter_ndjson(response: httpx.Response) -> AsyncIterator[dict[str, Any]]:
    async for line in response.aiter_lines():
        if not line.strip():
            continue
        value = json.loads(line)
        if isinstance(value, dict):
            yield value


def voice_turn_payload(
    message: str,
    conversation_id: str | None,
    page_url: str | None,
    page_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a schema-valid request for the canonical Web Agent turn endpoint."""
    payload: dict[str, Any] = {"message": message, "imageIds": []}
    if conversation_id:
        payload["conversationId"] = conversation_id
    if page_url:
        payload["pageUrl"] = page_url
    if page_context:
        payload["pageContext"] = page_context
    return payload


class VoomateAgentBridge(FrameProcessor):
    """Turns final Transcribe text into streamed output from the canonical agent runtime."""

    def __init__(
        self,
        *,
        backend_origin: str,
        token: str,
        widget_origin: str,
        conversation_id: str | None,
        page_url: str | None,
        page_context: dict[str, Any] | None = None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self._backend_origin = backend_origin.rstrip("/")
        self._token = token
        self._widget_origin = widget_origin
        self._conversation_id = conversation_id
        self._run_id: str | None = None
        self._page_url = page_url
        self._page_context = page_context
        self._client = httpx.AsyncClient(timeout=httpx.Timeout(45, connect=5))

    @property
    def conversation_id(self) -> str | None:
        return self._conversation_id

    @property
    def run_id(self) -> str | None:
        return self._run_id

    async def cleanup(self):
        await self._client.aclose()
        await super().cleanup()

    def update_page_context(self, page_url: Any, page_context: Any) -> bool:
        if not isinstance(page_url, str) or not isinstance(page_context, dict):
            return False
        try:
            page = urlparse(page_url)
            allowed = urlparse(self._widget_origin)
            serialized = json.dumps(page_context, separators=(",", ":"))
        except (TypeError, ValueError):
            return False
        if (
            page.scheme.lower() != allowed.scheme.lower()
            or page.netloc.lower() != allowed.netloc.lower()
            or len(page_url) > 2048
            or len(serialized) > 40_000
        ):
            return False
        self._page_url = page_url
        self._page_context = page_context
        return True

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if isinstance(frame, RTVIClientMessageFrame) and frame.type == "voomate-page-context":
            data = frame.data if isinstance(frame.data, dict) else {}
            accepted = self.update_page_context(data.get("pageUrl"), data.get("pageContext"))
            await self.push_frame(
                RTVIServerResponseFrame(
                    client_msg=frame,
                    data={"accepted": accepted},
                    error=None if accepted else "Invalid page context update.",
                ),
                direction,
            )
            return
        if not isinstance(frame, LLMContextFrame):
            await self.push_frame(frame, direction)
            return

        message = latest_user_text(frame.context)
        if not message:
            return
        await self.push_frame(LLMFullResponseStartFrame())
        try:
            async with self._client.stream(
                "POST",
                f"{self._backend_origin}/api/web-agent/messages/stream",
                headers={
                    "authorization": f"Bearer {self._token}",
                    "content-type": "application/json",
                    "origin": self._widget_origin,
                },
                json=voice_turn_payload(
                    message,
                    self._conversation_id,
                    self._page_url,
                    self._page_context,
                ),
            ) as response:
                response.raise_for_status()
                async for event in iter_ndjson(response):
                    if event.get("type") == "start":
                        self._conversation_id = event.get("conversationId")
                        self._run_id = event.get("runId")
                        await self.push_frame(
                            RTVIServerMessageFrame(
                                {
                                    "type": "voomate-turn-started",
                                    "conversationId": self._conversation_id,
                                }
                            )
                        )
                    elif event.get("type") == "delta" and isinstance(event.get("text"), str):
                        await self.push_frame(LLMTextFrame(event["text"]))
                    elif event.get("type") == "done":
                        self._conversation_id = event.get("conversationId")
                        self._run_id = event.get("runId") or self._run_id
                        await self.push_frame(
                            RTVIServerMessageFrame(
                                {
                                    "type": "voomate-turn-complete",
                                    "conversationId": self._conversation_id,
                                    "runId": event.get("runId"),
                                    "clientCommands": event.get("clientCommands", []),
                                }
                            )
                        )
                    elif event.get("type") == "error":
                        raise RuntimeError(str(event.get("error", "Agent request failed")))
        except (httpx.HTTPError, json.JSONDecodeError, RuntimeError) as e:
            from loguru import logger
            logger.error(f"Voice bridge error: {e}")
            # Customer-safe spoken error; details stay server-side and credentials are never logged.
            await self.push_frame(
                LLMTextFrame("I’m having trouble answering right now. Please continue by chat.")
            )
        finally:
            await self.push_frame(LLMFullResponseEndFrame())
