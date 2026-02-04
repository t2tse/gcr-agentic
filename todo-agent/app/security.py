import logging
from typing import Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse
from google.oauth2 import id_token
from google.auth.transport import requests
import os
import firebase_admin
from firebase_admin import auth as firebase_auth

from app.agent import app as adk_app
from app.context import auth_token_ctx

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
try:
    firebase_admin.initialize_app()
    logger.info("Firebase Admin SDK initialized successfully")
except ValueError:
    # Already initialized
    logger.info("Firebase Admin SDK already initialized")
except Exception as e:
    logger.error(f"Failed to initialize Firebase Admin SDK: {e}")

class AuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware that enforces Google OAuth2 authentication for A2A endpoints.
    It verifies the Bearer token and stores it in a ContextVar for downstream use.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Only enforce on A2A RPC endpoints
        if request.url.path.startswith("/a2a/"):
            # Allow OPTIONS for CORS (handled by CORSMiddleware usually, but good to be safe)
            if request.method == "OPTIONS":
                return await call_next(request)
            
            # Allow the Agent Card GET requests to be public for discovery
            if request.method == "GET":
                 return await call_next(request)

            auth_header = request.headers.get("Authorization")
            if not auth_header:
                logger.warning("Missing Authorization header")
                return JSONResponse(
                    status_code=401,
                    content={"error": "Missing Authorization header"},
                )

            if not auth_header.startswith("Bearer "):
                logger.warning("Invalid Authorization header format")
                return JSONResponse(
                    status_code=401,
                    content={"error": "Invalid Authorization header format. Expected 'Bearer <token>'"},
                )

            token = auth_header.split(" ")[1]

            user_email = None
            user_id = None

            try:
                # 1. Try Firebase ID Token verification first (for Portal)
                decoded_token = firebase_auth.verify_id_token(token)
                user_email = decoded_token.get("email")
                user_id = decoded_token.get("uid")
                logger.info(f"Authenticated via Firebase ID Token: {user_id} ({user_email})")
            except Exception as firebase_error:
                logger.debug(f"Firebase token verification failed, trying Google OAuth2: {firebase_error}")
                
                try:
                    # 2. Fall back to Google OAuth2 verification
                    client_id = os.environ.get("GOOGLE_CLIENT_ID")
                    
                    # If it looks like a JWT (3 segments), try verifying as an ID Token
                    if token.count(".") == 2:
                        id_info = id_token.verify_oauth2_token(token, requests.Request(), audience=client_id)
                    else:
                        # Otherwise, treat as an opaque Access Token and verify via tokeninfo
                        import httpx
                        async with httpx.AsyncClient() as client:
                            resp = await client.get(
                                "https://oauth2.googleapis.com/tokeninfo",
                                params={"access_token": token}
                            )
                            if resp.status_code != 200:
                                raise ValueError(f"Access token verification failed: {resp.text}")
                            id_info = resp.json()

                    user_email = id_info.get("email")
                    user_id = id_info.get("sub")
                    logger.info(f"Authenticated via Google OAuth2: {user_id} ({user_email})")
                except Exception as google_error:
                    logger.error(f"Both Firebase and Google OAuth2 verification failed. Firebase: {firebase_error}, Google: {google_error}")
                    return JSONResponse(
                        status_code=401,
                        content={"error": "Token verification failed"},
                    )

            if not user_email:
                logger.warning("Token verification passed but no email found in payload.")
                return JSONResponse(
                    status_code=401,
                    content={"error": "Invalid token payload."},
                )

            # Token is valid. Set context.
            token_reset_token = auth_token_ctx.set(token)
            try:
                response = await call_next(request)
                return response
            finally:
                auth_token_ctx.reset(token_reset_token)

        # Non-A2A paths or explicitly allowed methods
        return await call_next(request)
