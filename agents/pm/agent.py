"""Project Manager agent.

After Developer ships a build, PM agent:
  1. Reviews the live URL (Lighthouse, broken links, accessibility)
  2. Drafts a client-facing update for Slack
  3. Files any follow-up issues in Linear
  4. Schedules QA checkpoints

W2 deliverable — stub for now.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI

from agents.shared import A2AServer, AgentResult, MemoryBank, get_logger

log = get_logger("pm")


class PMService:
    def __init__(self) -> None:
        self.memory = MemoryBank()

    async def invoke(
        self,
        engagement_id: str,
        payload: dict[str, Any],
        require_approval: bool = False,
    ) -> AgentResult:
        # TODO (Andy, W2 Day 3): wire Slack + Linear via agency-mcp tools.
        log.info("pm.stub", engagement_id=engagement_id)
        return AgentResult(
            agent_name="pm",
            engagement_id=engagement_id,
            status="ok",
            output={"stubbed": True, "todo": "wire Slack + Linear in W2"},
            next_agent="account",
        )


service: PMService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    global service
    service = PMService()
    yield


app = FastAPI(title="Atlas PM", lifespan=lifespan)


async def _handler(
    engagement_id: str,
    payload: dict[str, Any],
    require_approval: bool = False,
) -> AgentResult:
    assert service is not None
    return await service.invoke(engagement_id, payload, require_approval)


A2AServer(app, handler=_handler)
