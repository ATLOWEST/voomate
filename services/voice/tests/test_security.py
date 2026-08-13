import time

import jwt
import pytest

from voomate_voice.security import redact_session_body, verify_widget_token

SECRET = "a-secure-widget-token-secret-with-32-chars"


def token(origin="http://localhost:3000"):
    now = int(time.time())
    return jwt.encode(
        {
            "agentId": "a",
            "organizationId": "o",
            "origin": origin,
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


def test_token_is_origin_bound():
    assert verify_widget_token(token(), SECRET).origin == "http://localhost:3000"


def test_insecure_remote_origin_is_rejected():
    with pytest.raises(ValueError):
        verify_widget_token(token("http://example.com"), SECRET)


def test_redaction_never_returns_credentials():
    body = {"sessionToken": "secret", "conversationId": "id", "message": "private"}
    assert redact_session_body(body) == {"hasSessionToken": True, "hasConversationId": True}
