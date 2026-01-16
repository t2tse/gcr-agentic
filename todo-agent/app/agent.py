import os
import google.auth
from typing import Any, Iterator
from google.adk.agents import Agent
from google.adk.apps.app import App
from google.adk.models import Gemini
from google.adk.tools import McpToolset
from google.adk.tools.mcp_tool import StreamableHTTPConnectionParams
from google.genai import types

from app.context import auth_token_ctx
from app.tools import get_current_time

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

checkmate_mcp_url = os.environ.get("CHECKMATE_MCP_URL")

# Initialize MCP Toolset
# Initialize MCP Toolset with dynamic headers
checkmate_connection_params = StreamableHTTPConnectionParams(
    url=checkmate_mcp_url,
)
checkmate_tools = McpToolset(
    connection_params=checkmate_connection_params,
    header_provider=get_auth_headers
)

todo_agent = Agent(
    name="todo_agent",
    model=Gemini(
        model=os.environ.get("MODEL", "gemini-3-flash-preview"),
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    description="A specialist agent for managing to-do lists and tasks. It can create, update, list, and delete tasks and task lists.",
    instruction="""
    You are the Todo Agent, a specialist for managing the user's personal tasks and lists via the Checkmate service.

    ### Capabilities
    You interact with the Checkmate personal task manager using the provided MCP tools.
    - Tasks: list, create, update, delete.
    - Lists: list, create.

    ### Critical Rules
    1. **Contextual Awareness**: Always check the current time helpers to resolve relative dates (e.g., "tomorrow", "next Friday").
    2. **List Resolution**:
        - Users may refer to lists by name (e.g., "Groceries").
        - The default list is 'Inbox' (implied if no list is specified or found).
        - If a user wants to add to a specific named list, try to find it first. If confident it doesn't exist, you can create it or ask for confirmation.
    3. **Priority Inference**:
        - Infer priority (HIGH, MEDIUM, LOW) from context (e.g., "urgent" -> HIGH).
        - Default to LOW or MEDIUM if neutral.
    4. **Output**:
        - **Always Confirm**: Explicitly confirm to the user when an action (create, update, delete) is completed successfully. Do not rely on tool results alone; the user must see a verbal confirmation.
        - If listing tasks, present them clearly.

    ### Tools
    - Use `get_current_time` to understand "now" and calculate relative dates.
    - Use MCP tools for all Checkmate interactions.
    """,
    tools=[get_current_time, checkmate_tools]
)

app = App(root_agent=todo_agent, name="app")
