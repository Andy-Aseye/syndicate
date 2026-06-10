"""Strategy agent.

Reads the Requirements produced by Discovery, produces a Plan (positioning,
information architecture, build scope, timeline, budget) that downstream
agents (Designer, Developer) execute against.
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from google.adk.agents import LlmAgent
from pydantic import BaseModel

from agents.shared import (
    A2AServer,
    AgentResult,
    MemoryBank,
    get_logger,
    run_agent,
    setup_tracing,
)

log = get_logger("strategy")
tracer = setup_tracing("atlas-strategy")


class Plan(BaseModel):
    positioning: str                      # one-paragraph brand positioning statement
    target_persona: str                   # who we're really building for
    information_architecture: list[str]   # ordered list of pages/sections
    key_components: list[str]             # hero, product grid, testimonial slider, etc.
    visual_direction: str                 # palette, typography, vibe
    build_scope_lovable_prompt: str       # the prompt we'll feed Lovable Build-with-URL
    estimated_hours: float
    estimated_cost_usd: float
    timeline_days: int
    risks: list[str]


strategy_agent = LlmAgent(
    name="strategy",
    model=os.environ.get("GEMINI_MODEL_PRO", "gemini-2.5-pro"),
    instruction=(
        "You are the Strategy agent for Atlas. Given a client's Requirements, "
        "produce a concrete Plan that the Designer and Developer agents can execute. "
        "Specifically: write `build_scope_lovable_prompt` as a 200-400 word, highly "
        "specific prompt that Lovable's Build-with-URL API will turn into a working site. "
        "CRITICAL: Inject Awwwards-Level Premium UI Architecture into the Lovable prompt: "
        "1. PALETTE: Strict high-contrast minimalist base. Deep ink-blacks (#0B0B0C) and pristine whites. Use one ultra-premium accent color EXCLUSIVELY for active states/micro-elements. "
        "2. TYPOGRAPHY: Heavy, tightly-tracked uppercase geometric sans-serif for headers. Pair with a clean monospaced font (like JetBrains Mono or Space Grotesk) for data/metrics. "
        "3. FRAMING: Structured grid language using faint 1px borders (#FFFFFF10) to separate zones. Generous minimum 120px vertical padding between core sections. "
        "4. COMPONENTS: Immersive full-bleed cinematic hero, decoupled data readouts, prestige exhibit grid matrix (no basic cards), and snappy micro-interactions (instant color-inversion, arrow-slides). "
        "Be realistic about timeline and cost — agency rates for this kind of work "
        "are typically $50-150/hr; assume Atlas reduces that by 10-20x."
    ),
    output_schema=Plan,
)


class StrategyService:
    def __init__(self) -> None:
        self.memory = MemoryBank()

    async def invoke(
        self,
        engagement_id: str,
        payload: dict[str, Any],
        require_approval: bool = False,
    ) -> AgentResult:
        with tracer.start_as_current_span("strategy.invoke") as span:
            span.set_attribute("engagement_id", engagement_id)

            requirements = await self.memory.recall(engagement_id, "requirements")
            if not requirements:
                # Fallback: accept requirements directly from the payload (e.g. when
                # coordinator passes disc_output after a failed/mock discovery run).
                requirements = {k: v for k, v in payload.items() if k != "engagement_id"}
                # Guard: a fallback payload like {"brief": "", "extracted": False}
                # is a non-empty dict but contains zero client content. Feeding it
                # to the LLM forces a schema-complete Plan for a client the model
                # has to invent. Refuse instead.
                substantive = {
                    k: v
                    for k, v in requirements.items()
                    if k != "extracted"
                    and (v.strip() if isinstance(v, str) else v)
                }
                if not substantive:
                    requirements = {}
            if not requirements:
                return AgentResult(
                    agent_name="strategy",
                    engagement_id=engagement_id,
                    status="error",
                    output={},
                    error_message=(
                        "No usable requirements: nothing in Memory Bank and the "
                        "payload carried no brief or transcript. Refusing to "
                        "generate a plan from empty context."
                    ),
                )

            response = await run_agent(
                strategy_agent,
                f"Requirements:\n{requirements}\n\nProduce the Plan."
            )
            plan: Plan | None = response.output

            if plan is None:
                log.warning(
                    "strategy.extraction_failed",
                    engagement_id=engagement_id,
                    detail="LLM did not return parseable Plan",
                )
                return AgentResult(
                    agent_name="strategy",
                    engagement_id=engagement_id,
                    status="error",
                    output={},
                    error_message=(
                        "Failed to generate a structured plan from the requirements. "
                        "The model response could not be parsed. Please try again."
                    ),
                )

            await self.memory.remember(engagement_id, "plan", plan.model_dump())

            log.info(
                "strategy.complete",
                engagement_id=engagement_id,
                hours=plan.estimated_hours,
                cost_usd=plan.estimated_cost_usd,
                days=plan.timeline_days,
            )

            return AgentResult(
                agent_name="strategy",
                engagement_id=engagement_id,
                status="ok",
                output=plan.model_dump(),
                next_agent="designer",
                # Pause for owner approval on big jobs.
                requires_human_approval=plan.estimated_cost_usd > 5_000,
            )


service: StrategyService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    global service
    service = StrategyService()
    log.info("strategy.started")
    yield


app = FastAPI(title="Atlas Strategy", lifespan=lifespan)


async def _handler(
    engagement_id: str,
    payload: dict[str, Any],
    require_approval: bool = False,
) -> AgentResult:
    assert service is not None
    return await service.invoke(engagement_id, payload, require_approval)


A2AServer(
    app,
    handler=_handler,
    agent_name="strategy",
    description="Produces positioning, information architecture, and a build plan.",
    skills=[{
        "id": "build-strategy",
        "name": "Build Strategy",
        "description": "Generate positioning, target persona, IA, components, and cost/timeline estimates for approval.",
        "tags": ["strategy", "planning"],
    }],
)
