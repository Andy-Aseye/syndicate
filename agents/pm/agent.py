"""Project Manager agent.

After Developer ships a build, PM agent reviews the site against the strategy
plan, flags P0 issues, and drafts a client-facing update.
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from google.adk.agents import LlmAgent
from pydantic import BaseModel

from agents.shared import A2AServer, AgentResult, MemoryBank, get_logger, run_agent, setup_tracing

log = get_logger("pm")
tracer = setup_tracing("atlas-pm")


class QAReport(BaseModel):
    overall_status: str          # "pass" | "needs_fixes" | "blocked"
    checklist: list[str]         # items reviewed, each prefixed with ✅ or ❌
    priority_fixes: list[str]    # P0 issues before client delivery
    client_update: str           # Slack-ready message the account manager can send
    next_steps: list[str]        # what happens after QA sign-off
    lighthouse_scores: dict[str, float] | None = None


pm_agent = LlmAgent(
    name="pm",
    model=os.environ.get("GEMINI_MODEL_FLASH", "gemini-2.5-flash"),
    instruction=(
        "You are the Project Manager agent for Atlas, an AI-powered digital agency. "
        "Given a client brief, strategy plan, and live site URL, produce a QA report. "
        "Simulate a thorough review: check that the IA matches the strategy, CTAs are "
        "clear, visual direction is consistent, and the site is launch-ready. Be specific "
        "— reference actual pages and components from the strategy. "
        "Write `client_update` as a friendly, professional Slack message the human "
        "account manager can copy-paste directly to the client."
    ),
    output_schema=QAReport,
)


class PMService:
    def __init__(self) -> None:
        self.memory = MemoryBank()

    async def invoke(
        self,
        engagement_id: str,
        payload: dict[str, Any],
        require_approval: bool = False,
    ) -> AgentResult:
        with tracer.start_as_current_span("pm.invoke") as span:
            span.set_attribute("engagement_id", engagement_id)

            plan = await self.memory.recall(engagement_id, "plan")
            if not plan:
                plan = {k: v for k, v in payload.items() if k != "engagement_id"}

            live_url = payload.get("live_url") or payload.get("deployedUrl", "")
            if not live_url and plan:
                 live_url = plan.get("deployedUrl", "")

            brief = payload.get("brief", "")

            lighthouse_scores = None
            if live_url:
                try:
                    import subprocess
                    import json
                    import tempfile
                    
                    log.info("pm.running_lighthouse", url=live_url)
                    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
                        report_path = tf.name
                    
                    cmd = [
                        "npx", "lighthouse", live_url,
                        "--output", "json",
                        "--output-path", report_path,
                        '--chrome-flags="--headless"',
                        "--quiet"
                    ]
                    # Use a relatively short timeout for testing
                    subprocess.run(cmd, check=True, timeout=60, capture_output=True)
                    
                    with open(report_path, "r") as f:
                        lh_data = json.load(f)
                    
                    cats = lh_data.get("categories", {})
                    lighthouse_scores = {
                        "performance": (cats.get("performance", {}).get("score") or 0) * 100,
                        "accessibility": (cats.get("accessibility", {}).get("score") or 0) * 100,
                        "best_practices": (cats.get("best-practices", {}).get("score") or 0) * 100,
                        "seo": (cats.get("seo", {}).get("score") or 0) * 100,
                    }
                    os.unlink(report_path)
                    log.info("pm.lighthouse_complete", scores=lighthouse_scores)
                except Exception as e:
                    log.error("pm.lighthouse_failed", error=str(e), exc_info=True)

            prompt_context = (
                f"Client brief: {brief}\n\n"
                f"Strategy plan: {plan}\n\n"
                f"Live site URL: {live_url or '(not yet deployed)'}\n\n"
            )
            if lighthouse_scores:
                prompt_context += f"Lighthouse Scores: {lighthouse_scores}\nIf any score is < 90, flag it as a blocker in priority_fixes and set overall_status to 'blocked'.\n\n"
            
            prompt_context += "Produce a detailed QA report."
            response = await run_agent(pm_agent, prompt_context)

            if response.output is None:
                log.warning("pm.no_output", engagement_id=engagement_id)
                return AgentResult(
                    agent_name="pm",
                    engagement_id=engagement_id,
                    status="error",
                    output={},
                    error_message="PM agent returned no structured output.",
                )

            report: QAReport = response.output
            if lighthouse_scores:
                report.lighthouse_scores = lighthouse_scores

            await self.memory.remember(engagement_id, "qa_report", report.model_dump())

            log.info("pm.complete", engagement_id=engagement_id, status=report.overall_status)
            return AgentResult(
                agent_name="pm",
                engagement_id=engagement_id,
                status="ok",
                output=report.model_dump(),
                next_agent="account",
            )


service: PMService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    global service
    service = PMService()
    log.info("pm.started")
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
