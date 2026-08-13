import json
import time

import jwt
import pytest

from bot import VoiceAuthMiddleware

SECRET = "a-secure-widget-token-secret-with-32-chars"


def widget_token():
    now = int(time.time())
    return jwt.encode(
        {
            "agentId": "a",
            "organizationId": "o",
            "origin": "http://localhost:3000",
            "keyFingerprint": "f" * 16,
            "sub": "a",
            "iss": "voomate-web-agent",
            "aud": "voomate-widget",
            "iat": now,
            "exp": now + 60,
        },
        SECRET,
        algorithm="HS256",
    )


async def invoke(middleware, payload, origin="http://localhost:3000"):
    sent = []
    delivered = False

    async def receive():
        nonlocal delivered
        if delivered:
            return {"type": "http.request", "body": b"", "more_body": False}
        delivered = True
        return {
            "type": "http.request",
            "body": json.dumps(payload).encode(),
            "more_body": False,
        }

    async def send(message):
        sent.append(message)

    await middleware(
        {
            "type": "http",
            "method": "POST",
            "path": "/start",
            "headers": [(b"origin", origin.encode())],
        },
        receive,
        send,
    )
    return sent


@pytest.mark.asyncio
async def test_invalid_token_is_rejected_before_downstream(monkeypatch):
    monkeypatch.setenv("WIDGET_TOKEN_SECRET", SECRET)
    called = False

    async def app(_scope, _receive, _send):
        nonlocal called
        called = True

    sent = await invoke(VoiceAuthMiddleware(app), {"body": {"sessionToken": "invalid"}})
    assert called is False
    assert sent[0]["status"] == 401


@pytest.mark.asyncio
async def test_valid_origin_bound_token_reaches_downstream(monkeypatch):
    monkeypatch.setenv("WIDGET_TOKEN_SECRET", SECRET)
    called = False

    async def app(_scope, receive, send):
        nonlocal called
        called = True
        assert await receive()
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"{}"})

    sent = await invoke(VoiceAuthMiddleware(app), {"body": {"sessionToken": widget_token()}})
    assert called is True
    assert sent[0]["status"] == 200
