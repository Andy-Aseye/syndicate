"""Shared types across all Atlas agents.

These are the contracts that A2A handoffs serialize over the wire.
Keep them stable — changes here ripple through every agent.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class EngagementPhase(str, Enum):
    """The lifecycle phase of a single client engagement."""

    INTAKE = "intake"                  # Discovery agent is gathering requirements
    STRATEGY = "strategy"              # Strategy agent is producing plan/positioning
    DESIGN = "design"                  # Designer agent is producing brand + imagery
    BUILD = "build"                    # Developer agent is calling Lovable
    REVIEW = "review"                  # PM agent is gating client communications
    LAUNCH = "launch"                  # Site is deploying / launching
    OPERATE = "operate"                # Account agent is in post-launch ops
    PAUSED = "paused"                  # Awaiting human-in-the-loop approval
    ARCHIVED = "archived"              # Done


class ClientChannel(str, Enum):
    """How the client originally contacted us."""

    VOICE = "voice"
    SLACK = "slack"
    WEB_FORM = "web_form"
    EMAIL = "email"


class Engagement(BaseModel):
    """A single client engagement — the unit of work Atlas tracks end-to-end."""

    id: str
    tenant_id: str                                       # Agency owner / Atlas user
    client_name: str
    client_email: str | None = None
    client_company: str | None = None
    channel: ClientChannel
    phase: EngagementPhase = EngagementPhase.INTAKE
    brief: str = ""                                      # Free-form intake summary
    requirements: dict[str, Any] = Field(default_factory=dict)
    artifacts: dict[str, str] = Field(default_factory=dict)   # url-typed artifact refs
    lovable_project_id: str | None = None
    deployed_url: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AgentResult(BaseModel):
    """Standard envelope every agent returns over A2A.

    Carries: the structured output, the next agent in the graph (if known),
    and observability metadata that Coordinator persists for the dashboard.
    """

    agent_name: str
    engagement_id: str
    status: Literal["ok", "needs_input", "error", "complete"]
    output: dict[str, Any]
    next_agent: str | None = None
    requires_human_approval: bool = False
    cost_usd: float | None = None
    latency_ms: int | None = None
    trace_id: str | None = None
    error_message: str | None = None
