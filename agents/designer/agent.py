"""Designer agent.

Reads the Plan from Strategy and produces concrete design tokens + a Lovable
design addendum that the Developer agent appends to its build prompt.
Image generation (Gemini 3 Image) is W2.
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from google.adk.agents import LlmAgent
from pydantic import BaseModel

from agents.shared import A2AServer, AgentResult, MemoryBank, get_logger, setup_tracing

log = get_logger("designer")
tracer = setup_tracing("atlas-designer")


class DesignSpec(BaseModel):
    primary_color: str            # hex, e.g. "#1a1a2e"
    secondary_color: str
    accent_color: str
    font_heading: str             # e.g. "Geist, sans-serif"
    font_body: str
    visual_mood: str              # 1–2 sentences describing the feel
    layout_description: str       # paragraph describing key layout decisions
    lovable_design_addendum: str  # design brief to append to the Lovable prompt


designer_agent = LlmAgent(
    name="designer",
    model=os.environ.get("GEMINI_MODEL_FLASH", "gemini-2.5-flash"),
    instruction=(
        "You are the Designer agent for Atlas. Given a strategy Plan, produce concrete "
        "design decisions: colour palette (hex codes), typography stack, layout approach, "
        "and visual mood. Then write `lovable_design_addendum` — a focused 100-200 word "
        "design brief to append to the Lovable Build-with-URL prompt. Be highly specific: "
        "name exact fonts, hex codes, spacing values, component styles. Align everything "
        "tightly with the `visual_direction` in the strategy plan."
    ),
    output_schema=DesignSpec,
)


class DesignerService:
    def __init__(self) -> None:
        self.memory = MemoryBank()

    async def invoke(
        self,
        engagement_id: str,
        payload: dict[str, Any],
        require_approval: bool = False,
    ) -> AgentResult:
        with tracer.start_as_current_span("designer.invoke") as span:
            span.set_attribute("engagement_id", engagement_id)

            plan = await self.memory.recall(engagement_id, "plan")
            if not plan:
                plan = {k: v for k, v in payload.items() if k != "engagement_id"}

            response = await designer_agent.run(
                f"Strategy plan:\n{plan}\n\nProduce the DesignSpec."
            )

            if response.output is None:
                log.warning("designer.no_output", engagement_id=engagement_id)
                return AgentResult(
                    agent_name="designer",
                    engagement_id=engagement_id,
                    status="error",
                    output={},
                    error_message="Designer agent returned no structured output.",
                )

            spec: DesignSpec = response.output
            await self.memory.remember(engagement_id, "design", spec.model_dump())

            log.info("designer.complete", engagement_id=engagement_id)
            return AgentResult(
                agent_name="designer",
                engagement_id=engagement_id,
                status="ok",
                output=spec.model_dump(),
                next_agent="developer",
            )


service: DesignerService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    global service
    service = DesignerService()
    log.info("designer.started")
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
