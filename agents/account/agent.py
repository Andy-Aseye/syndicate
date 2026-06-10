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

from agents.shared import A2AServer, AgentResult, MemoryBank, get_logger, run_agent, setup_tracing

log = get_logger("account")
tracer = setup_tracing("atlas-account")


class AccountReport(BaseModel):
    launch_email: str                       # full email to send the client on launch day
    month_one_recommendations: list[str]    # concrete actions for month 1
    performance_targets: list[str]          # what to measure and what "good" looks like
    upsell_opportunities: list[str]         # what Atlas could pitch in the next QBR
    email_status: str | None = None         # sent | simulated | failed | skipped_no_recipient
    email_to: str | None = None             # recipient address (when an email was dispatched)


account_agent = LlmAgent(
    name="account",
    model=os.environ.get("GEMINI_MODEL_FLASH", "gemini-2.5-flash"),
    instruction=(
        "You are the Account Manager agent for Atlas. After a client site launches, you "
        "handle the client relationship. Given the engagement summary, produce: "
        "(1) a warm, professional launch-day email the human account manager sends to the "
        "client — include the live URL, what was built, and a brief next-steps section. "
        "If the QA report includes Lighthouse scores, the email MUST explicitly cite the "
        "actual numbers as proof of quality (e.g. 'Performance 96, Accessibility 100, "
        "Best Practices 100, SEO 92'). Never invent or round-trip scores that are not in "
        "the QA report. If the QA report flags blockers or priority fixes, mention them "
        "candidly in the email with a short plan to resolve them; "
        "(2) concrete month-one recommendations (analytics setup, A/B tests, SEO); "
        "(3) measurable performance targets (CTR, bounce rate, leads/mo targets); "
        "(4) upsell opportunities Atlas could pitch at the next QBR."
    ),
    output_schema=AccountReport,
)


def _coerce_status(tool_text: str) -> str:
    """Map an agency-mcp send_email tool result string to an email_status."""
    low = tool_text.lower()
    if "[simulated]" in low:
        return "simulated"
    if "failed" in low or "error" in low:
        return "failed"
    if "email sent" in low or "id=" in low:
        return "sent"
    return "sent"


async def _dispatch_email(
    engagement_id: str,
    client_email: str,
    subject: str,
    body: str,
) -> tuple[str, str | None]:
    """Send the launch email via a real ADK -> MCP -> Resend tool-call.

    Uses a free-form dispatch sub-agent (NO output_schema) wired to the
    agency-mcp `send_email` tool through McpToolset. Returns (status, email_to).
    Never raises — degrades to "failed" so the AccountReport still completes.
    """
    captured: dict[str, str] = {}

    def _after_tool_callback(tool, args, tool_context, tool_response):  # noqa: ANN001, ARG001
        try:
            captured["text"] = str(tool_response)
        except Exception:  # pragma: no cover - defensive
            captured["text"] = ""
        return None

    try:
        from google.adk.tools.mcp_tool import McpToolset
        from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
        from mcp import StdioServerParameters

        toolset = McpToolset(
            connection_params=StdioConnectionParams(
                # Pass the full environment so the stdio subprocess inherits
                # RESEND_API_KEY/RESEND_FROM (the mcp client otherwise only
                # forwards a minimal default env, which would force simulate).
                server_params=StdioServerParameters(
                    command="mcp-server-agency",
                    env={**os.environ},
                ),
            ),
        )
        dispatch_agent = LlmAgent(
            name="account_dispatch",
            model=os.environ.get("GEMINI_MODEL_FLASH", "gemini-2.5-flash"),
            instruction=(
                "You send the launch-day email. Call the `send_email` tool exactly once "
                "with the provided recipient, subject, and body. Do not modify the body. "
                "After the tool returns, briefly confirm the outcome."
            ),
            tools=[toolset],
            after_tool_callback=_after_tool_callback,
        )

        prompt = (
            f"Send the launch email now.\n"
            f"to: {client_email}\n"
            f"subject: {subject}\n"
            f"body:\n{body}"
        )
        result = await run_agent(dispatch_agent, prompt)

        tool_text = captured.get("text")
        if not tool_text and isinstance(result.output, str):
            tool_text = result.output
        if tool_text:
            status = _coerce_status(tool_text)
            log.info("account.email_dispatched", engagement_id=engagement_id, status=status)
            return status, client_email
        log.warning("account.email_no_tool_result", engagement_id=engagement_id)
        return "failed", client_email
    except Exception as exc:
        log.warning("account.email_dispatch_failed", engagement_id=engagement_id, error=str(exc))
        return "failed", client_email


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

            response = await run_agent(
                account_agent,
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

            # Auto-send the launch email via a real ADK -> MCP -> Resend tool-call.
            client_email = (payload.get("client_email") or payload.get("clientEmail") or "").strip()
            if client_email:
                subject = f"Your new site is live, {client_name}!" if client_name else "Your new site is live!"
                status, email_to = await _dispatch_email(
                    engagement_id, client_email, subject, report.launch_email
                )
                report.email_status = status
                report.email_to = email_to
            else:
                report.email_status = "skipped_no_recipient"
                log.info("account.email_skipped", engagement_id=engagement_id)

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


A2AServer(
    app,
    handler=_handler,
    agent_name="account",
    description="Drafts the launch email and month-one post-launch plan.",
    skills=[{
        "id": "post-launch-ops",
        "name": "Post-launch Ops",
        "description": "Produce a launch announcement and a 30-day account plan once the site is live.",
        "tags": ["account", "post-launch"],
    }],
)
