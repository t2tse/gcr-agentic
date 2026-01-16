# A2A Test Client

A simple, standalone Python client for testing Agent-to-Agent (A2A) communication with an Agent exposed as an A2A Server.

## Features

- **Google OAuth 2.0 Authentication**: Authenticates users to obtain a valid Bearer token.
- **Interactive Chat**: Connects to the local A2A Agent and supports conversational testing.
- **A2A Protocol Support**: Uses `a2a-sdk` to send valid A2A messages and handle agent responses.

## Prerequisites

- Python 3.14+
- `uv` (recommended for dependency management) or `pip`
- Google Cloud Project with OAuth 2.0 Credentials

## Setup

1.  **Install Dependencies:**
    ```bash
    uv pip install -r requirements.txt
    ```

2.  **Configure OAuth:**
    - Place your `client_secret.json` file in this directory.
    - Ensure your Google Cloud OAuth Client is configured with the following Redirect URI:
      - `http://localhost:7777/oauth/callback`

## Configuration

You can configure the client using environment variables:

- `AGENT_URL`: URL of the A2A Agent (default: `http://localhost:8000/a2a/app`)
- `REDIRECT_PORT`: Port for local OAuth callback server (default: `7777`)
- `REDIRECT_PATH`: Path for OAuth callback (default: `/oauth/callback`)
- `SCOPES`: Comma-separated list of OAuth scopes (default: email, openid, profile)

Example:
```bash
AGENT_URL=http://myapp.com/a2a/app REDIRECT_PORT=8080 uv run client.py
```

## Usage

1.  **Run the Client:**
    ```bash
    uv run client.py
    ```

2.  **Authenticate:**
    - The client will launch a browser window. Sign in with your Google account.
    - A local server on port 7777 handles the callback.

3.  **Chat:**
    - Once connected, type messages to interact with the agent.
    - Example prompts:
      - "What time is it?"
      - "what can you help me with?"
    - **Commands**:
      - `/card`: Fetch and display the public Agent Card.
      - `/extended`: Fetch and display the authenticated Extended Agent Card.
      - `/help`: Show available commands.
    - Type `exit` or press `Ctrl+C` to quit.

## Troubleshooting

- **Connection Refused**: Ensure the A2A Agent is running at `http://localhost:8000/a2a/app`.
- **400/401 Errors**: Check that your `client_secret.json` is valid and the user has permission to access the agent.
