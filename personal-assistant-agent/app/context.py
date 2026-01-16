from contextvars import ContextVar

# ContextVar to store the authentication token for the current request context.
# This allows deep access to the token (e.g., in MCP tool headers) without
# passing it through every function call.
auth_token_ctx: ContextVar[str] = ContextVar("auth_token_ctx", default="")
