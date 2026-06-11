# Demo script — under 3 minutes (Track 1: Build)

Truthful beats only. Everything below is something the deployed system actually does:
a web intake form drives a 6-agent ADK pipeline (A2A between agents), a human strategy-approval
gate, a real Lovable storefront, launch QA metrics on the dashboard, and an autonomous Account wrap-up.

No voice intake, no observability dashboard, no 50-client simulation, no governance theater —
those are not built and are not in the story.

| Time | Beat | What's on screen | Audio |
|---|---|---|---|
| 0:00 – 0:15 | **Hook** | Andy on camera. | *"I'm Andy. This is Atlas — a digital agency that runs itself. Six AI agents take a new client from an intake form to a live storefront. Let me show you a real run."* |
| 0:15 – 0:40 | **Intake** | Browser on the deployed dashboard. Andy fills the New Client form (business name, goal, budget) and submits. | *"It starts with a brief. Name, goal, budget. That's the only thing a human types to kick this off."* |
| 0:40 – 1:25 | **The pipeline** | Engagement detail page: phase timeline advances Intake → Strategy. The live AgentFeed streams Discovery and Strategy events as they happen. | *"Discovery researches the market. Strategy writes the spec. These are separate ADK agents talking to each other over A2A — each one publishes an Agent Card at its own `/.well-known/agent-card.json`."* |
| 1:25 – 1:50 | **Human approval gate** | The strategy ApprovalBanner appears. Andy reads the one-paragraph strategy, clicks **Approve**. Timeline moves to Design → Build. | *"Atlas pauses for one decision: do we like the strategy? I approve. Now Designer generates the brand and Developer kicks off the build in Lovable."* |
| 1:50 – 2:20 | **Launch QA gate (the honest handoff)** | Phase shows **Awaiting URL**. The LiveUrlGate component is visible. Andy opens the real Lovable storefront in a new tab, scrolls a product page, copies the published URL, pastes it into the gate, clicks submit. | *"Developer builds the site in Lovable. Atlas hands me a launch-QA gate: I confirm the live site is real, paste its URL, and that drives the rest of the pipeline against the actual deployed store — not a mock."* |
| 2:20 – 2:45 | **Launch QA on dashboard** | Timeline runs Review → Launch → Operate. Launch QA panel shows Lighthouse scores, status, and client update. Launch pack shows the email draft. | *"PM runs a real Lighthouse check and puts the launch-readiness report right on the dashboard. Account closes with the client launch pack — no extra tabs."* |
| 2:45 – 3:00 | **Close** | End card: GitHub URL + hosted dashboard URL + the architecture slide (`docs/architecture.png`). | *"Six ADK agents. A2A between them. Lighthouse QA on the dashboard. All deployed on Cloud Run. Repo and live URL are in the description."* |

## Exact click path (recordable shot list)

Routes on the deployed dashboard (replace `<DASHBOARD_URL>` with the live host):

1. Open `<DASHBOARD_URL>/` — landing page. Optional 2-second establishing shot before the hook.
2. Go to `<DASHBOARD_URL>/engagements` — the engagements list. Show it briefly so the new run has context.
3. Click **New Client** (or open `<DASHBOARD_URL>/engagements/new`) — fill the intake form: business name, goal, budget. Click **Submit**.
4. You land on `<DASHBOARD_URL>/engagements/[id]` — the engagement detail page. Hold here: the phase timeline advances Intake → Strategy while the AgentFeed streams Discovery and Strategy events.
5. When the **ApprovalBanner** appears, read the strategy summary on camera, then click **Approve**. Timeline moves to Design → Build.
6. Phase reaches **Awaiting URL** — the **LiveUrlGate** component is visible. Do not click anything yet.
7. New browser tab: open the pre-built Lovable storefront. Scroll one product page. Copy the published URL from the address bar.
8. Back on `<DASHBOARD_URL>/engagements/[id]`: paste the URL into the LiveUrlGate input, click submit.
9. Timeline runs Review → Launch → Operate. Scroll to the **QA panel** (Lighthouse scores, status, client update) and the launch pack (email draft).
10. Cut to the end card: `docs/architecture.png` as the architecture slide, with the GitHub URL and `<DASHBOARD_URL>` overlaid. Hold 5 seconds.

## What the judge is seeing (claim → proof)

- **ADK multi-agent** → 6 Python agents (Discovery, Strategy, Designer, Developer, PM, Account) + Coordinator, each a Cloud Run service.
- **A2A** → every agent serves a spec-compliant Agent Card at `/.well-known/agent-card.json`; the Coordinator invokes each agent over `/a2a/invoke`.
- **Launch QA** → PM runs Lighthouse; metrics and report appear on the engagement page.
- **Human-in-the-loop** → two deliberate gates: strategy approval and launch QA. Framed as control, not limitation.
- **Real external system** → the storefront is a genuine Lovable build; PM's Lighthouse check runs against the pasted live URL.

## Pre-flight checklist (do before recording)

- [ ] Coordinator, PM, and dashboard redeployed with launch-gate + deliverables code
- [ ] One end-to-end run completed successfully on the deployed stack the night before
- [ ] A Lovable storefront URL ready to paste (pre-build it so the demo isn't waiting on Lovable)
- [ ] GitHub repo public and clone-tested in a fresh environment
- [ ] Hosted dashboard URL loads anonymously
- [ ] Architecture diagram (`docs/architecture.png`) exported for the end card

## Filming notes

- Clean background, no Rubicx branding — the story is Atlas.
- Real microphone (USB condenser is fine), 1080p / 30fps.
- Pre-build the Lovable site so the paste step is instant; don't gamble on a live Lovable build during the take.
- Burn in captions for the first 15 seconds, soft subtitles after (English required by submission rules).

## Cut notes

- Hard cap 2:50 to leave buffer for YouTube re-encoding (only the first 3:00 is evaluated).
- Light, low-energy electronic music; no vocals.
- End card holds 5 seconds with GitHub + hosted URLs.
