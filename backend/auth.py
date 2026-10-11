from fastapi import Depends, Header, HTTPException

from supabase_client import supabase


def get_current_user(authorization: str | None = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Login required")
    token = authorization.split(" ", 1)[1]
    try:
        response = supabase.auth.get_user(token)
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        return response.user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session")


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