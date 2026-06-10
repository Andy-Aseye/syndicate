"""Discovery agent.

Conducts a voice intake call with a new client using Gemini Live, transcribes
the conversation, extracts structured requirements, and writes a brief.

Run:
    uvicorn agents.discovery.agent:app --reload --port 8081
"""
from __future__ import annotations

import os
import re
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from google.adk.agents import LlmAgent
from google.adk.tools import google_search, url_context
from pydantic import BaseModel

from agents.shared import (
    A2AServer,
    AgentResult,
    MemoryBank,
    get_logger,
    run_agent,
    setup_tracing,
)

log = get_logger("discovery")
tracer = setup_tracing("atlas-discovery")

_URL_RE = re.compile(r"https?://[^\s)>\]]+", re.IGNORECASE)


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
    name="discovery_extractor",
    model=os.environ.get("GEMINI_MODEL_PRO", "gemini-2.5-pro"),
    instruction=(
        "You are the Discovery agent for Atlas, an AI-powered digital agency operator. "
        "You will be given a client brief or voice transcript. Extract the structured "
        "Requirements schema. Do not hallucinate fields — if the client didn't mention "
        "something, leave it null and add it to `open_questions`. Be conservative. "
        "A brief may be short; that is fine — extract what you can and flag gaps in open_questions."
    ),
    output_schema=Requirements,
)


# ---------------------------------------------------------------------------
# Research grounding — a tool-using sub-agent (NO output_schema) that fetches
# real context before extraction. ADK constraint: output_schema + tools is
# unreliable on Gemini 2.5, and only one built-in tool is allowed per agent,
# so we pick url_context (when the brief names a URL) OR google_search.
# ---------------------------------------------------------------------------
_MODEL_PRO = os.environ.get("GEMINI_MODEL_PRO", "gemini-2.5-pro")


async def _research_context(brief: str, client_company: str | None) -> str:
    """Ground discovery in the client's real business. Returns a research
    summary (or "" if research is unavailable/fails — never raises)."""
    match = _URL_RE.search(brief or "")
    url = match.group(0).rstrip(".,") if match else None

    try:
        if url:
            research_agent = LlmAgent(
                name="discovery_research_url",
                model=_MODEL_PRO,
                instruction=(
                    "You are a research assistant for a digital agency. Fetch the "
                    "provided URL and summarize the business: what they do, their "
                    "products/services, target audience, tone/brand voice, and any "
                    "visual style cues. Be factual and concise; do not invent details."
                ),
                tools=[url_context],
            )
            prompt = f"Fetch and summarize this site: {url}\n\nClient brief: {brief}"
        else:
            query_subject = client_company or (brief[:120] if brief else "")
            if not query_subject.strip():
                return ""
            research_agent = LlmAgent(
                name="discovery_research_search",
                model=_MODEL_PRO,
                instruction=(
                    "You are a research assistant for a digital agency. Use Google "
                    "Search to research the company and summarize: what they do, their "
                    "products/services, target audience, tone/brand voice, and any "
                    "visual style cues. Be factual and concise; do not invent details. "
                    "If you cannot find the company, say so briefly."
                ),
                tools=[google_search],
            )
            prompt = (
                f"Research this company and summarize its business.\n"
                f"Company: {query_subject}\nClient brief: {brief}"
            )

        result = await run_agent(research_agent, prompt)
        summary = result.output if isinstance(result.output, str) else None
        if summary and summary.strip():
            log.info("discovery.research_complete", grounded_via="url" if url else "search")
            return summary.strip()
    except Exception as exc:  # never block discovery on research failure
        log.warning("discovery.research_failed", error=str(exc))
    return ""


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

            # Accept transcript (voice/paste), brief (web form), or phone (Gemini Live).
            transcript = payload.get("transcript") or payload.get("brief")
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
                    error_message="No transcript, brief, or phone provided.",
                )

            # Ground the extraction in the client's real business (ADK built-in
            # tools: url_context when the brief names a URL, else google_search).
            research_summary = await _research_context(
                transcript, payload.get("client_company") or payload.get("clientCompany")
            )
            extraction_input = transcript
            if research_summary:
                extraction_input = (
                    f"{transcript}\n\n"
                    f"--- Research findings (grounding; treat as factual context) ---\n"
                    f"{research_summary}"
                )

            # Extract structured requirements.
            response = await run_agent(extraction_agent, extraction_input)
            requirements: Requirements | None = response.output

            if requirements is None:
                log.warning(
                    "discovery.extraction_failed",
                    engagement_id=engagement_id,
                    detail="LLM did not return parseable Requirements",
                )
                return AgentResult(
                    agent_name="discovery",
                    engagement_id=engagement_id,
                    status="error",
                    output={},
                    error_message=(
                        "Failed to extract structured requirements from the brief. "
                        "The model response could not be parsed. Please try again."
                    ),
                )

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


A2AServer(
    app,
    handler=_handler,
    agent_name="discovery",
    description="Extracts goals, audience, and constraints from a client brief.",
    skills=[{
        "id": "discover-requirements",
        "name": "Discover Requirements",
        "description": "Turn a raw client brief into structured goals, target audience, and project constraints.",
        "tags": ["intake", "requirements"],
    }],
)


# ---------------------------------------------------------------------------
# Audio transcription — additive endpoint used by the dashboard intake form.
# Accepts the raw audio bytes as the request body (Content-Type = audio mime)
# rather than multipart, so no extra dependency (python-multipart) is needed.
# Auth/transport: the dashboard's authenticated API route proxies to this.
# ---------------------------------------------------------------------------
_MAX_AUDIO_BYTES = 20 * 1024 * 1024  # ~20MB inline limit

# Map common browser/file mime types onto what Gemini accepts.
_AUDIO_MIME_MAP = {
    "audio/mpeg": "audio/mp3",
    "audio/mp3": "audio/mp3",
    "audio/mp4": "audio/mp4",
    "audio/m4a": "audio/mp4",
    "audio/x-m4a": "audio/mp4",
    "audio/aac": "audio/aac",
    "audio/wav": "audio/wav",
    "audio/x-wav": "audio/wav",
    "audio/wave": "audio/wav",
}

_TRANSCRIPTION_PROMPT = (
    "Transcribe this audio recording of a client discovery call verbatim. "
    "Output ONLY the transcript text — no preamble, no commentary, no markdown "
    "fences. If you can distinguish multiple speakers, prefix their lines with "
    "'Speaker 1:', 'Speaker 2:', etc."
)


@app.post("/transcribe")
async def transcribe_audio(request: Request):
    """Transcribe an uploaded audio file (mp3/m4a/wav) with Gemini."""
    raw_mime = (request.headers.get("content-type") or "").split(";")[0].strip().lower()
    mime = _AUDIO_MIME_MAP.get(raw_mime)
    if not mime:
        return JSONResponse(
            status_code=415,
            content={"error": f"Unsupported audio type '{raw_mime}'. Use mp3, m4a, or wav."},
        )

    data = await request.body()
    if not data:
        return JSONResponse(status_code=400, content={"error": "Empty request body."})
    if len(data) > _MAX_AUDIO_BYTES:
        return JSONResponse(
            status_code=413,
            content={"error": "Audio file too large (max ~20MB)."},
        )

    try:
        from google import genai
        from google.genai import types

        # Respects GOOGLE_GENAI_USE_VERTEXAI / GOOGLE_CLOUD_PROJECT /
        # GOOGLE_CLOUD_LOCATION (or GEMINI_API_KEY) — same auth path as the
        # rest of the agents.
        client = genai.Client()
        model = os.environ.get("GEMINI_MODEL_FLASH", "gemini-2.5-flash")
        response = await client.aio.models.generate_content(
            model=model,
            contents=[
                types.Part.from_bytes(data=data, mime_type=mime),
                _TRANSCRIPTION_PROMPT,
            ],
        )
        transcript = (response.text or "").strip()
        if not transcript:
            return JSONResponse(
                status_code=502,
                content={"error": "Transcription returned no text. Try again or paste the transcript."},
            )
        log.info("discovery.transcribe_complete", bytes=len(data), chars=len(transcript))
        return {"transcript": transcript}
    except Exception as exc:  # noqa: BLE001 — degrade to a clear client error
        log.error("discovery.transcribe_failed", error=str(exc))
        return JSONResponse(
            status_code=502,
            content={"error": "Transcription failed. Try again or paste the transcript."},
        )
