# Rubicx's Syndicate — Build plan

Solo, ~160 hours, May 9 → June 5, 2026. Submit Wed June 3 evening (48h buffer before the June 5 deadline).

## Pre-W1 (Sat May 10 – Sun May 11) — ADK bootcamp

Goal: leave the weekend able to write ADK agents fluently.

- [ ] **Sat morning** — Run the [Build Multi-Agent Systems with ADK codelab](https://codelabs.developers.google.com/codelabs/production-ready-ai-with-gc/3-developing-agents/build-a-multi-agent-system-with-adk) end-to-end (~4h).
- [ ] **Sat afternoon** — Run the Agent Garden tour. Pick the SDR template; deploy it to your dev Cloud Run.
- [ ] **Sat evening** — Skim the A2A protocol spec + Memory Bank quickstart.
- [ ] **Sun** — Build a toy 2-agent app (Coordinator + one sub-agent) using THIS scaffold. Get `make dev` to print "Hello from Rubicx's Syndicate Coordinator" and route one A2A call.
- [ ] **In parallel** — Send 10–12 outreach DMs to potential pilot clients. Target 3 yeses by Mon.
- [ ] **Domain** — Register `useatlas.ai` (or `joinatlas.com`). Point at Cloud Run later.

## W1 (Mon May 12 – Sat May 17) — Foundation + Discovery/Strategy/Developer + 1 real client

### Mon — Foundation

- [ ] Run `terraform apply` in `infra/terraform/` to provision project + Firestore + KMS + agent SAs.
- [ ] Push the scaffold to a private GitHub repo. Wire Cloud Build triggers from `infra/cloudbuild.yaml`.
- [ ] Set up Clerk account; copy keys into `.env`. Configure Clerk Organizations (this gives multi-tenant out of the box).
- [ ] Local boot: `make bootstrap && make dev`. End-of-day check: visit http://localhost:3000, sign up, see the empty engagements page.

### Tue — Discovery agent

- [ ] Wire `agents/discovery/agent.py` to a Gemini 3 Pro `LlmAgent` with the `Requirements` schema (already stubbed).
- [ ] Add a `/discovery/transcript` POST endpoint (W1 fallback for paste-transcript) in `apps/dashboard/app/api/discovery/transcript/route.ts`.
- [ ] Wire end-to-end: paste a real transcript → see structured requirements appear in the dashboard.

### Wed — Strategy agent

- [ ] Wire `agents/strategy/agent.py` to consume Requirements from Memory Bank and emit a Plan.
- [ ] Verify the Plan's `build_scope_lovable_prompt` field is ≥200 words and specific.
- [ ] Add a Strategy panel in the engagement detail view that renders the Plan.

### Thu — Developer agent + Lovable round-trip

- [ ] Confirm Lovable API access (token + endpoint) using the [Build-with-URL docs](https://docs.lovable.dev/integrations/build-with-url).
- [ ] Wire `lovable_client.build(...)` end-to-end. First test: send a hard-coded prompt, get back a project_id, see the project in Lovable's UI.
- [ ] Wire `lovable_client.deploy(...)`. End-of-day: a real `live_url` written to Memory Bank.

### Fri — First real client engagement

- [ ] Pick a willing Rubicx client. Pre-record a Discovery call (or use the paste-transcript path).
- [ ] Run them all the way through the Syndicate: Discovery → Strategy → Developer → deployed Lovable site.
- [ ] Capture: total time, total cost (Vertex API + Lovable), one quote.

### Sat — Reflection + W2 plan

- [ ] If anything blocked the Fri client run, fix it. If everything worked, send the live URL to two more prospects to lock in W2 candidates.
- [ ] Write the rough draft of the Medium post (publish in W2).

**W1 exit criterion:** one real Lovable-built site shipped through the Syndicate for a paying Rubicx client.

## W2 (Mon May 18 – Sun May 24) — All 6 agents + dashboard polish + Medium post

### Mon-Tue — Designer + Nano Banana Pro

- [ ] Replace `agents/designer/agent.py` stub with real Nano Banana Pro calls (`gemini-3.0-flash-image-preview`).
- [ ] Output: hero imagery + lookbook + extracted design tokens (palette, type scale).
- [ ] Inject design tokens into the Strategy's Lovable prompt so the site picks them up.

### Wed — PM agent + agency-mcp tools

- [ ] Wire real Slack + Linear tools in `mcp/agency_mcp_server.py`.
- [ ] PM agent now: posts daily digest to Slack channel `#atlas-{client-slug}`, files blockers as Linear issues.

### Thu — Memory Bank + Memory Profiles

- [ ] Confirm the official Memory Bank SDK works (else stay on the Firestore fallback in `shared/memory.py`).
- [ ] Add Memory Profiles per client for the Account agent's long-running recall.

### Fri-Sat — Account agent + dashboard polish

- [ ] Lighthouse runs from Account agent (via `npx unlighthouse`).
- [ ] Engagement detail page: live agent graph (React Flow), traces panel, artifacts panel.
- [ ] Run 2 more real client engagements in parallel.

### Sun — Medium post

- [ ] Publish on Google Cloud Community: *"Atlas: Building a 6-Agent Operating System for Digital Agencies on Gemini Enterprise Agent Platform."*
- [ ] Include: architecture diagram, the 3-client metrics, GitHub link, demo screenshots.

**W2 exit criterion:** 3+ engagements in flight, 6 agents all running (no stubs), dashboard at a real URL, Medium post live.

## W3 (Mon May 25 – Sat May 31) — Production hardening (Track 2's actual deliverables)

### Mon — Agent Simulation

- [ ] Build 50 synthetic "client" personas (varying budgets, industries, deception levels).
- [ ] Run all 50 through the Syndicate. Capture failure modes, latency distribution, cost per run.

### Tue — Agent Observability

- [ ] Wire traces into Agent Observability. Screenshot for the demo.
- [ ] Build a public-facing observability page on the dashboard at `/observability/{engagement_id}`.

### Wed — Agent Identity + Agent Gateway + Model Armor

- [ ] Each agent already runs as its own service account (Terraform handles this). Verify identities are visible in Agent Identity console.
- [ ] Route all A2A traffic through Agent Gateway with rate limits per tenant.
- [ ] Enable Model Armor on every LLM call. Test with prompt-injection samples; confirm blocks.

### Thu — Eval harness

- [ ] Write `scripts/eval-harness.py`. Pushes per-run scores to BigQuery `atlas_evals.runs`.
- [ ] Capture: task_completion (0–1), cost_usd, latency_seconds, hallucination_flag.

### Fri-Sat — 4th and 5th real client

- [ ] Two more real engagements with full observability. These two are the "hero" clients in the demo video.

**W3 exit criterion:** production-grade run with traces, sim report, governance config, eval scores in BigQuery, 5 real engagements complete.

## W4 (Mon Jun 1 – Wed Jun 3) — Story, demo, submit

### Mon — Architecture diagram + Devpost text

- [ ] Build the final architecture diagram in Excalidraw, dark theme, single PNG.
- [ ] Draft the Devpost project description (the writeup is graded). Lead with the numbers: *"5 real client engagements. 7.4× cheaper. 18× faster. Lighthouse ≥95 on every store. NPS 71."*

### Tue — Demo video

- [ ] Storyboard the 3-minute video (script in [docs/DEMO_SCRIPT.md](./DEMO_SCRIPT.md) — TODO: write this).
- [ ] Record twice. Cut the better take.

### Wed — Submit

- [ ] Final pre-flight: hosted URL up, repo public, video on YouTube (Public, not Unlisted), architecture diagram embedded in the Devpost description.
- [ ] Submit on Devpost by 5pm. 48 hours of buffer until the actual deadline.

**Submission criterion:** filed Wed June 3 evening. No bugs in the demo URL. No placeholder text. No `TODO` strings in the public writeup.

---

## Risks + mitigations (mirrored from the research doc)

| Risk | Mitigation |
|---|---|
| Lovable API has rate limits / hidden gotchas | Confirmed beta as of May 2026; if blocked, fall back to v0 Platform API (Vercel). |
| ADK 1.0 API changed since this scaffold was written | Read the [official ADK docs](https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/adk) on Day 1 and update imports. The scaffold's structure is correct even if specific imports drift. |
| Memory Bank SDK isn't ready | `shared/memory.py` has a Firestore-backed fallback. Same interface. |
| Can't recruit 5 pilot clients | Goal is 3, not 5. Each engagement should yield two outbound referrals — the math works at 3 confirmed yeses. |
| W4 video runs over 3:00 | Hard cut at 2:50 in editing. Only first 3:00 evaluated. |
