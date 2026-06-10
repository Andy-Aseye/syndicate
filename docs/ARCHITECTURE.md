# Atlas — Architecture

*Parts of this document describe the planned full system; see [README.md](../README.md) for what is implemented in the current submission.*

## System diagram

See the Mermaid diagram in [README.md](../README.md#architecture). The Devpost submission uses a polished Excalidraw export of the same topology.

## Request lifecycle

A single client engagement walks the following sequence. Each arrow is an A2A call; each box is a separate Cloud Run service.

```
Client (web intake form)
    │
    ▼
Dashboard /engagements/new ──── creates Engagement doc in Firestore
    │
    ▼
Coordinator (state machine)
    │
    ├─► Discovery (gemini-2.5-pro; structured requirements from the brief)
    │       └─ writes Requirements to Memory Bank
    │
    ├─► Strategy (gemini-2.5-pro, output_schema=Plan)
    │       └─ writes Plan (including build_scope_lovable_prompt) to Memory Bank
    │
    ├─► Designer (gemini-2.5-flash + imagen-3.0 → hero imagery + design tokens)
    │       └─ writes design.tokens to Memory Bank
    │
    ├─► Developer (LovableClient.build() with the Strategy prompt + Designer tokens)
    │       ├─ Lovable Build-with-URL kicks off
    │       ├─ poll until ready
    │       └─ writes live_url to Memory Bank + Engagement.deployedUrl
    │
    ├─► PM (Lighthouse QA → dashboard QA report)
    │       └─ writes review notes to Memory Bank
    │
    └─► Account (launch email via agency-mcp send_email → Resend; 30-day plan)
            └─ Memory Profiles for per-client recall
```

## Why each piece is here

- **A2A protocol** instead of in-process function calls — every agent can deploy independently, scale independently, and roll back independently. Same pattern SalesShortcut (ADK 2025 Grand Prize) used with 5 microservices.
- **Memory Bank** instead of passing state in payloads — handoffs survive process restarts, agents can be re-run idempotently, and the dashboard can render any past state by re-reading memory.
- **Per-agent service accounts** — every agent has its own Google Cloud identity. Agent Gateway can enforce per-agent rate limits; Model Armor can attribute prompt-injection attempts; audit logs are clean.
- **Firestore for hot data, BigQuery for evals** — hot reads from the dashboard go to Firestore (sub-second). Eval scores accumulate in BigQuery for the writeup's metrics table and the demo's "we ran 50 synthetic clients" claim.
- **Lovable for codegen** — Atlas does NOT compete with Lovable. The Developer agent is a 200-line wrapper. Strategic positioning: "We orchestrate Lovable + everything Lovable doesn't do." This eliminates the biggest competitive risk for the submission.

## Multi-tenant isolation

Three layers:

1. **Auth layer** — Clerk Organizations. Every signed-in user has an `org_id` (or falls back to `user_id`). This becomes the `tenantId` on every document.
2. **Data layer** — Firestore security rules check `tenantId == request.auth.token.org_id`. See [infra/firestore.rules](../infra/firestore.rules).
3. **Secret layer** — Per-client Stripe/Shopify credentials are encrypted with a Cloud KMS key. Each agent's service account has KMS Decrypter only for clients in its own tenant (enforced via IAM conditions).

## Governance (Track 2 deliverables)

- **Agent Identity** — Each agent has its own service account (provisioned by Terraform).
- **Agent Gateway** — All A2A traffic routes through Gateway with rate limits and policy.
- **Model Armor** — Every LLM call is wrapped; prompt-injection samples are tested in `scripts/eval-harness.py`.
- **Agent Observability** — Cloud Trace + Agent Observability gives the live agent-graph view on the dashboard.

## Open questions (decide during W1)

- **Custom domain strategy** — Lovable Cloud handles their own SSL. For Atlas's own dashboard, route `useatlas.ai` to Cloud Run via Cloud Load Balancing.
- **Cost ceiling per engagement** — soft cap at $5/engagement (target: closer to $1) using Agent Gateway quotas + per-tenant Vertex budget alerts.
- **Failure recovery** — if an agent crashes mid-engagement, Coordinator re-runs it idempotently (because all state is in Memory Bank, not the agent's process memory). Verify in W3 chaos tests.
