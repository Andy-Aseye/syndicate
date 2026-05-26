"""Lovable Build-with-URL client.

Atlas's Developer agent does NOT generate code directly. Instead it builds a
structured prompt (produced by the Strategy agent, enriched by the Designer
agent) and hands it to Lovable via the Build-with-URL integration:

    https://docs.lovable.dev/integrations/build-with-url

The Build-with-URL approach uses `?autosubmit=true` — when the user is logged
into Lovable in their browser, visiting the URL immediately kicks off the
build with zero clicks.

The client is intentionally thin — most of the value comes from how well the
upstream agents craft the prompt, not from how we wrap Lovable's API.
"""
from __future__ import annotations

import logging
import urllib.parse
import webbrowser
from dataclasses import dataclass, field
from typing import Any

_log = logging.getLogger("atlas.lovable")

# Build-with-URL supports prompts up to 50,000 characters.
_MAX_PROMPT_CHARS = 50_000


@dataclass(slots=True)
class LovableBuild:
    """The result of a Build-with-URL invocation."""

    build_url: str
    prompt: str
    app_name: str
    opened_in_browser: bool = False
    raw: dict[str, Any] = field(default_factory=dict)


class LovableClient:
    """Client for the Lovable Build-with-URL integration."""

    def __init__(
        self,
        base_url: str = "https://lovable.dev",
    ) -> None:
        self.base_url = base_url.rstrip("/")

    def build_url(self, prompt: str, *, app_name: str | None = None) -> str:
        """Generate a Build-with-URL link with autosubmit.

        Format: https://lovable.dev/?autosubmit=true#prompt=URL_ENCODED_PROMPT
        When visited by a logged-in user, Lovable immediately starts building.
        """
        truncated = prompt[:_MAX_PROMPT_CHARS]
        if len(prompt) > _MAX_PROMPT_CHARS:
            _log.warning(
                "Prompt truncated from %d to %d chars",
                len(prompt),
                _MAX_PROMPT_CHARS,
            )

        # The prompt goes in the URL fragment (after #) so it's not sent to the server
        # in the HTTP request — it stays client-side and is read by Lovable's JS.
        fragment = urllib.parse.urlencode({"prompt": truncated})
        url = f"{self.base_url}/?autosubmit=true#{fragment}"
        return url

    async def build(
        self,
        prompt: str,
        *,
        app_name: str | None = None,
        auto_open: bool = True,
    ) -> LovableBuild:
        """Generate the Build-with-URL and optionally open it in the user's browser.

        This is the primary integration point. The Developer agent calls this
        with the fully-assembled prompt (Strategy output + Designer tokens +
        any human adjustments). Lovable handles the actual code generation.
        """
        url = self.build_url(prompt, app_name=app_name)

        opened = False
        if auto_open:
            try:
                webbrowser.open(url)
                opened = True
                _log.info("Opened Lovable build URL in browser")
            except Exception as exc:
                _log.warning("Could not auto-open browser: %s", exc)

        _log.info(
            "lovable.build_url.generated",
            extra={
                "app_name": app_name or "atlas-build",
                "prompt_chars": len(prompt),
                "auto_opened": opened,
            },
        )

        return LovableBuild(
            build_url=url,
            prompt=prompt,
            app_name=app_name or "atlas-build",
            opened_in_browser=opened,
        )

    async def close(self) -> None:
        """No-op — no persistent connections to close."""
        pass
