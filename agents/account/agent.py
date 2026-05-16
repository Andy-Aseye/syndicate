"""Account Manager agent.

Runs continuously after launch. Monitors the deployed site (Lighthouse, traffic,
conversions), drafts QBRs, scores upsell signals, and pings the owner when
something needs human judgment.

Long-running — uses Memory Profiles for per-client persona recall.

W2 deliverable — stub for now.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI

from agents.shared import A2AServer, AgentResult, MemoryBank, get_logger

log = get_logger("account")


class AccountService:
    def __init__(self) -> None:
        self.memory = MemoryBank()

    async def invoke(
        self,
        engagement_id: str,
        payload: dict[str, Any],
        require_approval: bool = False,
    ) -> AgentResult:
        # TODO (Andy, W2 Day 5): Lighthouse + Memory Profiles wiring.
        log.info("account.stub", engagement_id=engagement_id)
        return AgentResult(
            agent_name="account",
            engagement_id=engagement_id,
            status="complete",
            output={"stubbed": True, "todo": "wire Lighthouse + Memory Profiles in W2"},
        )


service: AccountService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    global service
    service = AccountService()
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
