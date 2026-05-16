"""Discovery agent.

Conducts a voice intake call with a new client using Gemini Live, transcribes
the conversation, extracts structured requirements, and writes a brief.

Run:
    uvicorn agents.discovery.agent:app --reload --port 8081
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
    setup_tracing,
)

log = get_logger("discovery")
tracer = setup_tracing("atlas-discovery")


class Requirements(BaseModel):
    """Structured extraction of what the client wants."""

    one_liner: str
    target_audience: str
    products_or_services: list[str]
    brand_voice: str
    visual_preferences: str
    budget_hint: str | None = None
    timeline_hint: str | None = None
    must_haves: list[str]
    nice_to_haves: list[str]
    open_questions: list[str]


# ---------------------------------------------------------------------------
# ADK agent — handles requirement extraction from the transcript
# ---------------------------------------------------------------------------
extraction_agent = LlmAgent(
    name="discovery-extractor",
    model=os.environ.get("GEMINI_MODEL_PRO", "gemini-2.5-pro"),
    instruction=(
        "You are the Discovery agent for Atlas, an AI-powered digital agency operator. "
        "You will be given a transcript of a voice intake call between Atlas and a "
        "new client. Extract the structured Requirements schema verbatim. "
        "Do not hallucinate fields — if the client didn't mention something, leave it null "
        "and add it to `open_questions`. Be conservative."
    ),
    output_schema=Requirements,
)


# ---------------------------------------------------------------------------
# Voice intake — Gemini Live wraps this; for now, accept transcript directly
# ---------------------------------------------------------------------------
async def run_voice_intake(client_phone: str, engagement_id: str) -> str:
    """Place a Gemini Live call to the client and return the full transcript.

    TODO (Andy, W1 Day 2): Wire to Gemini Live's real-time voice API once
    the SDK is available — until then, the dashboard exposes a "paste transcript"
    fallback that calls handle_transcript directly.
    """
    raise NotImplementedError(
        "Gemini Live voice intake not yet wired — use /discovery/transcript endpoint "
        "with a pasted transcript for W1 dogfood runs."
    )


# ---------------------------------------------------------------------------
# A2A handler
# ---------------------------------------------------------------------------
class DiscoveryService:
    def __init__(self) -> None:
        self.memory = MemoryBank()

    async def invoke(
        self,
        engagement_id: str,
        payload: dict[str, Any],
        require_approval: bool = False,
    ) -> AgentResult:
        with tracer.start_as_current_span("discovery.invoke") as span:
            span.set_attribute("engagement_id", engagement_id)

            # Either we got a transcript directly (W1 fallback), or we run the
            # voice call (W2+).
            transcript = payload.get("transcript")
            if not transcript and payload.get("client_phone"):
                transcript = await run_voice_intake(
                    payload["client_phone"], engagement_id
                )
            if not transcript:
                return AgentResult(
                    agent_name="discovery",
                    engagement_id=engagement_id,
                    status="needs_input",
                    output={},
                    error_message="No transcript or phone provided.",
                )

            # Extract structured requirements.
            response = await extraction_agent.run(transcript)
            requirements: Requirements = response.output

            # Persist into Memory Bank for downstream agents.
            await self.memory.remember(
                engagement_id, "requirements", requirements.model_dump()
            )

            log.info(
                "discovery.complete",
                engagement_id=engagement_id,
                one_liner=requirements.one_liner,
                open_questions=len(requirements.open_questions),
            )

            return AgentResult(
                agent_name="discovery",
                engagement_id=engagement_id,
                status="ok",
                output=requirements.model_dump(),
                next_agent="strategy",
                requires_human_approval=len(requirements.open_questions) > 3,
            )


# ---------------------------------------------------------------------------
# FastAPI bootstrap
# ---------------------------------------------------------------------------
service: DiscoveryService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    global service
    service = DiscoveryService()
    log.info("discovery.started")
    yield


app = FastAPI(title="Atlas Discovery", lifespan=lifespan)


async def _handler(
    engagement_id: str,
    payload: dict[str, Any],
    require_approval: bool = False,
) -> AgentResult:
    assert service is not None
    return await service.invoke(engagement_id, payload, require_approval)


A2AServer(app, handler=_handler)
