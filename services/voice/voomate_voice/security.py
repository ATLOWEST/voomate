"""Authentication boundary for browser-to-voice sessions."""

from dataclasses import dataclass
from urllib.parse import urlparse

import jwt


@dataclass(frozen=True)
class VoiceClaims:
    agent_id: str
    organization_id: str
    origin: str
    key_fingerprint: str


def verify_widget_token(token: str, secret: str) -> VoiceClaims:
    """Verify the same short-lived, origin-bound token minted by the Next.js backend."""
    if len(secret) < 32:
        raise ValueError("WIDGET_TOKEN_SECRET must contain at least 32 characters")
    payload = jwt.decode(
        token,
        secret,
        algorithms=["HS256"],
        audience="voomate-widget",
        issuer="voomate-web-agent",
        options={"require": ["exp", "iat", "sub"]},
    )
    origin = str(payload.get("origin", ""))
    parsed = urlparse(origin)
    if parsed.scheme not in {"https", "http"} or not parsed.netloc:
        raise ValueError("Widget token contains an invalid origin")
    if parsed.scheme == "http" and parsed.hostname != "localhost":
        raise ValueError("Insecure widget origin is not allowed")
    return VoiceClaims(
        agent_id=str(payload["agentId"]),
        organization_id=str(payload["organizationId"]),
        origin=origin.lower(),
        key_fingerprint=str(payload["keyFingerprint"]),
    )


def redact_session_body(body: dict) -> dict:
    """Safe shape for logs; never return bearer credentials or customer text."""
    return {
        "hasSessionToken": bool(body.get("sessionToken")),
        "hasConversationId": bool(body.get("conversationId")),
    }
