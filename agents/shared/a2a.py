"""A2A protocol helpers.

Every Atlas agent serves an A2A endpoint and can call other agents through A2A.
This module wraps the a2a-sdk so individual agents don't import it directly —
making it easy to swap implementations later.
"""
from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import Request

from .types import AgentResult

# Map of agent name → Cloud Run URL. Populated from env, overridden in local dev.
AGENT_REGISTRY: dict[str, str] = {
    "coordinator": os.environ.get("AGENT_URL_COORDINATOR", "http://localhost:8080"),
    "discovery":   os.environ.get("AGENT_URL_DISCOVERY",   "http://localhost:8081"),
    "strategy":    os.environ.get("AGENT_URL_STRATEGY",    "http://localhost:8082"),
    "designer":    os.environ.get("AGENT_URL_DESIGNER",    "http://localhost:8083"),
    "developer":   os.environ.get("AGENT_URL_DEVELOPER",   "http://localhost:8084"),
    "pm":          os.environ.get("AGENT_URL_PM",          "http://localhost:8085"),
    "account":     os.environ.get("AGENT_URL_ACCOUNT",     "http://localhost:8086"),
}


class A2AClient:
    """Client for calling another agent over A2A.

    Atlas convention: A2A handoffs always carry an `engagement_id` so the
    receiving agent can rehydrate context from Memory Bank.
    """

    def __init__(self, timeout_s: float = 180.0) -> None:
        self._http = httpx.AsyncClient(timeout=timeout_s)

    async def call(
        self,
        agent_name: str,
        engagement_id: str,
        payload: dict[str, Any],
        *,
        require_approval: bool = False,
    ) -> AgentResult:
        """Send a task to another agent and wait for its result."""
        if agent_name not in AGENT_REGISTRY:
            raise ValueError(f"Unknown agent {agent_name!r}")

        url = AGENT_REGISTRY[agent_name].rstrip("/") + "/a2a/invoke"
        response = await self._http.post(
            url,
            json={
                "engagement_id": engagement_id,
                "payload": payload,
                "require_approval": require_approval,
            },
            headers={"X-Atlas-Caller": "coordinator"},
        )
        response.raise_for_status()
        return AgentResult.model_validate(response.json())

    async def close(self) -> None:
        await self._http.aclose()


A2A_PROTOCOL_VERSION = "1.0"


class A2AServer:
    """FastAPI mountpoint helper.

    Mounts the Atlas A2A task endpoint (`POST /a2a/invoke`), a health check, and
    a spec-compliant A2A Agent Card at `GET /.well-known/agent-card.json`
    (A2A spec 1.0; see https://a2a-protocol.org). The Agent Card lets any
    A2A-aware client discover the agent's identity, transport, and skills.

    Usage in an agent:
        from agents.shared import A2AServer
        from fastapi import FastAPI

        app = FastAPI()
        A2AServer(
            app,
            handler=my_agent_invoke_handler,
            agent_name="discovery",
            description="Gathers requirements from a client brief.",
            skills=[{
                "id": "discover",
                "name": "Discovery",
                "description": "Extract goals, audience, and constraints.",
                "tags": ["intake", "requirements"],
            }],
        )
    """

    def __init__(
        self,
        app,
        handler,
        *,
        agent_name: str | None = None,
        description: str | None = None,
        skills: list[dict[str, Any]] | None = None,
        version: str = "1.0.0",
    ) -> None:
        name = agent_name or getattr(app, "title", "atlas-agent")
        desc = description or f"Atlas {name} agent."
        default_skill = {
            "id": f"{name}-task",
            "name": name.replace("-", " ").title(),
            "description": desc,
            "tags": ["atlas"],
        }
        agent_skills = skills or [default_skill]

        @app.post("/a2a/invoke")
        async def invoke(body: dict[str, Any]) -> dict[str, Any]:
            result = await handler(
                engagement_id=body["engagement_id"],
                payload=body["payload"],
                require_approval=body.get("require_approval", False),
            )
            return result.model_dump()

        @app.get("/healthz")
        async def health() -> dict[str, str]:
            return {"status": "ok"}

        def _build_card(base_url: str) -> dict[str, Any]:
            base = base_url.rstrip("/")
            return {
                "protocolVersion": A2A_PROTOCOL_VERSION,
                "name": name,
                "description": desc,
                "url": f"{base}/a2a/invoke",
                "preferredTransport": "HTTP+JSON",
                "version": version,
                "capabilities": {
                    "streaming": False,
                    "pushNotifications": False,
                    "stateTransitionHistory": False,
                },
                "defaultInputModes": ["application/json"],
                "defaultOutputModes": ["application/json"],
                "skills": agent_skills,
            }

        @app.get("/.well-known/agent-card.json")
        async def agent_card(request: Request) -> dict[str, Any]:
            # Derive the externally-visible base URL from the request so the card
            # is correct whether served locally or on Cloud Run.
            base = str(request.base_url)
            return _build_card(base)

        # Legacy discovery path some A2A clients still probe.
        @app.get("/.well-known/agent.json")
        async def agent_card_legacy(request: Request) -> dict[str, Any]:
            base = str(request.base_url)
            return _build_card(base)
