import os
import google.auth
import httpx
from typing import Any
from google.adk.agents import Agent
from google.adk.apps.app import App
from google.adk.models import Gemini
from google.adk.tools import McpToolset
from google.adk.tools.mcp_tool import StreamableHTTPConnectionParams
from google.genai import types

from google.adk.agents.remote_a2a_agent import RemoteA2aAgent
from a2a.client import ClientFactory, ClientConfig, ClientCallInterceptor, Consumer
from a2a.client.client import Client
from a2a.client.auth import AuthInterceptor
from a2a.types import AgentCard
from typing import Optional

from app.context import auth_token_ctx
from app.tools import get_current_time
from app.security import ForwardingCredentialService

def get_auth_headers(context: Any) -> dict[str, str]:
    """Retrieve auth headers from the current context variable."""
    token = auth_token_ctx.get()
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}

_, project_id = google.auth.default()
os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"

stash_mcp_url = os.environ.get("STASH_MCP_URL")
todo_agent_url = os.environ.get("TODO_AGENT_URL")

# Initialize Stash MCP Toolset
stash_connection_params = StreamableHTTPConnectionParams(
    url=stash_mcp_url,
)
stash_tools = McpToolset(
    connection_params=stash_connection_params,
    header_provider=get_auth_headers
)

class AuthenticatedClientFactory(ClientFactory):
    def __init__(
        self,
        config: ClientConfig,
        interceptors: list[ClientCallInterceptor],
        consumers: Optional[list[Consumer]] = None,
    ):
        super().__init__(config=config, consumers=consumers)
        self._interceptors = interceptors

    def create(
        self,
        card: AgentCard,
        consumers: Optional[list[Consumer]] = None,
        interceptors: Optional[list[ClientCallInterceptor]] = None,
        extensions: Optional[list[str]] = None,
    ) -> Client:
        # Inject our auth interceptor into the list
        combined_interceptors = (interceptors or []) + self._interceptors
        print(f"[DEBUG] AuthenticatedClientFactory.create: Injecting interceptors. Total count: {len(combined_interceptors)}")
        return super().create(card, consumers, combined_interceptors, extensions)


# Initialize Todo Agent Remote Agent
credential_service = ForwardingCredentialService(header_provider=get_auth_headers)
auth_interceptor = AuthInterceptor(credential_service)

# Use our custom factory to ensure interceptor is used
a2a_client_factory = AuthenticatedClientFactory(
    config=ClientConfig(),
    interceptors=[auth_interceptor]
)

# Create a shared httpx client to prevent RemoteA2aAgent from overwriting our factory
async_client = httpx.AsyncClient()

todo_agent_remote = RemoteA2aAgent(
    name="todo_agent",
    description="Dedicated agent for managing tasks, reminders, and to-do lists.",
    agent_card=f"{todo_agent_url}/.well-known/agent-card.json",
    a2a_client_factory=a2a_client_factory,
    httpx_client=async_client
)

paa_agent = Agent(
    name="personal_assistant_agent",
    model=Gemini(
        model=os.environ.get("MODEL", "gemini-3-flash-preview"),
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    description="The primary personal assistant. It can save links, manage tasks, and coordinate complex requests involving multiple services.",
    instruction="""
    You are the Personal Assistant Agent (PAA), the root orchestrator for the user's personal microsystem.

    ### Capabilities
    1. **Stash (Link Management)**:
        - Use `StashMcp` tools to save links, retrieve saved links, and get stats.
        - Prioritize saving links when the user asks to "save", "bookmark", or "stash" a URL.
    2. **Todo Agent (Task Management)**:
        - Delegate task-related requests (reminders, to-do lists, shopping lists) to the 'todo_agent' sub-agent.
        - Provide clear instructions for the sub-agent (e.g., "Add 'Buy milk' to the Groceries list due tomorrow").

    ### Orchestration Strategies
    - **Single Intent**: Route directly to the relevant tool.
        - "Save this link" -> Stash.
        - "Remind me to call Customer A" -> Delegate to 'todo_agent'.
    - **Hybrid Intent**: Break down the request and execute in logical order.
        - "Save this article and remind me to read it weekend" -> 
            1. Save to Stash (get title/metadata).
            2. Delegate to 'todo_agent' with the specific task details (using the title from Stash if available).

    ### Critical Rules
    - **Acknowledge Delegation**: Before delegating a task to the 'todo_agent', always provide a brief acknowledgment to the user (e.g., "I'll ask the Todo agent to handle that for you.").
    - **Credential Forwarding**: You automatically forward the user's auth context. Do not ask for credentials.
    - **Resilience**: If a tool fails, inform the user gracefully.
    """,
    tools=[get_current_time, stash_tools],
    sub_agents=[todo_agent_remote]
)

app = App(root_agent=paa_agent, name="app")
