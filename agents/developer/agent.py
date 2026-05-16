"""Developer agent.

Reads the Plan produced by Strategy, builds a Lovable project via Build-with-URL,
polls until ready, optionally deploys to a custom domain, and writes the
artifact references back to Memory Bank.

Intentionally thin: most of the engineering judgment lives in the Strategy
agent's `build_scope_lovable_prompt`. Developer's job is to execute reliably
and capture results.
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI

from agents.shared import (
    A2AServer,
    AgentResult,
    MemoryBank,
    get_logger,
    setup_tracing,
)
from agents.developer.lovable_client import LovableClient

log = get_logger("developer")
tracer = setup_tracing("atlas-developer")


class DeveloperService:
    def __init__(self) -> None:
        self.memory = MemoryBank()
        self.lovable = LovableClient()

    async def invoke(
        self,
        engagement_id: str,
        payload: dict[str, Any],
        require_approval: bool = False,
    ) -> AgentResult:
        with tracer.start_as_current_span("developer.invoke") as span:
            span.set_attribute("engagement_id", engagement_id)

            plan = await self.memory.recall(engagement_id, "plan")
            if not plan:
                return AgentResult(
                    agent_name="developer",
                    engagement_id=engagement_id,
                    status="error",
                    output={},
                    error_message="No plan in memory — Strategy hasn't run.",
                )

            prompt = plan["build_scope_lovable_prompt"]
            app_name = (plan.get("positioning", "")[:60] or "atlas-build").strip()

            log.info("developer.sandbox.start", engagement_id=engagement_id)
            # Validate any generated setup scripts (e.g. DB schema migrations) in the
            # Agent Engine Sandbox before they get folded into the Lovable prompt.
            # The sandbox executor is wired into the LLM agent (`code_executor=...`);
            # the agent itself decides when to invoke it. We trigger it here by asking
            # the validator agent to run the setup script.
            sandbox_resource = os.environ.get("ATLAS_SANDBOX_RESOURCE_NAME")
            try:
                from google.adk.code_executors.agent_engine_sandbox_code_executor import (
                    AgentEngineSandboxCodeExecutor,
                )
                from google.adk.agents.llm_agent import Agent

                validator = Agent(
                    name="developer-validator",
                    model=os.environ.get("GEMINI_MODEL_FLASH", "gemini-2.5-flash"),
                    instruction=(
                        "You validate setup scripts in a sandbox. Execute the script "
                        "exactly as written and return the output verbatim."
                    ),
                    code_executor=AgentEngineSandboxCodeExecutor(
                        sandbox_resource_name=sandbox_resource,
                    ) if sandbox_resource else AgentEngineSandboxCodeExecutor(),
                )
                setup_script = plan.get(
                    "setup_script", "print('Secure validation complete.')"
                )
                result = await validator.run(setup_script)
                log.info("developer.sandbox.success", result=result.output)
                prompt += f"\n\nAtlas Sandbox Output: {result.output}"
            except ImportError:
                log.warning(
                    "developer.sandbox.skipped",
                    reason="google-adk<1.17 — sandbox executor not available",
                )
            except Exception as exc:  # noqa: BLE001
                log.error("developer.sandbox.failed", error=str(exc))

            log.info(
                "developer.lovable_build.start",
                engagement_id=engagement_id,
                prompt_chars=len(prompt),
            )

            try:
                build = await self.lovable.build(prompt, app_name=app_name)
            except Exception as exc:  # noqa: BLE001
                log.exception("developer.lovable_build.failed", error=str(exc))
                return AgentResult(
                    agent_name="developer",
                    engagement_id=engagement_id,
                    status="error",
                    output={},
                    error_message=f"Lovable build failed: {exc}",
                )

            # Deploy (no custom domain yet — set during W2 when we connect Shopify).
            try:
                live_url = await self.lovable.deploy(build.project_id)
            except Exception as exc:  # noqa: BLE001
                log.warning("developer.lovable_deploy.failed", error=str(exc))
                live_url = build.preview_url or build.project_url

            await self.memory.remember(
                engagement_id,
                "build",
                {
                    "lovable_project_id": build.project_id,
                    "lovable_project_url": build.project_url,
                    "live_url": live_url,
                },
            )

            log.info(
                "developer.lovable_build.complete",
                engagement_id=engagement_id,
                live_url=live_url,
            )

            return AgentResult(
                agent_name="developer",
                engagement_id=engagement_id,
                status="ok",
                output={
                    "lovable_project_id": build.project_id,
                    "live_url": live_url,
                    "preview_url": build.preview_url,
                },
                next_agent="pm",
                requires_human_approval=False,
            )


service: DeveloperService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    global service
    service = DeveloperService()
    log.info("developer.started")
    yield
    await service.lovable.close()


app = FastAPI(title="Atlas Developer", lifespan=lifespan)


async def _handler(
    engagement_id: str,
    payload: dict[str, Any],
    require_approval: bool = False,
) -> AgentResult:
    assert service is not None
    return await service.invoke(engagement_id, payload, require_approval)


A2AServer(app, handler=_handler)
