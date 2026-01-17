# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import asyncio
import os
import google.auth
from a2a.server.apps import A2AFastAPIApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AuthorizationCodeOAuthFlow, OAuth2SecurityScheme, OAuthFlows
from a2a.utils.constants import (
    AGENT_CARD_WELL_KNOWN_PATH,
    EXTENDED_AGENT_CARD_PATH,
)
from fastapi import FastAPI
from google.adk.a2a.executor.a2a_agent_executor import A2aAgentExecutor
from google.adk.a2a.utils.agent_card_builder import AgentCardBuilder
from google.adk.artifacts import GcsArtifactService, InMemoryArtifactService
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.cloud import logging as google_cloud_logging

from app.agent import app as adk_app
from app.app_utils.telemetry import setup_telemetry
from app.app_utils.typing import Feedback
from app.security import AuthMiddleware

setup_telemetry()
_, project_id = google.auth.default()
logging_client = google_cloud_logging.Client()
logger = logging_client.logger(__name__)

# Artifact bucket for ADK (created by Terraform, passed via env var)
logs_bucket_name = os.environ.get("LOGS_BUCKET_NAME")
artifact_service = (
    GcsArtifactService(bucket_name=logs_bucket_name)
    if logs_bucket_name
    else InMemoryArtifactService()
)

runner = Runner(
    app=adk_app,
    artifact_service=artifact_service,
    session_service=InMemorySessionService(),
)

request_handler = DefaultRequestHandler(
    agent_executor=A2aAgentExecutor(runner=runner), task_store=InMemoryTaskStore()
)

A2A_RPC_PATH = f"/a2a/{adk_app.name}"

async def build_dynamic_agent_card() -> AgentCard:
    """Builds the Agent Card dynamically from the root_agent."""
    agent_card_builder = AgentCardBuilder(
        agent=adk_app.root_agent,
        rpc_url=f"{os.getenv('APP_URL', 'http://localhost:8001')}{A2A_RPC_PATH}",
        agent_version=os.getenv("AGENT_VERSION", "0.1.0"),
        capabilities=AgentCapabilities(streaming=True),
    )
    agent_card = await agent_card_builder.build()

    # Manually add security schemes as builder might not expose them directly yet
    if not agent_card.security_schemes:
        agent_card.security_schemes = {
             "google_oauth": OAuth2SecurityScheme(
                type="oauth2",
                description="Google OAuth 2.0",
                flows={
                    "authorizationCode": AuthorizationCodeOAuthFlow(
                        authorizationUrl="https://accounts.google.com/o/oauth2/v2/auth",
                        tokenUrl="https://oauth2.googleapis.com/token",
                        scopes={
                            "openid": "OpenID Connect",
                            "email": "Email",
                            "profile": "Profile"
                        }
                    )
                }
             )
        }
    if not agent_card.security:
        agent_card.security = [{"google_oauth": []}]

    return agent_card


@asynccontextmanager
async def lifespan(app_instance: FastAPI) -> AsyncIterator[None]:
    # Register agents on startup
    from app.agent import paa_agent

    agent_card = None
    try:
        agent_card = await build_dynamic_agent_card()
    except (Exception, asyncio.CancelledError) as e:
        print(f"Warning: Failed to build dynamic agent card on startup: {e}")
        # Build a minimal agent card so the server can still start
        from a2a.types import AgentSkill
        agent_card = AgentCard(
            name=paa_agent.name,
            display_name="Personal Assistant Agent (Limited)",
            description="The personal-assistant-agent is currently in a limited state because it couldn't connect to its tools.",
            url=f"{os.getenv('APP_URL', 'http://localhost:8001')}{A2A_RPC_PATH}",
            version=os.getenv("AGENT_VERSION", "0.1.0"),
            skills=[
                AgentSkill(
                    id="manage-links",
                    name="Manage Links",
                    description="Saving and retrieving links via the Stash service.",
                    tags=["links", "stash"]
                ),
                AgentSkill(
                    id="manage-tasks",
                    name="Manage Tasks",
                    description="Listing, creating, and updating tasks via the Todo Agent.",
                    tags=["todo", "tasks"]
                )
            ],
            defaultInputModes=["text/plain"],
            defaultOutputModes=["text/plain"],
            capabilities=AgentCapabilities(streaming=True),
            supports_authenticated_extended_card=True,
            security_schemes={
                "google_oauth": OAuth2SecurityScheme(
                    description="Google OAuth 2.0",
                    flows=OAuthFlows(
                        authorizationCode=AuthorizationCodeOAuthFlow(
                            authorization_url="https://accounts.google.com/o/oauth2/v2/auth",
                            token_url="https://oauth2.googleapis.com/token",
                            scopes={
                                 "openid": "OpenID Connect",
                                 "email": "Email",
                                 "profile": "Profile",
                            },
                        )
                    ),
                )
            },
            security=[{"google_oauth": []}],
        )

    a2a_app = A2AFastAPIApplication(
        agent_card=agent_card,
        extended_agent_card=agent_card,
        http_handler=request_handler
    )
    a2a_app.add_routes_to_app(
        app_instance,
        agent_card_url=f"{A2A_RPC_PATH}{AGENT_CARD_WELL_KNOWN_PATH}",
        extended_agent_card_url=f"{A2A_RPC_PATH}{EXTENDED_AGENT_CARD_PATH}",
        rpc_url=A2A_RPC_PATH
    )
    yield


app = FastAPI(
    title="personal-assistant-agent",
    description="API for interacting with the Agent personal-assistant-agent",
    lifespan=lifespan,
)
app.add_middleware(AuthMiddleware)


# Main execution
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
