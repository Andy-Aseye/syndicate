"""Shared utilities for Atlas agents: A2A, memory, observability, types."""
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
]
