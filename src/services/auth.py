"""Auth0 JWT verification.

Frontend logs the user in via Auth0 and attaches the resulting access token
to every API request as `Authorization: Bearer <token>`. Flask never sees a
password - it just verifies the token was really issued by our Auth0 tenant,
for this API, and hasn't expired, then reads the user's stable Auth0 id
(the `sub` claim) off it.
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


def require_auth(view_func):
    """Route decorator: verifies the bearer token and sets g.user_id (the
    Auth0 `sub` claim) before calling the view. Aborts with 401 otherwise."""

    @wraps(view_func)
    def wrapper(*args, **kwargs):
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
