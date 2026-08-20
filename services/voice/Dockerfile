# Pipecat voice is deliberately isolated from the web/control-plane container: audio sessions
# have different CPU/memory behaviour and an individual restart must not interrupt the API.
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN pip install --no-cache-dir uv==0.10.0 && useradd --create-home --uid 10001 voomate
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY bot.py ./
COPY voomate_voice ./voomate_voice
USER voomate
EXPOSE 7860
CMD ["uv", "run", "python", "bot.py", "--transport", "webrtc", "--host", "0.0.0.0", "--port", "7860"]
