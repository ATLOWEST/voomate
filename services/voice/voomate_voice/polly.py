"""A streaming read adapter over Pipecat's native AWS Polly service."""

from collections.abc import AsyncGenerator

from botocore.exceptions import BotoCoreError, ClientError
from pipecat.frames.frames import ErrorFrame, Frame, TTSAudioRawFrame
from pipecat.services.aws.tts import AWSPollyTTSService
from pipecat.utils.tracing.service_decorators import traced_tts


class StreamingGenerativePollyTTSService(AWSPollyTTSService):
    """Forward Polly response bytes as they arrive instead of buffering the whole utterance."""

    @traced_tts
    async def run_tts(self, text: str, context_id: str) -> AsyncGenerator[Frame, None]:
        if self._settings.engine != "generative":
            yield ErrorFrame(error="Voomate voice requires Amazon Polly Generative")
            return
        try:
            params = {
                "Text": self._construct_ssml(text),
                "TextType": "ssml",
                "OutputFormat": "pcm",
                "VoiceId": self._settings.voice,
                "Engine": "generative",
                "SampleRate": "16000",
                "LexiconNames": self._settings.lexicon_names,
            }
            filtered = {key: value for key, value in params.items() if value is not None}
            await self.start_tts_usage_metrics(text)
            first_audio = True
            async with self._aws_session.client("polly", **self._aws_params) as polly:
                response = await polly.synthesize_speech(**filtered)
                stream = response.get("AudioStream")
                if stream is None:
                    yield ErrorFrame(error="Amazon Polly returned no audio stream")
                    return
                while raw_chunk := await stream.read(8_192):
                    audio = await self._resampler.resample(raw_chunk, 16_000, self.sample_rate)
                    for offset in range(0, len(audio), self.chunk_size):
                        chunk = audio[offset : offset + self.chunk_size]
                        if not chunk:
                            continue
                        if first_audio:
                            first_audio = False
                            await self.stop_ttfb_metrics()
                        yield TTSAudioRawFrame(
                            chunk,
                            self.sample_rate,
                            1,
                            context_id=context_id,
                        )
        except (BotoCoreError, ClientError) as error:
            yield ErrorFrame(error=f"Amazon Polly synthesis failed: {error.__class__.__name__}")
