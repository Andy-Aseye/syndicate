"""Account Manager agent.

Runs after PM sign-off. Produces the launch email, first-month recommendations,
and identifies upsell signals for the next engagement.
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from google.adk.agents import LlmAgent
from pydantic import BaseModel

from agents.shared import A2AServer, AgentResult, MemoryBank, get_logger, setup_tracing

log = get_logger("account")
tracer = setup_tracing("atlas-account")


class AccountReport(BaseModel):
    launch_email: str                       # full email to send the client on launch day
    month_one_recommendations: list[str]    # concrete actions for month 1
    performance_targets: list[str]          # what to measure and what "good" looks like
    upsell_opportunities: list[str]         # what Atlas could pitch in the next QBR


account_agent = LlmAgent(
    name="account",
    model=os.environ.get("GEMINI_MODEL_FLASH", "gemini-2.5-flash"),
    instruction=(
        "You are the Account Manager agent for Atlas. After a client site launches, you "
        "handle the client relationship. Given the engagement summary, produce: "
        "(1) a warm, professional launch-day email the human account manager sends to the "
        "client — include the live URL, what was built, and a brief next-steps section; "
        "(2) concrete month-one recommendations (analytics setup, A/B tests, SEO); "
        "(3) measurable performance targets (CTR, bounce rate, leads/mo targets); "
        "(4) upsell opportunities Atlas could pitch at the next QBR."
    ),
    output_schema=AccountReport,
)


class AccountService:
    def __init__(self) -> None:
        self.memory = MemoryBank()

    async def invoke(
        self,
        engagement_id: str,
        payload: dict[str, Any],
        require_approval: bool = False,
    ) -> AgentResult:
        with tracer.start_as_current_span("account.invoke") as span:
            span.set_attribute("engagement_id", engagement_id)

            plan = await self.memory.recall(engagement_id, "plan")
            qa_report = await self.memory.recall(engagement_id, "qa_report")
            live_url = payload.get("live_url") or payload.get("deployedUrl", "")
            client_name = payload.get("client_name", "")
            brief = payload.get("brief", "")

            response = await account_agent.run(
                f"Client: {client_name}\n"
                f"Brief: {brief}\n"
                f"Strategy plan: {plan}\n"
                f"QA report: {qa_report}\n"
                f"Live site: {live_url or '(deployment in progress)'}\n\n"
                "Produce the AccountReport."
            )

            if response.output is None:
                log.warning("account.no_output", engagement_id=engagement_id)
                return AgentResult(
                    agent_name="account",
                    engagement_id=engagement_id,
                    status="error",
                    output={},
                    error_message="Account agent returned no structured output.",
                )

            report: AccountReport = response.output
            await self.memory.remember(engagement_id, "account_report", report.model_dump())

            log.info("account.complete", engagement_id=engagement_id)
            return AgentResult(
                agent_name="account",
                engagement_id=engagement_id,
                status="complete",
                output=report.model_dump(),
            )


service: AccountService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    global service
    service = AccountService()
    log.info("account.started")
    yield


app = FastAPI(title="Atlas Account", lifespan=lifespan)


async def _handler(
    engagement_id: str,
    payload: dict[str, Any],
    require_approval: bool = False,
) -> AgentResult:
    assert service is not None
    return await service.invoke(engagement_id, payload, require_approval)


A2AServer(app, handler=_handler)
