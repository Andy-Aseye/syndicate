"""Designer agent.

Calls Nano Banana Pro for hero imagery + lookbook, extracts design tokens
(palette, type scale, spacing) from the Plan, and writes them back to memory
so the Developer agent can feed them into Lovable.

W2 deliverable — stub for now.
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI

from agents.shared import A2AServer, AgentResult, MemoryBank, get_logger

log = get_logger("designer")


class DesignerService:
    def __init__(self) -> None:
        self.memory = MemoryBank()

    async def invoke(
        self,
        engagement_id: str,
        payload: dict[str, Any],
        require_approval: bool = False,
    ) -> AgentResult:
        # TODO (Andy, W2 Day 1): wire to Nano Banana Pro (gemini-3.0-flash-image-preview)
        # via Vertex AI. For W1 we return an empty stub so the pipeline runs end-to-end.
        log.info("designer.stub", engagement_id=engagement_id)
        await self.memory.remember(
            engagement_id, "design", {"status": "stubbed_for_w1"}
        )
        return AgentResult(
            agent_name="designer",
            engagement_id=engagement_id,
            status="ok",
            output={"stubbed": True, "todo": "wire nano-banana-pro in W2"},
            next_agent="developer",
        )


service: DesignerService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    global service
    service = DesignerService()
    yield


app = FastAPI(title="Atlas Designer", lifespan=lifespan)


async def _handler(
    engagement_id: str,
    payload: dict[str, Any],
    require_approval: bool = False,
) -> AgentResult:
    assert service is not None
    return await service.invoke(engagement_id, payload, require_approval)


A2AServer(app, handler=_handler)
