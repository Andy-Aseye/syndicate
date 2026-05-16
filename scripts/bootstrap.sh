#!/usr/bin/env bash
# Atlas bootstrap — fresh clone to "make dev works" in <2 minutes.
#
# Why uv (not Homebrew python@3.11): uv ships hermetic Python builds via
# python-build-standalone, which statically link C deps (libexpat, libssl,
# libffi, ...). On macOS this eliminates the symbol-mismatch class of bugs
# that bricks Homebrew's bottle every time Apple rev's a system library.

set -euo pipefail
cd "$(dirname "$0")/.."

echo "═══════════════════════════════════════════════════════════════"
echo "  Atlas Bootstrap"
echo "═══════════════════════════════════════════════════════════════"

# ---- Sanity checks ----
if [[ -d "$HOME/.npm" && ! -w "$HOME/.npm" ]]; then
  echo "FATAL: ~/.npm is not writable. A prior 'sudo npm' poisoned it."
  echo "Fix:   sudo chown -R \$(id -u):\$(id -g) ~/.npm"
  exit 1
fi

command -v uv   >/dev/null || { echo "FATAL: Need uv. Install: brew install uv"; exit 1; }
command -v node >/dev/null || { echo "FATAL: Need Node 20+. Install: brew install node@20"; exit 1; }
# gcloud is only required for deploy + Vertex auth; warn but don't block dev setup.
command -v gcloud >/dev/null || \
  echo "WARN: gcloud SDK not installed. Required for 'make deploy' and Vertex auth. https://cloud.google.com/sdk/docs/install"

# ---- 1. Hermetic Python 3.11 + venv ----
echo "→ [1/5] Provisioning Python 3.11 (standalone) and .venv via uv ..."
uv python install 3.11
rm -rf .venv
uv venv --python 3.11 .venv
# shellcheck disable=SC1091
source .venv/bin/activate
uv pip install -e ./agents
uv pip install -e ./mcp

# ---- 2. Node deps for dashboard ----
echo "→ [2/5] Installing dashboard deps ..."
( cd apps/dashboard && npm install )

# ---- 3. .env file ----
if [[ ! -f .env ]]; then
  echo "→ [3/5] Creating .env from .env.example ..."
  cp .env.example .env
  echo "  Edit .env and fill in your keys before running 'make dev'."
else
  echo "→ [3/5] .env already exists — keeping it."
fi

# ---- 4. Git init (if not already) ----
if [[ ! -d .git ]]; then
  echo "→ [4/5] Initializing git repo ..."
  git init -b main
  git add .
  git commit -m "atlas: initial scaffold"
else
  echo "→ [4/5] Git repo already initialized."
fi

# ---- 5. Firebase emulator config ----
echo "→ [5/5] Writing firebase.json ..."
cat > firebase.json <<'JSON'
{
  "firestore": {
    "rules": "infra/firestore.rules"
  },
  "emulators": {
    "firestore": { "port": 8089 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
JSON

echo "
═══════════════════════════════════════════════════════════════
  Bootstrap complete.

  Next steps:
    1. Fill in .env with your keys (Clerk, Lovable, GCP project)
    2. Authenticate with gcloud:
         gcloud auth application-default login
         gcloud config set project YOUR_PROJECT_ID
    3. Run locally:
         make dev
    4. Provision cloud infra:
         cd infra/terraform && terraform init && terraform apply

  Then visit http://localhost:3000.
═══════════════════════════════════════════════════════════════
"
