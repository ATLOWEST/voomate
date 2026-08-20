# Pipecat voice is deliberately isolated from the web/control-plane container: audio sessions
# have different CPU/memory behaviour and an individual restart must not interrupt the API.
FROM public.ecr.aws/docker/library/python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN pip install --no-cache-dir uv==0.10.0 && useradd --create-home --uid 10001 voomate
COPY services/voice/pyproject.toml services/voice/uv.lock ./
RUN uv sync --frozen --no-dev
COPY services/voice/bot.py ./
COPY services/voice/voomate_voice ./voomate_voice
USER voomate
EXPOSE 7860
CMD ["uv", "run", "python", "bot.py", "--transport", "webrtc", "--host", "0.0.0.0", "--port", "7860"]
