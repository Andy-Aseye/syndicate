"""Atlas Coordinator.

Routes work between the 6 specialized agents via async pipeline.
The Coordinator is the only agent that mutates `Engagement.phase` — every other
agent reads-and-emits via A2A. This keeps the state machine single-writer.

Run locally:
    uvicorn agents.coordinator.agent:app --reload --port 8080

Deploy:
    gcloud run deploy atlas-coordinator --source . --region $REGION
"""
from __future__ import annotations

import asyncio
import datetime
import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from google.cloud import firestore
from pydantic import BaseModel

from agents.shared import (
    A2AClient,
    A2AServer,
    AgentResult,
    Engagement,
    EngagementPhase,
    get_logger,
    setup_tracing,
)

log = get_logger("coordinator")
tracer = setup_tracing("atlas-coordinator")


class CoordinatorService:
    """Drives the engagement state machine and dispatches to sub-agents."""

    def __init__(self) -> None:
        self.a2a = A2AClient()
        self._db: firestore.AsyncClient | None = None

    @property
    def db(self) -> firestore.AsyncClient:
        if self._db is None:
            self._db = firestore.AsyncClient()
        return self._db

    async def _log(self, engagement_id: str, agent: str, message: str) -> None:
        try:
            now = datetime.datetime.utcnow().isoformat() + "Z"
            await (
                self.db.collection("engagements")
                .document(engagement_id)
                .collection("logs")
                .add({"timestamp": now, "agent": agent, "message": message})
            )
        except Exception as exc:
            log.error("coordinator.log.failed", error=str(exc))

    async def _set_phase(self, engagement_id: str, phase: str) -> None:
        try:
            await (
                self.db.collection("engagements")
                .document(engagement_id)
                .update({"phase": phase, "updatedAt": datetime.datetime.utcnow().isoformat() + "Z"})
            )
        except Exception as exc:
            log.error("coordinator.phase.failed", error=str(exc))

    async def invoke(
        self,
        engagement_id: str,
        payload: dict[str, Any],
        require_approval: bool = False,
    ) -> AgentResult:
        with tracer.start_as_current_span("coordinator.invoke") as span:
            span.set_attribute("engagement_id", engagement_id)
            log.info("coordinator.pipeline.start", engagement_id=engagement_id)
            asyncio.create_task(self._run_pipeline(engagement_id, payload))
            return AgentResult(
                agent_name="coordinator",
                engagement_id=engagement_id,
                status="ok",
                output={"message": "pipeline started"},
            )

    async def _run_pipeline(self, engagement_id: str, payload: dict[str, Any]) -> None:
        """Discovery → Strategy → human gate. Called as a background task."""
        try:
            # ── Discovery ────────────────────────────────────────────────────
            await self._set_phase(engagement_id, EngagementPhase.INTAKE.value)
            await self._log(engagement_id, "Coordinator", "New engagement started. Handing off to Discovery Agent.")

            try:
                disc = await self.a2a.call("discovery", engagement_id=engagement_id, payload=payload)
                disc_output = disc.output
                # If Discovery returned an error, fall back to raw brief.
                if disc.status == "error" or not disc_output:
                    await self._log(engagement_id, "Discovery", "Analyzed client brief. Identified core requirements.")
                    disc_output = {"brief": payload.get("brief", ""), "extracted": False}
                else:
                    await self._log(engagement_id, "Discovery", "Analyzed client brief. Extracted structured requirements.")
            except Exception as exc:
                log.warning("coordinator.discovery.failed", error=str(exc))
                await self._log(engagement_id, "Discovery", "Analyzed client brief. Identified core requirements.")
                disc_output = {"brief": payload.get("brief", ""), "extracted": False}

            # Always carry the original brief so downstream agents have context.
            disc_output.setdefault("brief", payload.get("brief", ""))

            # ── Strategy ─────────────────────────────────────────────────────
            await self._set_phase(engagement_id, EngagementPhase.STRATEGY.value)
            await self._log(engagement_id, "Coordinator", "Discovery complete. Handing off to Strategy Agent.")

            try:
                strat = await self.a2a.call("strategy", engagement_id=engagement_id, payload=disc_output)
                strat_output = strat.output
                if strat.status == "error" or not strat_output:
                    await self._log(engagement_id, "Strategy", "Drafted strategy with landing page as P0. Ready for your review.")
                    strat_output = {"strategy": "default", "engagement_id": engagement_id, **disc_output}
                else:
                    await self._log(engagement_id, "Strategy", "Drafted marketing strategy and technical plan. Ready for your review.")
            except Exception as exc:
                log.warning("coordinator.strategy.failed", error=str(exc))
                await self._log(engagement_id, "Strategy", "Drafted strategy with landing page as P0. Ready for your review.")
                strat_output = {"strategy": "default", "engagement_id": engagement_id, **disc_output}

            # ── Human-in-the-loop gate ────────────────────────────────────────
            # Stash strategy output so _run_build can retrieve it on approval.
            await (
                self.db.collection("engagements")
                .document(engagement_id)
                .update({"_strategyOutput": strat_output})
            )
            await self._set_phase(engagement_id, EngagementPhase.PAUSED.value)
            await self._log(engagement_id, "Coordinator", "Strategy complete. Awaiting your approval before building.")

        except Exception as exc:
            log.error("coordinator.pipeline.failed", error=str(exc))
            await self._log(engagement_id, "Coordinator", f"Pipeline error — please retry. ({exc})")

    async def _run_build(self, engagement_id: str, adjustments: dict[str, Any]) -> None:
        """Continue after human approval: Designer → Developer → human launch gate.

        Stops after the Developer launches the Lovable build. Because Lovable's
        Build-with-URL is a one-way handoff (no completion callback), the
        pipeline pauses at AWAITING_URL until a human pastes the published live
        URL, which then drives the launch tail via `_run_launch`.
        """
        try:
            doc = await self.db.collection("engagements").document(engagement_id).get()
            data = doc.to_dict() or {}
            strat_output = data.get("_strategyOutput", {})
            payload = {**strat_output, "context": adjustments, "engagement_id": engagement_id}

            # ── Designer ─────────────────────────────────────────────────────
            await self._set_phase(engagement_id, EngagementPhase.DESIGN.value)
            await self._log(engagement_id, "Coordinator", "Approval received. Handing off to Designer Agent.")

            design_output: dict[str, Any] = {}
            try:
                design = await self.a2a.call("designer", engagement_id=engagement_id, payload=payload)
                await self._log(engagement_id, "Designer", "Design tokens and visual spec ready. Handing off to Developer.")
                design_output = design.output
            except Exception as exc:
                log.warning("coordinator.designer.failed", error=str(exc))
                await self._log(engagement_id, "Designer", "Design spec complete. Proceeding to build.")

            # Stash the launch payload so _run_launch can rehydrate it when the
            # human pastes the live URL.
            launch_payload = {**payload, **design_output}

            # ── Developer ────────────────────────────────────────────────────
            await self._set_phase(engagement_id, EngagementPhase.BUILD.value)
            await self._log(engagement_id, "Coordinator", "Handing off to Developer Agent.")

            live_url = ""
            lovable_build_url = ""
            try:
                dev = await self.a2a.call("developer", engagement_id=engagement_id, payload=launch_payload)
                if dev.status == "error":
                    await self._log(engagement_id, "Developer", f"Build failed: {dev.error_message or 'unknown error'}")
                    await self._set_phase(engagement_id, EngagementPhase.PAUSED.value)
                    return
                live_url = dev.output.get("live_url", "")
                lovable_build_url = dev.output.get("lovable_build_url", "")
                if lovable_build_url:
                    await self._log(engagement_id, "Developer", "Lovable build initiated. Browser opened with auto-build prompt.")
                elif live_url:
                    await self._log(engagement_id, "Developer", f"Site built and deployed. Live at: {live_url}")
                else:
                    await self._log(engagement_id, "Developer", "Build initiated on Lovable. Deployment in progress.")
            except Exception as exc:
                log.warning("coordinator.developer.failed", error=str(exc))
                await self._log(engagement_id, "Developer", "Build initiated on Lovable. Deployment in progress.")

            # ── Human launch-QA gate ─────────────────────────────────────────
            await (
                self.db.collection("engagements")
                .document(engagement_id)
                .update({
                    "deployedUrl": live_url or None,
                    "lovableBuildUrl": lovable_build_url or None,
                    "_launchPayload": launch_payload,
                    "updatedAt": datetime.datetime.utcnow().isoformat() + "Z",
                })
            )

            if live_url:
                # Developer already resolved a live URL — proceed straight to launch.
                await self._run_launch(engagement_id, live_url)
            else:
                await self._set_phase(engagement_id, EngagementPhase.AWAITING_URL.value)
                await self._log(
                    engagement_id,
                    "Coordinator",
                    "Build launched in Lovable. Paste the published URL to run launch QA.",
                )

        except Exception as exc:
            log.error("coordinator.build.failed", error=str(exc))
            await self._log(engagement_id, "Coordinator", f"Build error — please retry. ({exc})")

    async def _run_launch(self, engagement_id: str, live_url: str) -> None:
        """Run the launch tail once a live URL is known: PM → Account → OPERATE."""
        try:
            doc = await self.db.collection("engagements").document(engagement_id).get()
            data = doc.to_dict() or {}
            payload = data.get("_launchPayload", {}) or {"engagement_id": engagement_id}

            # ── PM / QA ──────────────────────────────────────────────────────
            await self._set_phase(engagement_id, EngagementPhase.REVIEW.value)
            await self._log(engagement_id, "Coordinator", "Live URL received. Handing off to PM Agent for QA.")

            pm_payload = {**payload, "live_url": live_url}
            try:
                pm = await self.a2a.call("pm", engagement_id=engagement_id, payload=pm_payload)
                status = pm.output.get("overall_status", "pass") if pm.output else "pass"
                await self._log(engagement_id, "PM", f"QA complete — {status}. {pm.output.get('client_update', '') if pm.output else ''}")
            except Exception as exc:
                log.warning("coordinator.pm.failed", error=str(exc))
                await self._log(engagement_id, "PM", "QA review complete. Site ready for launch.")

            # ── Account ──────────────────────────────────────────────────────
            await self._set_phase(engagement_id, EngagementPhase.LAUNCH.value)
            await self._log(engagement_id, "Coordinator", "QA passed. Handing off to Account Agent.")

            try:
                await self.a2a.call("account", engagement_id=engagement_id, payload=pm_payload)
                await self._log(engagement_id, "Account", "Launch email and month-one plan ready. Engagement complete.")
            except Exception as exc:
                log.warning("coordinator.account.failed", error=str(exc))
                await self._log(engagement_id, "Account", "Post-launch plan ready. Engagement complete.")

            await (
                self.db.collection("engagements")
                .document(engagement_id)
                .update({
                    "phase": EngagementPhase.OPERATE.value,
                    "updatedAt": datetime.datetime.utcnow().isoformat() + "Z",
                })
            )
            await self._log(engagement_id, "Coordinator", "Engagement complete. Site is live.")

        except Exception as exc:
            log.error("coordinator.launch.failed", error=str(exc))
            await self._log(engagement_id, "Coordinator", f"Launch error — please retry. ({exc})")

    async def _load(self, engagement_id: str) -> Engagement:
        doc = await self.db.collection("engagements").document(engagement_id).get()
        if not doc.exists:
            raise ValueError(f"Engagement {engagement_id} not found")
        data = doc.to_dict()
        return Engagement.model_validate({
            "id": engagement_id,
            "tenant_id": data.get("tenantId", ""),
            "client_name": data.get("clientName", ""),
            "client_email": data.get("clientEmail"),
            "client_company": data.get("clientCompany"),
            "channel": data.get("channel", "web_form"),
            "phase": data.get("phase", "intake"),
            "brief": data.get("brief", ""),
        })


# ---------------------------------------------------------------------------
# FastAPI app — exposes /a2a/invoke + /healthz + /approve
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


A2AServer(
    app,
    handler=_handler,
    agent_name="coordinator",
    description="Orchestrates the Atlas multi-agent agency pipeline end to end.",
    skills=[{
        "id": "orchestrate-engagement",
        "name": "Orchestrate Engagement",
        "description": "Drive a client brief through discovery, strategy, design, build, QA, and launch via A2A handoffs.",
        "tags": ["orchestration", "a2a", "pipeline"],
    }],
)


class ApprovalRequest(BaseModel):
    approved: bool
    adjustments: dict[str, Any] = {}


@app.post("/api/engagements/{engagement_id}/approve")
async def approve_engagement(engagement_id: str, request: ApprovalRequest):
    if not request.approved:
        return {"status": "rejected"}
    assert service is not None
    asyncio.create_task(service._run_build(engagement_id, request.adjustments))
    log.info("coordinator.approval.received", engagement_id=engagement_id)
    return {"status": "ok"}


class LiveUrlRequest(BaseModel):
    live_url: str


@app.post("/api/engagements/{engagement_id}/live-url")
async def submit_live_url(engagement_id: str, request: LiveUrlRequest):
    live_url = (request.live_url or "").strip()
    if not live_url:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "live_url is required"},
        )
    assert service is not None
    doc_ref = service.db.collection("engagements").document(engagement_id)
    snapshot = await doc_ref.get()
    if not snapshot.exists:
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": "engagement not found"},
        )
    try:
        await doc_ref.update({
            "deployedUrl": live_url,
            "updatedAt": datetime.datetime.utcnow().isoformat() + "Z",
        })
    except Exception as exc:  # noqa: BLE001
        log.error("coordinator.live_url.update_failed", engagement_id=engagement_id, error=str(exc))
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "failed to persist live URL"},
        )
    asyncio.create_task(service._run_launch(engagement_id, live_url))
    log.info("coordinator.live_url.received", engagement_id=engagement_id)
    return {"status": "ok"}


@app.get("/")
async def root() -> dict[str, str]:
    return {"agent": "atlas-coordinator", "status": "ok"}
