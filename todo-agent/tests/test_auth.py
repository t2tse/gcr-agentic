import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.fast_api_app import app, A2A_RPC_PATH

client = TestClient(app)
ENDPOINT = A2A_RPC_PATH

def test_missing_auth_header():
    """Verify that requests without Authorization header return 401."""
    # Middleware intercepts before routing, so path existence matters less for 401
    response = client.post(ENDPOINT, json={"method": "foo"})
    assert response.status_code == 401
    assert "Missing Authorization header" in response.json()["error"]

def test_invalid_bearer_format():
    """Verify that requests with malformed Authorization header return 401."""
    response = client.post(
        ENDPOINT, 
        json={"method": "foo"},
        headers={"Authorization": "Basic user:pass"}
    )
    assert response.status_code == 401
    assert "Invalid Authorization header format" in response.json()["error"]

@patch("app.security.id_token.verify_oauth2_token")
@patch("app.security.auth_token_ctx") 
def test_valid_auth_token(mock_ctx, mock_verify):
    """Verify that valid tokens set the context variable and proceed."""
    mock_verify.return_value = {"email": "test@example.com"}
    
    # We expect the middleware to call auth_token_ctx.set("valid-token")
    # And then call app (which returns 404 because path doesn't exist)
    # And then call auth_token_ctx.reset(...)
    
    response = client.post(
        ENDPOINT, 
        json={"method": "foo"},
        headers={"Authorization": "Bearer valid-token"}
    )
    
    # We expect 404 because the path doesn't actually exist in the router map yet
    # (or it's dynamic). But NOT 401. 401 would mean auth failed.
    assert response.status_code == 404 
    
    mock_verify.assert_called_once()
    mock_ctx.set.assert_called_with("valid-token")
    mock_ctx.reset.assert_called()

def test_public_endpoints_bypass_auth():
    """Verify that GET requests (for Agent Card) bypass auth."""
    # This shouldn't be 401. 
    response = client.get(ENDPOINT)
    assert response.status_code != 401
