"""Amazon Transcribe streaming with tenant-safe custom vocabulary support."""

import random
import string

from loguru import logger
from pipecat.services.aws.stt import AWSTranscribeSTTService
from pipecat.services.aws.utils import get_presigned_url
from websockets.asyncio.client import connect as websocket_connect
from websockets.protocol import State


class VocabularyTranscribeSTTService(AWSTranscribeSTTService):
    """Pipecat's AWS stream plus the vocabulary parameter its helper already supports.

    Pipecat 0.0.108 exposes vocabulary support in its AWS URL signer but does not pass a
    vocabulary name from the service. Keeping this tiny adapter local avoids replacing its
    streaming transcript, partial-result stabilization, metrics, or interruption behavior.
    """

    def __init__(self, *, vocabulary_name: str | None = None, **kwargs):
        self._vocabulary_name = vocabulary_name or None
        super().__init__(**kwargs)

    @property
    def vocabulary_enabled(self) -> bool:
        return self._vocabulary_name is not None

    async def _connect_websocket(self):
        try:
            if self._websocket and self._websocket.state is State.OPEN:
                return

            language_code = self._settings.language
            if not language_code:
                raise ValueError("A Transcribe language is required")

            connect_sample_rate = self.sample_rate
            if connect_sample_rate not in (8000, 16000):
                connect_sample_rate = 16000

            websocket_key = "".join(
                random.choices(
                    string.ascii_uppercase + string.ascii_lowercase + string.digits, k=20
                )
            )
            additional_headers = {
                "Origin": "https://localhost",
                "Sec-WebSocket-Key": websocket_key,
                "Sec-WebSocket-Version": "13",
                "Connection": "keep-alive",
            }
            presigned_url = get_presigned_url(
                region=self._credentials["region"],
                credentials={
                    "access_key": self._credentials["aws_access_key_id"],
                    "secret_key": self._credentials["aws_secret_access_key"],
                    "session_token": self._credentials["aws_session_token"],
                },
                language_code=language_code,
                media_encoding=self.get_service_encoding(self._media_encoding),
                sample_rate=connect_sample_rate,
                number_of_channels=self._number_of_channels,
                enable_partial_results_stabilization=True,
                partial_results_stability="high",
                vocabulary_name=self._vocabulary_name,
                show_speaker_label=self._show_speaker_label,
                enable_channel_identification=self._enable_channel_identification,
            )
            self._websocket = await websocket_connect(
                presigned_url,
                additional_headers=additional_headers,
                subprotocols=["mqtt"],
                ping_interval=None,
                ping_timeout=None,
                compression=None,
            )
            await self._call_event_handler("on_connected")
            logger.info(
                "Amazon Transcribe stream connected (custom vocabulary: {})",
                "enabled" if self.vocabulary_enabled else "disabled",
            )
        except Exception as error:
            await self.push_error(
                error_msg="Unable to connect to Amazon Transcribe", exception=error
            )
            raise
