import asyncio
import os
import httpx
import json
import webbrowser
import uuid
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# SDK imports
from a2a.client.client_factory import ClientFactory
from a2a.client.client import ClientConfig
from a2a.types import Message, Part, TextPart, Role
from a2a.utils.message import get_message_text

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/userinfo.email", "openid", "https://www.googleapis.com/auth/userinfo.profile"]
AGENT_URL = "http://localhost:8000/a2a/app"
REDIRECT_PORT = 7777
REDIRECT_PATH = "/oauth/callback"
REDIRECT_URI = f"http://localhost:{REDIRECT_PORT}{REDIRECT_PATH}"

def get_credentials():
    creds = None
    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                "client_secret.json", SCOPES
            )
            # Custom OAuth flow to support specific Redirect URI path
            flow.redirect_uri = REDIRECT_URI
            
            auth_url, _ = flow.authorization_url(prompt='consent')
            print(f"Please visit this URL to authorize this application: {auth_url}")
            webbrowser.open(auth_url)

            code = None
            
            class OAuthHandler(BaseHTTPRequestHandler):
                def do_GET(self):
                    nonlocal code
                    if self.path.startswith(REDIRECT_PATH):
                        query = urlparse(self.path).query
                        params = parse_qs(query)
                        code = params.get('code', [None])[0]
                        
                        self.send_response(200)
                        self.send_header('Content-type', 'text/html')
                        self.end_headers()
                        self.wfile.write(b"<html><body><h1>Authorization successful for the A2A test client!</h1><p>You can close this window now.</p></body></html>")
                    else:
                        self.send_response(404)
                        self.end_headers()
                
                def log_message(self, format, *args):
                    pass # Suppress server logs

            server = HTTPServer(('localhost', REDIRECT_PORT), OAuthHandler)
            print(f"Waiting for callback on {REDIRECT_URI}...")
            
            # Retrieve the code
            while code is None:
                server.handle_request()
            
            server.server_close()
            
            flow.fetch_token(code=code)
            creds = flow.credentials

        with open("token.json", "w") as token:
            token.write(creds.to_json())
    return creds

async def main():
    print("Starting A2A Client...")
    
    # 1. Authenticate with Google
    try:
        creds = get_credentials()
        # Verify valid after retrieval/refresh
        if not creds.valid:
             creds.refresh(Request())
             # Save refreshed token
             with open("token.json", "w") as token:
                token.write(creds.to_json())
                
        print(f"Google OAuth 2.0 Authenticated as: {creds.token[:10]}...") 
    except Exception as e:
        print(f"Authentication failed: {e}")
        return

    # 2. Connect to Agent using ClientFactory
    print(f"Connecting to agent at {AGENT_URL}...")
    try:
        httpx_client = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {creds.token}"},
            timeout=30.0
        )
        
        client_config = ClientConfig(httpx_client=httpx_client)
        client = await ClientFactory.connect(AGENT_URL, client_config=client_config)
        print("Connected to agent!")
    except Exception as e:
        print(f"Failed to connect to agent: {e}")
        import traceback
        traceback.print_exc()
        return

    # 3. Chat Loop
    print("\n--- Chat Started (type 'exit' to quit) ---\n")
    while True:
        try:
            user_input = input("You: ")
            if user_input.lower() in ["exit", "quit"]:
                break
        except KeyboardInterrupt:
            break
            
        try:
            if not user_input.strip():
                continue

            msg = Message(
                role=Role.user,
                parts=[Part(root=TextPart(text=user_input))],
                message_id=str(uuid.uuid4())
            )
            
            print("Agent: ", end="", flush=True)
            async for event in client.send_message(request=msg):
                # print(f"DEBUG: {type(event)} {event}")
                if isinstance(event, Message):
                    text = get_message_text(event)
                    print(text, end="")
                elif isinstance(event, tuple):
                     task, update = event
                     if update and hasattr(update, 'status'):
                         print(f"\n[Status: {update.status.state.value}]", end="", flush=True)
                         if update.status.message:
                             text = get_message_text(update.status.message)
                             print(f"\n{text}", end="", flush=True)
            print() 
            
        except KeyboardInterrupt:
            break
        except Exception as e:
             print(f"\nError sending message: {e}")
             import traceback
             traceback.print_exc()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nGoodbye!")
