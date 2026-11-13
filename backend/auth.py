import logging

from fastapi import Depends, Header, HTTPException
from supabase_auth.errors import AuthApiError, AuthInvalidJwtError, AuthSessionMissingError

from supabase_client import supabase

logger = logging.getLogger(__name__)

DETAIL_SESSION_INVALID = "Invalid or expired session"
DETAIL_AUTH_UNAVAILABLE = "Sign-in check is temporarily unavailable. Please try again."


def _is_rejected_token(exc: Exception) -> bool:
    """True when Supabase Auth looked at the token and refused it (bad, expired or revoked).

    AuthApiError carries the HTTP status Supabase answered with: a 4xx is a verdict on the
    token, a 5xx is Supabase failing. Network errors, timeouts and Cloudflare 52x arrive as
    AuthRetryableError (or a plain httpx error) and are NOT a rejection.
    """
    if isinstance(exc, (AuthInvalidJwtError, AuthSessionMissingError)):
        return True
    if isinstance(exc, AuthApiError):
        status = getattr(exc, "status", None)
        return isinstance(status, int) and 400 <= status < 500
    return False


def get_current_user(authorization: str | None = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Login required")
    token = authorization.split(" ", 1)[1]
    try:
        response = supabase.auth.get_user(token)
    except Exception as exc:
        if _is_rejected_token(exc):
            raise HTTPException(status_code=401, detail=DETAIL_SESSION_INVALID) from None
        # An outage must not look like "you are signed out": the frontend would drop a valid
        # session. Only the exception type is logged, never the token or the message.
        logger.warning("Supabase sign-in check failed: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail=DETAIL_AUTH_UNAVAILABLE) from None
    if not response or not response.user:
        raise HTTPException(status_code=401, detail=DETAIL_SESSION_INVALID)
    return response.user


def get_current_admin_user(user=Depends(get_current_user)):
    """Like get_current_user, but also requires app_metadata.is_admin.

    app_metadata (unlike user_metadata) can only be set via the Supabase
    admin API using the service-role key — a signed-up user can never set
    this on themselves, so it's safe to trust as a role flag.
    """
    if not (user.app_metadata or {}).get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def get_optional_user(authorization: str | None = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        return supabase.auth.get_user(token).user
    except Exception:
        return None
