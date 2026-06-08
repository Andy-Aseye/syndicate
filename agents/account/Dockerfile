# Atlas Coordinator
FROM python:3.11-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Python deps (build context = repo root; we install the whole agents package)
COPY agents/pyproject.toml ./agents/pyproject.toml
COPY agents/__init__.py ./agents/__init__.py
RUN pip install --no-cache-dir -e ./agents

# agency-mcp server: Account spawns it over stdio (via ADK McpToolset) to send
# the launch email. Installing it here exposes the `mcp-server-agency` entry point.
COPY mcp ./mcp
RUN pip install --no-cache-dir -e ./mcp

# App code
COPY agents/shared ./agents/shared
COPY agents/account ./agents/account

ENV PYTHONUNBUFFERED=1
ENV PORT=8080
EXPOSE 8080

CMD ["uvicorn", "agents.account.agent:app", "--host", "0.0.0.0", "--port", "8080"]
