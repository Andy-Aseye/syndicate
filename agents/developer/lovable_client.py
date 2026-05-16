"""Lovable Build-with-URL client.

Atlas's Developer agent does NOT generate code directly. Instead it builds a
structured prompt (produced by the Strategy agent) and hands it to Lovable
via the Build-with-URL beta API:

    https://docs.lovable.dev/integrations/build-with-url

The client is intentionally thin — most of the value comes from how well
Strategy crafts the prompt, not from how cleverly we wrap Lovable's API.
"""
from __future__ import annotations

import asyncio
import os
import urllib.parse
from dataclasses import dataclass
from typing import Any

import httpx


@dataclass(slots=True)
class LovableBuild:
    """The result of a Build-with-URL invocation."""

    project_id: str
    project_url: str
    preview_url: str | None
    raw: dict[str, Any]


class LovableClient:
    """Async client for the Build-with-URL API."""

    def __init__(
        self,
        api_token: str | None = None,
        base_url: str | None = None,
        timeout_s: float = 120.0,
    ) -> None:
        self.api_token = api_token or os.environ.get("LOVABLE_API_TOKEN", "")
        self.base_url = (
            base_url or os.environ.get("LOVABLE_BASE_URL", "https://lovable.dev")
        ).rstrip("/")
        self._http = httpx.AsyncClient(
            timeout=timeout_s,
            headers={
                "Authorization": f"Bearer {self.api_token}" if self.api_token else "",
                "User-Agent": "atlas/0.1 (+https://useatlas.ai)",
            },
        )

    def build_url(self, prompt: str, *, app_name: str | None = None) -> str:
        """Return a Build-with-URL link that, when visited, starts a new project.

        This is the lowest-friction integration: embed this URL in a Slack
        message or button and the client (or Atlas) clicks it to kick off the
        build.
        """
        params: dict[str, str] = {"prompt": prompt}
        if app_name:
            params["name"] = app_name
        return f"{self.base_url}/build?{urllib.parse.urlencode(params)}"

    async def build(
        self,
        prompt: str,
        *,
        app_name: str | None = None,
        image_urls: list[str] | None = None,
        poll_interval_s: float = 5.0,
        max_wait_s: float = 600.0,
    ) -> LovableBuild:
        """Programmatically start a Lovable build and wait for the project URL.

        NOTE (Andy, W1 Day 3): The exact JSON endpoint and payload shape for
        the programmatic Build-with-URL call should be verified against the
        current docs at https://docs.lovable.dev/integrations/lovable-api —
        the shape below is the documented contract as of May 2026.
        """
        payload: dict[str, Any] = {"prompt": prompt}
        if app_name:
            payload["name"] = app_name
        if image_urls:
            payload["images"] = image_urls

        response = await self._http.post(
            f"{self.base_url}/api/v1/builds",
            json=payload,
        )
        response.raise_for_status()
        data: dict[str, Any] = response.json()
        project_id: str = data["project_id"]

        # Poll until the project is built.
        elapsed = 0.0
        while elapsed < max_wait_s:
            status_resp = await self._http.get(
                f"{self.base_url}/api/v1/projects/{project_id}"
            )
            status_resp.raise_for_status()
            status_data = status_resp.json()
            if status_data.get("status") == "ready":
                return LovableBuild(
                    project_id=project_id,
                    project_url=status_data["url"],
                    preview_url=status_data.get("preview_url"),
                    raw=status_data,
                )
            await asyncio.sleep(poll_interval_s)
            elapsed += poll_interval_s

        raise TimeoutError(
            f"Lovable build {project_id} did not reach ready in {max_wait_s}s"
        )

    async def deploy(self, project_id: str, *, custom_domain: str | None = None) -> str:
        """Deploy the project. Returns the live URL."""
        payload: dict[str, Any] = {}
        if custom_domain:
            payload["custom_domain"] = custom_domain
        response = await self._http.post(
            f"{self.base_url}/api/v1/projects/{project_id}/deploy",
            json=payload,
        )
        response.raise_for_status()
        return response.json()["live_url"]

    async def close(self) -> None:
        await self._http.aclose()
