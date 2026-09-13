"""Auth0 JWT verification.

Frontend logs the user in via Auth0 and attaches the resulting access token
to every API request as `Authorization: Bearer <token>`. Flask never sees a
password - it just verifies the token was really issued by our Auth0 tenant,
for this API, and hasn't expired, then reads the user's stable Auth0 id
(the `sub` claim) off it and resolves/creates the matching local User row.

`load_current_user()` runs on every request (see app.py's before_request) and
is best-effort: a missing or invalid token just leaves `g.user` unset, it
never aborts. Enforcement happens per-route via app.py's `_current_user_id()`,
which aborts 401 if `g.user` isn't a real, persisted user - that's what lets
public routes (health, categories) work with no token at all, while item/
achievement routes require one.

With no Auth0 tenant configured (AUTH0_DOMAIN/AUTH0_AUDIENCE unset), there's
nothing to verify a token against, so local dev runs unauthenticated as a
single fixed user instead of every request failing. Setting both env vars
turns real verification back on with no other code change.
"""

import logging
import os
from functools import wraps

import jwt
from flask import abort, g, request

AUTH0_DOMAIN = os.environ.get("AUTH0_DOMAIN")
AUTH0_AUDIENCE = os.environ.get("AUTH0_AUDIENCE")

AUTH_DISABLED = not (AUTH0_DOMAIN and AUTH0_AUDIENCE)
DEV_AUTH0_ID = "local-dev"

# Running unauthenticated is expected on a laptop and worth shouting about on a
# deployed host, so the warning is scoped to where it actually matters. (It has
# to go to stderr directly: this module is imported before initialize_logging()
# runs, so the file handler doesn't exist yet.)
if AUTH_DISABLED and any(key.startswith("RAILWAY") for key in os.environ):
    logging.getLogger(__name__).warning(
        "AUTH0_DOMAIN/AUTH0_AUDIENCE are not set - API routes are UNAUTHENTICATED "
        "and every request is treated as the same local user (%r).",
        DEV_AUTH0_ID,
    )

_jwks_client = None


def _get_jwks_client():
    global _jwks_client
    if _jwks_client is None:
        if not AUTH0_DOMAIN:
            raise RuntimeError("AUTH0_DOMAIN environment variable is not set")
        _jwks_client = jwt.PyJWKClient(f"https://{AUTH0_DOMAIN}/.well-known/jwks.json")
    return _jwks_client


def _get_token_from_header():
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    return header[len("Bearer "):].strip()


def _verify_token(token):
    """Decode+verify a bearer token, returning its payload. Raises PyJWTError."""
    signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
    payload = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=AUTH0_AUDIENCE,
        issuer=f"https://{AUTH0_DOMAIN}/",
        options={"require": ["exp", "sub"]},
    )
    if not isinstance(payload["sub"], str) or not payload["sub"].strip():
        raise jwt.InvalidTokenError("Token subject must be a non-empty string")
    return payload


def load_current_user():
    """Best-effort: resolve (or create) the local user for this request and
    stash it on g.user. Call once per request, before any route runs. Never
    aborts - see module docstring.

    With AUTH_DISABLED, every request resolves to the same fixed local user
    with no token needed. Otherwise a missing/invalid bearer token just
    leaves g.user unset.
    """
    from services.user_service import get_or_create_user

    if AUTH_DISABLED:
        g.user = get_or_create_user(DEV_AUTH0_ID)
        return

    token = _get_token_from_header()
    if not token:
        return

    try:
        payload = _verify_token(token)
    except jwt.exceptions.PyJWTError:
        return

    g.user = get_or_create_user(payload["sub"])


def require_auth(view_func):
    """Route decorator alternative to app.py's _current_user_id(): verifies
    the bearer token (or resolves the fixed dev user, if AUTH_DISABLED) and
    aborts 401 immediately if authentication fails, rather than deferring to
    the route body to check g.user."""

    @wraps(view_func)
    def wrapper(*args, **kwargs):
        from services.user_service import get_or_create_user

        if AUTH_DISABLED:
            g.user = get_or_create_user(DEV_AUTH0_ID)
            return view_func(*args, **kwargs)

        token = _get_token_from_header()
        if not token:
            abort(401, description="Missing bearer token")
        if not AUTH0_AUDIENCE:
            abort(503, description="AUTH0_AUDIENCE environment variable is not set")

        try:
            payload = _verify_token(token)
        except jwt.exceptions.PyJWTError as exc:
            abort(401, description=f"Invalid token: {exc}")

        g.user = get_or_create_user(payload["sub"])
        return view_func(*args, **kwargs)

    return wrapper
