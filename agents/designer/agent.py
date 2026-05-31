"""Designer agent.

Reads the Plan from Strategy and produces concrete design tokens + a Lovable
design addendum that the Developer agent appends to its build prompt.
Image generation (Gemini 3 Image) is W2.
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from google.adk.agents import LlmAgent
from pydantic import BaseModel

from agents.shared import A2AServer, AgentResult, MemoryBank, get_logger, run_agent, setup_tracing

log = get_logger("designer")
tracer = setup_tracing("atlas-designer")


class DesignSpec(BaseModel):
    primary_color: str            # hex, e.g. "#1a1a2e"
    secondary_color: str
    accent_color: str
    font_heading: str             # e.g. "Geist, sans-serif"
    font_body: str
    visual_mood: str              # 1–2 sentences describing the feel
    layout_description: str       # paragraph describing key layout decisions
    lovable_design_addendum: str  # design brief to append to the Lovable prompt
    hero_image_url: str | None = None
    moodboard_url: str | None = None


designer_agent = LlmAgent(
    name="designer",
    model=os.environ.get("GEMINI_MODEL_FLASH", "gemini-2.5-flash"),
    instruction=(
        "You are the Designer agent for Atlas. Given a strategy Plan, produce concrete "
        "design decisions: colour palette (hex codes), typography stack, layout approach, "
        "and visual mood. Then write `lovable_design_addendum` — a focused 100-200 word "
        "design brief to append to the Lovable Build-with-URL prompt. "
        "CRITICAL: Enforce Awwwards-Level Premium UI Architecture: "
        "1. PALETTE: Deep ink-blacks (#0B0B0C), pristine whites, and one ultra-premium accent color exclusively for active states. "
        "2. TYPOGRAPHY: Heavy uppercase geometric sans-serif for headers + clean monospaced font (like JetBrains Mono) for data metrics. "
        "3. FRAMING: Faint 1px borders (#FFFFFF10) and minimum 120px vertical padding. "
        "Align everything tightly with the `visual_direction` in the strategy plan."
    ),
    output_schema=DesignSpec,
)


class DesignerService:
    def __init__(self) -> None:
        self.memory = MemoryBank()

    async def invoke(
        self,
        engagement_id: str,
        payload: dict[str, Any],
        require_approval: bool = False,
    ) -> AgentResult:
        with tracer.start_as_current_span("designer.invoke") as span:
            span.set_attribute("engagement_id", engagement_id)

            plan = await self.memory.recall(engagement_id, "plan")
            if not plan:
                plan = {k: v for k, v in payload.items() if k != "engagement_id"}

            response = await run_agent(
                designer_agent,
                f"Strategy plan:\n{plan}\n\nProduce the DesignSpec."
            )

            if response.output is None:
                log.warning("designer.no_output", engagement_id=engagement_id)
                return AgentResult(
                    agent_name="designer",
                    engagement_id=engagement_id,
                    status="error",
                    output={},
                    error_message="Designer agent returned no structured output.",
                )

            spec: DesignSpec = response.output

            # --- Vertex AI Imagen Generation ---
            try:
                from google import genai
                from google.genai import types
                import base64
                
                client = genai.Client()
                log.info("designer.generating_image", engagement_id=engagement_id)
                
                # Generate Hero Image
                img_result = client.models.generate_images(
                    model='imagen-3.0-generate-001',
                    prompt=f"A high-end, Awwwards-winning website hero section. Modern, clean, sleek, premium agency aesthetic. Theme: {spec.visual_mood}. Primary color: {spec.primary_color}.",
                    config=types.GenerateImagesConfig(
                        number_of_images=1,
                        output_mime_type="image/jpeg",
                        aspect_ratio="16:9"
                    )
                )
                
                if img_result.generated_images:
                    image_obj = img_result.generated_images[0].image
                    if image_obj and image_obj.image_bytes:
                        b64 = base64.b64encode(image_obj.image_bytes).decode('utf-8')
                        spec.hero_image_url = f"data:image/jpeg;base64,{b64}"
                        log.info("designer.image_generated_success", engagement_id=engagement_id)
            except Exception as e:
                log.error("designer.image_generation_failed", error=str(e), exc_info=True)
                # Fallback to a placeholder if Imagen fails (e.g. no quota or ADC not set)
                spec.hero_image_url = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80"
            # -----------------------------------

            await self.memory.remember(engagement_id, "design", spec.model_dump())

            log.info("designer.complete", engagement_id=engagement_id)
            return AgentResult(
                agent_name="designer",
                engagement_id=engagement_id,
                status="ok",
                output=spec.model_dump(),
                next_agent="developer",
            )


service: DesignerService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    global service
    service = DesignerService()
    log.info("designer.started")
    yield


app = FastAPI(title="Atlas Designer", lifespan=lifespan)


async def _handler(
    engagement_id: str,
    payload: dict[str, Any],
    require_approval: bool = False,
) -> AgentResult:
    assert service is not None
    return await service.invoke(engagement_id, payload, require_approval)


A2AServer(app, handler=_handler)
