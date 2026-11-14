"""Delete my account (#213, S5-MA): a signed-in user deletes their own account and their data.

The caller is always the session user: there is no user-id parameter, so nobody can delete
someone else. Admin accounts are refused (409): the catalog is admin-curated since #195, so an
admin must lose the flag first, in Supabase, on purpose.

Order matters. The user's rows are removed first, then the Supabase Auth user:
- If a row delete fails, nothing else is touched and the account still works (503, retry).
- If the Auth delete fails after the rows are gone, the user is left with a working, empty
  account (503, retry). Every step is safe to repeat, so a retry finishes the job.
`user_id` columns have no foreign key to auth.users, so nothing removes these rows by itself.

What happens to each table:
- user_gadgets (My Gadgets list): deleted.
- user_questions (per-gadget AI conversation, #210): deleted.
- spec_corrections: the user's pending suggestions are deleted. Approved and rejected ones
  stay, because an approved one already changed the spec text and the row is the audit trail,
  but their submitter is replaced by the all-zero UUID so they no longer point to a person.
- query_history is anonymous (no user id), so it is not touched.

The "current password" check and the confirmation live in the frontend (Account page), as for
Change Password. This route trusts the session, like every other /me route.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from auth import get_current_user
from rate_limit import limiter
from supabase_client import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/me/account", tags=["my-account"])

# Replaces submitted_by on corrections that stay after their author is deleted.
ANONYMOUS_SUBMITTER = "00000000-0000-0000-0000-000000000000"

DETAIL_ADMIN = "Admin accounts can't be deleted here. Ask the project owner to remove the admin role first."
DETAIL_FAILED = "Couldn't delete your account right now. Nothing more was changed; try again in a moment."


def _delete_rows(user_id: str) -> None:
    supabase.table("user_gadgets").delete().eq("user_id", user_id).execute()
    supabase.table("user_questions").delete().eq("user_id", user_id).execute()
    supabase.table("spec_corrections").delete().eq("submitted_by", user_id).eq("status", "pending").execute()
    supabase.table("spec_corrections").update({"submitted_by": ANONYMOUS_SUBMITTER}).eq("submitted_by", user_id).execute()


@router.delete("", status_code=204)
@limiter.limit("5/hour")
def delete_my_account(request: Request, user=Depends(get_current_user)):
    """Delete the caller's rows, then the caller's Supabase Auth user. Returns 204."""
    uid = str(user.id)
    if (getattr(user, "app_metadata", None) or {}).get("is_admin"):
        raise HTTPException(status_code=409, detail=DETAIL_ADMIN)
    try:
        _delete_rows(uid)
        supabase.auth.admin.delete_user(uid)
    except Exception as exc:
        # The user id is not logged: it would link the failure to a person for no benefit.
        logger.warning("Account delete failed: %s", type(exc).__name__, exc_info=True)
        raise HTTPException(status_code=503, detail=DETAIL_FAILED) from None
    logger.info("Account deleted by its owner")
    return Response(status_code=204)
