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
"""

import os
from functools import wraps

import jwt
from flask import abort, g, request

AUTH0_DOMAIN = os.environ.get("AUTH0_DOMAIN")
AUTH0_AUDIENCE = os.environ.get("AUTH0_AUDIENCE")

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
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=AUTH0_AUDIENCE,
        issuer=f"https://{AUTH0_DOMAIN}/",
    )


def load_current_user():
    """Best-effort: if a valid bearer token is present, resolve (or create)
    the local user for it and stash it on g.user. Call once per request,
    before any route runs. Never aborts - see module docstring."""
    token = _get_token_from_header()
    if not token or not AUTH0_DOMAIN or not AUTH0_AUDIENCE:
        return

    try:
        payload = _verify_token(token)
    except jwt.exceptions.PyJWTError:
        return

    from services.user_service import get_or_create_user
    g.user = get_or_create_user(payload["sub"])


def require_auth(view_func):
    """Route decorator alternative to app.py's _current_user_id(): verifies
    the bearer token and aborts 401 immediately if it's missing/invalid,
    rather than deferring to the route body to check g.user."""

    @wraps(view_func)
    def wrapper(*args, **kwargs):
        token = _get_token_from_header()
        if not token:
            abort(401, description="Missing bearer token")
        if not AUTH0_AUDIENCE:
            abort(503, description="AUTH0_AUDIENCE environment variable is not set")

        try:
            payload = _verify_token(token)
        except jwt.exceptions.PyJWTError as exc:
            abort(401, description=f"Invalid token: {exc}")

        from services.user_service import get_or_create_user
        g.user = get_or_create_user(payload["sub"])
        return view_func(*args, **kwargs)

    return wrapper
