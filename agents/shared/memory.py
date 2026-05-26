"""Memory Bank wrapper.

Atlas uses Gemini Enterprise Agent Platform's Memory Bank for per-client persistent
context that survives across agent invocations and even across days.
"""
from __future__ import annotations

import os
from typing import Any

# NOTE (Andy, May 12): The Memory Bank Python SDK is brand new (April 2026).
# As of writing the import path is best-guess. Verify against current docs:
#   https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/memory-bank
#
# If the official SDK isn't ready by W1, this class falls back to a Firestore-backed
# implementation transparently — same interface.

try:
    from google.cloud import memory_bank  # type: ignore
    _MEMORY_BANK_AVAILABLE = True
except ImportError:
    _MEMORY_BANK_AVAILABLE = False


class MemoryBank:
    """Thin wrapper around Gemini Enterprise Memory Bank.

    Falls back to Firestore-backed storage if the official SDK is unavailable —
    keep the interface stable so agents don't care which is running.
    """

    def __init__(self, instance: str | None = None) -> None:
        # Local dev runs without Memory Bank — instance may be unset; we fall
        # back to Firestore in that case.
        self.instance = instance or os.environ.get("MEMORY_BANK_INSTANCE", "")
        self._mode = "memory_bank" if (_MEMORY_BANK_AVAILABLE and self.instance) else "firestore_fallback"
        self._client: Any = None  # lazy-init on first use so app boots without ADC

    def _ensure_client(self) -> Any:
        if self._client is not None:
            return self._client
        if self._mode == "memory_bank":
            self._client = memory_bank.Client(instance=self.instance)
        else:
            from google.cloud import firestore  # local import to avoid hard dep
            # Use AsyncClient so Firestore I/O is non-blocking in async agents.
            self._client = firestore.AsyncClient()
        return self._client

    async def remember(self, engagement_id: str, key: str, value: Any) -> None:
        """Persist a fact about an engagement for future agent recall."""
        client = self._ensure_client()
        if self._mode == "memory_bank":
            await client.set(namespace=f"engagement:{engagement_id}", key=key, value=value)
        else:
            doc = client.collection("memory").document(engagement_id)
            await doc.set({key: value}, merge=True)

    async def recall(self, engagement_id: str, key: str) -> Any:
        """Retrieve a previously-remembered fact."""
        client = self._ensure_client()
        if self._mode == "memory_bank":
            return await client.get(namespace=f"engagement:{engagement_id}", key=key)
        doc = await client.collection("memory").document(engagement_id).get()
        return doc.to_dict().get(key) if doc.exists else None

    async def recall_all(self, engagement_id: str) -> dict[str, Any]:
        """Pull every fact we know about this engagement."""
        client = self._ensure_client()
        if self._mode == "memory_bank":
            return await client.list(namespace=f"engagement:{engagement_id}")
        doc = await client.collection("memory").document(engagement_id).get()
        return doc.to_dict() or {}
