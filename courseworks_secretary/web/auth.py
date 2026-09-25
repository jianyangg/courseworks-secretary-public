import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional


HASH_ITERATIONS = 600_000
SESSION_TTL = timedelta(days=30)


def hash_password(password: str, salt: Optional[bytes] = None) -> str:
    actual_salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), actual_salt, HASH_ITERATIONS
    )
    return "pbkdf2_sha256${}${}${}".format(
        HASH_ITERATIONS,
        _encode(actual_salt),
        _encode(digest),
    )


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations, salt, expected = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            _decode(salt),
            int(iterations),
        )
        return hmac.compare_digest(digest, _decode(expected))
    except (ValueError, TypeError):
        return False


def create_session(
    secret: str,
    now: Optional[datetime] = None,
    ttl: timedelta = SESSION_TTL,
) -> str:
    current = now or datetime.now(timezone.utc)
    expires_at = int((current + ttl).timestamp())
    payload = str(expires_at)
    signature = hmac.new(
        secret.encode("utf-8"), payload.encode("ascii"), hashlib.sha256
    ).hexdigest()
    return "{}.{}".format(payload, signature)


def verify_session(
    token: str, secret: str, now: Optional[datetime] = None
) -> bool:
    try:
        expires_at, signature = token.split(".", 1)
        expected = hmac.new(
            secret.encode("utf-8"), expires_at.encode("ascii"), hashlib.sha256
        ).hexdigest()
        current = now or datetime.now(timezone.utc)
        return hmac.compare_digest(signature, expected) and int(expires_at) > int(
            current.timestamp()
        )
    except (AttributeError, ValueError):
        return False


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
