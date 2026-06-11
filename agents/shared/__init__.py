"""Shared utilities for Atlas agents: A2A, memory, observability, types."""
from dotenv import load_dotenv
load_dotenv()

from .types import Engagement, EngagementPhase, AgentResult
from .memory import MemoryBank
from .a2a import A2AClient, A2AServer
from .observability import setup_tracing, get_logger

__all__ = [
    "Engagement",
    "EngagementPhase",
    "AgentResult",
    "MemoryBank",
    "A2AClient",
    "A2AServer",
    "setup_tracing",
    "get_logger",
    "run_agent",
]

# ---------------------------------------------------------------------------
# Standalone helper for ADK Agent invocation
# Google ADK uses a `Runner` architecture, but for simple agent invocations
# it's convenient to have a direct call. This is a standalone async function
# instead of a monkey-patch on BaseAgent, because newer ADK versions use
# `.run(ctx=..., node_input=...)` internally and patching breaks that.
#
# ADK 1.33+: Events are `google.adk.events.Event` with:
#   - event.content.parts[].text  → raw LLM text (JSON when output_schema set)
#   - event.actions.state_delta   → parsed output (only if output_key is set)
#   - event.is_final_response()   → True on the last model response
# ---------------------------------------------------------------------------
import json
import logging
import uuid

from google.adk.runners import Runner
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.genai import types

_polyfill_log = logging.getLogger("atlas.polyfill")


class _RunResult:
    def __init__(self, output):
        self.output = output


def _strip_json_fences(text: str) -> str:
    """Remove a surrounding markdown code fence (```json ... ```) if present.

    Models sometimes wrap structured output in fences even when asked for raw
    JSON; json.loads then fails and the agent reports "no structured output".
    """
    stripped = text.strip()
    if not stripped.startswith("```"):
        return stripped
    # Drop the opening fence line (``` or ```json) and a trailing ``` line.
    lines = stripped.splitlines()
    lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()


async def run_agent(agent, prompt: str):
    """Run an ADK agent with a simple text prompt and return a _RunResult."""
    session_svc = InMemorySessionService()
    session_id = str(uuid.uuid4())
    await session_svc.create_session(
        app_name="atlas", user_id="system", session_id=session_id
    )

    runner = Runner(app_name="atlas", agent=agent, session_service=session_svc)
    msg = types.Content(role="user", parts=[types.Part.from_text(text=prompt)])

    output = None
    last_text = None

    async for event in runner.run_async(
        user_id="system", session_id=session_id, new_message=msg
    ):
        # 1. Check state_delta (populated when output_key is set on the agent)
        if event.actions and event.actions.state_delta:
            for _key, val in event.actions.state_delta.items():
                output = val

        # 2. Capture text from content parts (skip thought/reasoning tokens)
        if event.content and event.content.parts:
            text = "".join(
                p.text
                for p in event.content.parts
                if p.text and not getattr(p, "thought", False)
            )
            if text.strip():
                last_text = text

    # If we got output from state_delta, use it directly.
    # Otherwise, parse the last text response against output_schema.
    if output is None and last_text is not None:
        schema = getattr(agent, "output_schema", None)
        if schema is not None:
            try:
                data = json.loads(_strip_json_fences(last_text))
                output = schema.model_validate(data)
            except (json.JSONDecodeError, Exception) as exc:
                _polyfill_log.warning(
                    "Failed to parse LLM output as %s: %s — raw text: %.200s",
                    schema.__name__,
                    exc,
                    last_text,
                )
                output = None
        else:
            output = last_text

    return _RunResult(output=output)


