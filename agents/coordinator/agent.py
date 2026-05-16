"""Atlas Coordinator.

Routes work between the 6 specialized agents using the ADK graph framework + A2A.
The Coordinator is the only agent that mutates `Engagement.phase` — every other
agent reads-and-emits via A2A. This keeps the state machine single-writer.

Run locally:
    uvicorn agents.coordinator.agent:app --reload --port 8080

Deploy:
    gcloud run deploy atlas-coordinator --source . --region $REGION
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from google.adk.agents import LlmAgent, SequentialAgent, ParallelAgent
from google.cloud import firestore

from agents.shared import (
    A2AClient,
    A2AServer,
    AgentResult,
    Engagement,
    EngagementPhase,
    MemoryBank,
    get_logger,
    setup_tracing,
)

log = get_logger("coordinator")
tracer = setup_tracing("atlas-coordinator")

# ---------------------------------------------------------------------------
# State machine: which agent runs next, given the current phase
# ---------------------------------------------------------------------------
PHASE_GRAPH: dict[EngagementPhase, str | None] = {
    EngagementPhase.INTAKE:   "discovery",
    EngagementPhase.STRATEGY: "strategy",
    EngagementPhase.DESIGN:   "designer",
    EngagementPhase.BUILD:    "developer",
    EngagementPhase.REVIEW:   "pm",
    EngagementPhase.LAUNCH:   "developer",        # final deploy step
    EngagementPhase.OPERATE:  "account",
    EngagementPhase.PAUSED:   None,               # awaits human input
    EngagementPhase.ARCHIVED: None,               # done
}

PHASE_TRANSITIONS: dict[EngagementPhase, EngagementPhase] = {
    EngagementPhase.INTAKE:   EngagementPhase.STRATEGY,
    EngagementPhase.STRATEGY: EngagementPhase.DESIGN,
    EngagementPhase.DESIGN:   EngagementPhase.BUILD,
    EngagementPhase.BUILD:    EngagementPhase.REVIEW,
    EngagementPhase.REVIEW:   EngagementPhase.LAUNCH,
    EngagementPhase.LAUNCH:   EngagementPhase.OPERATE,
}


# ---------------------------------------------------------------------------
# ADK agent definition
# ---------------------------------------------------------------------------
coordinator_llm = LlmAgent(
    name="atlas-coordinator",
    model=os.environ.get("GEMINI_MODEL_PRO", "gemini-2.5-pro"),
    instruction=(
        "You are the Atlas Coordinator. Your job is to route a client engagement "
        "through six specialized agents (Discovery, Strategy, Designer, Developer, "
        "PM, Account). You never produce client-facing output yourself — your only "
        "tools are `route_to`, `wait_for`, and `human_approval`. Decide the next "
        "step based on the engagement's current phase and any signals from the "
        "previous agent's output. When in doubt, pause for human approval."
    ),
)


# ---------------------------------------------------------------------------
# A2A handler
# ---------------------------------------------------------------------------
class CoordinatorService:
    """Drives the engagement state machine and dispatches to sub-agents."""

    def __init__(self) -> None:
        self.a2a = A2AClient()
        self.memory = MemoryBank()
        self.db = firestore.AsyncClient()

    async def invoke(
        self,
        engagement_id: str,
        payload: dict[str, Any],
        require_approval: bool = False,
    ) -> AgentResult:
        with tracer.start_as_current_span("coordinator.invoke") as span:
            span.set_attribute("engagement_id", engagement_id)
            engagement = await self._load(engagement_id)
            log.info("coordinator.kickoff_workflow", engagement_id=engagement_id)

            try:
                from temporalio.client import Client
                # In production, cache the client connection
                client = await Client.connect("localhost:7233")
                
                engagement_data = {"id": engagement_id, "payload": payload}
                handle = await client.start_workflow(
                    "AtlasEngagementWorkflow",
                    engagement_data,
                    id=f"engagement-{engagement_id}",
                    task_queue="atlas-engagement-queue"
                )
                
                # Update Firestore to indicate workflow started
                await self._update_phase(engagement_id, EngagementPhase.STRATEGY)
                
                return AgentResult(
                    agent_name="coordinator",
                    engagement_id=engagement_id,
                    status="workflow_started",
                    output={"workflow_id": handle.id},
                )
            except Exception as e:
                log.error(f"Failed to start workflow: {e}")
                return AgentResult(
                    agent_name="coordinator",
                    engagement_id=engagement_id,
                    status="error",
                    output={"error": str(e)},
                )

    async def _load(self, engagement_id: str) -> Engagement:
        doc = await self.db.collection("engagements").document(engagement_id).get()
        if not doc.exists:
            raise ValueError(f"Engagement {engagement_id} not found")
        return Engagement.model_validate(doc.to_dict())

    async def _update_phase(self, engagement_id: str, phase: EngagementPhase) -> None:
        await (
            self.db.collection("engagements")
            .document(engagement_id)
            .update({"phase": phase.value})
        )


# ---------------------------------------------------------------------------
# FastAPI app — exposes /a2a/invoke + /healthz
# ---------------------------------------------------------------------------
service: CoordinatorService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    global service
    service = CoordinatorService()
    log.info("coordinator.started")
    yield
    await service.a2a.close()
    log.info("coordinator.stopped")


app = FastAPI(title="Atlas Coordinator", lifespan=lifespan)


async def _handler(
    engagement_id: str,
    payload: dict[str, Any],
    require_approval: bool = False,
) -> AgentResult:
    assert service is not None
    return await service.invoke(engagement_id, payload, require_approval)


A2AServer(app, handler=_handler)

from pydantic import BaseModel
from temporalio.client import Client

class ApprovalRequest(BaseModel):
    approved: bool
    adjustments: dict[str, Any] = {}

@app.post("/api/engagements/{engagement_id}/approve")
async def approve_engagement(engagement_id: str, request: ApprovalRequest):
    try:
        client = await Client.connect("localhost:7233")
        handle = client.get_workflow_handle(f"engagement-{engagement_id}")
        await handle.signal("approve_tool_execution", request.model_dump())
        log.info("coordinator.signal.success", engagement_id=engagement_id)
        return {"status": "signaled"}
    except Exception as e:
        log.error("coordinator.signal.failed", error=str(e))
        return {"status": "error", "error": str(e)}

@app.get("/")
async def root() -> dict[str, str]:
    return {"agent": "atlas-coordinator", "status": "ok"}
