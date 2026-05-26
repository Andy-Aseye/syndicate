"""Observability: structured logging + Cloud Trace + Agent Observability.

Every agent invocation creates a span. Spans bubble up to Agent Observability,
where they're visualized as the agent graph the dashboard renders.
"""
from __future__ import annotations

import logging
import os
import sys

import structlog
from opentelemetry import trace
from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor


def setup_tracing(service_name: str) -> trace.Tracer:
    """Install Cloud Trace exporter and return a tracer for the calling service.

    In local dev (no GOOGLE_CLOUD_PROJECT), spans are still created via the
    in-memory provider but never exported. Agents stay runnable without GCP creds.
    """
    provider = TracerProvider()
    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    if project and project != "demo":
        exporter = CloudTraceSpanExporter(project_id=project)
        provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    return trace.get_tracer(service_name)


def get_logger(name: str) -> structlog.BoundLogger:
    """JSON-structured logger that Cloud Logging parses natively."""
    log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, log_level)
        ),
    )
    return structlog.get_logger(name)
