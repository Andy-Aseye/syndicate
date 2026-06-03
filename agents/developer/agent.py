"""Developer agent.

Reads the Plan produced by Strategy (and enriched by Designer), assembles a
comprehensive Lovable prompt, and triggers a build via Build-with-URL.

The Developer agent is intentionally thin — most of the engineering judgment
lives in Strategy's `build_scope_lovable_prompt` and Designer's design tokens.
Developer's job is to assemble, validate, execute, and capture results.
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


def _assemble_lovable_prompt(plan: dict[str, Any], design: dict[str, Any]) -> str:
    """Combine Strategy plan + Designer tokens into a single Lovable prompt."""
    parts: list[str] = []

    # Core build prompt from Strategy
    build_prompt = plan.get("build_scope_lovable_prompt", "")
    if build_prompt:
        parts.append(build_prompt)

    # Positioning and target persona for context
    positioning = plan.get("positioning", "")
    if positioning and positioning not in build_prompt:
        parts.append(f"\n## Positioning\n{positioning}")

    target = plan.get("target_persona", "")
    if target and target not in build_prompt:
        parts.append(f"\n## Target User\n{target}")

    # Information architecture
    ia = plan.get("information_architecture", [])
    if ia:
        pages = "\n".join(f"- {page}" for page in ia)
        parts.append(f"\n## Pages\n{pages}")

    # Key components
    components = plan.get("key_components", [])
    if components:
        comp_list = "\n".join(f"- {c}" for c in components)
        parts.append(f"\n## Key Components\n{comp_list}")

    # Visual direction from Strategy
    visual = plan.get("visual_direction", "")
    if visual:
        parts.append(f"\n## Visual Direction\n{visual}")

    # Designer's design tokens (if available)
    if design:
        design_section = []
        palette = design.get("palette") or design.get("color_palette")
        if palette:
            design_section.append(f"Color palette: {palette}")
        typography = design.get("typography") or design.get("type_scale")
        if typography:
            design_section.append(f"Typography: {typography}")
        style = design.get("style") or design.get("visual_style")
        if style:
            design_section.append(f"Style: {style}")
        if design_section:
            parts.append("\n## Design Tokens\n" + "\n".join(design_section))

    # Human adjustments (if any)
    adjustments = plan.get("context", {})
    if isinstance(adjustments, dict):
        instructions = adjustments.get("instructions", "")
        if instructions:
            parts.append(f"\n## Additional Requirements\n{instructions}")

    return "\n".join(parts).strip()


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

            # Try to get plan from Memory Bank first, fall back to payload
            plan = await self.memory.recall(engagement_id, "plan")
            if not plan:
                # Use payload directly as plan (coordinator passes strategy output)
                plan = payload

            if not plan:
                return AgentResult(
                    agent_name="developer",
                    engagement_id=engagement_id,
                    status="error",
                    output={},
                    error_message="No plan available — Strategy hasn't run.",
                )

            # Get design tokens (may be empty if Designer failed)
            design = await self.memory.recall(engagement_id, "design") or {}

            # Assemble the full Lovable prompt
            prompt = _assemble_lovable_prompt(plan, design)

            if not prompt.strip():
                # Fallback: use the raw brief if nothing else is available
                brief = plan.get("brief", payload.get("brief", ""))
                prompt = f"Build a modern, responsive website for the following brief:\n\n{brief}"

            app_name = (plan.get("positioning", "")[:60] or "atlas-build").strip()

            log.info(
                "developer.lovable_build.start",
                engagement_id=engagement_id,
                prompt_chars=len(prompt),
            )

            # Generate Build-with-URL and auto-open in browser
            try:
                build = await self.lovable.build(
                    prompt,
                    app_name=app_name,
                    auto_open=True,
                )
            except Exception as exc:
                log.exception("developer.lovable_build.failed", error=str(exc))
                return AgentResult(
                    agent_name="developer",
                    engagement_id=engagement_id,
                    status="error",
                    output={},
                    error_message=f"Lovable build failed: {exc}",
                )

            # Store the build URL in Memory Bank
            await self.memory.remember(
                engagement_id,
                "build",
                {
                    "lovable_build_url": build.build_url,
                    "lovable_prompt_chars": len(prompt),
                    "app_name": build.app_name,
                },
            )

            log.info(
                "developer.lovable_build.complete",
                engagement_id=engagement_id,
                build_url=build.build_url[:100],
                opened_in_browser=build.opened_in_browser,
            )

            return AgentResult(
                agent_name="developer",
                engagement_id=engagement_id,
                status="ok",
                output={
                    "lovable_build_url": build.build_url,
                    "live_url": "",  # Populated after Lovable finishes building
                    "app_name": build.app_name,
                    "prompt_chars": len(prompt),
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


A2AServer(
    app,
    handler=_handler,
    agent_name="developer",
    description="Assembles a build prompt and launches the site via Lovable.",
    skills=[{
        "id": "build-site",
        "name": "Build Site",
        "description": "Compose a Lovable Build-with-URL prompt from the design spec and initiate the build.",
        "tags": ["build", "lovable", "codegen"],
    }],
)
