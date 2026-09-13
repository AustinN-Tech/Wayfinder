"""Auth0 JWT verification.

Frontend logs the user in via Auth0 and attaches the resulting access token
to every API request as `Authorization: Bearer <token>`. Flask never sees a
password - it just verifies the token was really issued by our Auth0 tenant,
for this API, and hasn't expired, then reads the user's stable Auth0 id
(the `sub` claim) off it.
"""

import logging
import os
from functools import wraps

import jwt
from flask import abort, g, request

AUTH0_DOMAIN = os.environ.get("AUTH0_DOMAIN")
AUTH0_AUDIENCE = os.environ.get("AUTH0_AUDIENCE")

# With no Auth0 tenant configured there is nothing to verify a token against, so
# local dev runs unauthenticated as a single fixed user. Setting AUTH0_DOMAIN and
# AUTH0_AUDIENCE turns real verification back on with no other change.
AUTH_DISABLED = not (AUTH0_DOMAIN and AUTH0_AUDIENCE)
DEV_USER_ID = "local-dev"

# Running unauthenticated is expected on a laptop and worth shouting about on a
# deployed host, so the warning is scoped to where it actually matters. (It has
# to go to stderr directly: this module is imported before initialize_logging()
# runs, so the file handler doesn't exist yet.)
if AUTH_DISABLED and any(key.startswith("RAILWAY") for key in os.environ):
    logging.getLogger(__name__).warning(
        "AUTH0_DOMAIN/AUTH0_AUDIENCE are not set - API routes are UNAUTHENTICATED "
        "and every request is treated as user %r.",
        DEV_USER_ID,
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


def require_auth(view_func):
    """Route decorator: verifies the bearer token and sets g.user_id (the
    Auth0 `sub` claim) before calling the view. Aborts with 401 otherwise."""

    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if AUTH_DISABLED:
            g.user_id = DEV_USER_ID
            return view_func(*args, **kwargs)

        token = _get_token_from_header()
        if not token:
            abort(401, description="Missing bearer token")
        if not AUTH0_AUDIENCE:
            abort(503, description="AUTH0_AUDIENCE environment variable is not set")

        try:
            signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=AUTH0_AUDIENCE,
                issuer=f"https://{AUTH0_DOMAIN}/",
            )
        except jwt.exceptions.PyJWTError as exc:
            abort(401, description=f"Invalid token: {exc}")

        g.user_id = payload["sub"]
        return view_func(*args, **kwargs)

    return wrapper
