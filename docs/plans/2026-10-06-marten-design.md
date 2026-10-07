# Marten initial design proposal

Status: **Approved by the user on 2026-10-06. Sprint 0 authorized.**

## Outcome

A signed-in user provides a public product URL, optionally describes what to investigate, supplies their own Gemini key, and watches real collection events with screenshots. Marten returns a private report whose findings link to captured evidence and explain uncertainty and coverage.

Confirmed requirements are maintained in `../../PRODUCT.md`. Specialist analyses are under `../discovery/`.

## Approaches considered

1. **Small TypeScript application with one bounded browser run at a time — recommended.** React frontend on Vercel, Node backend on Render, Supabase Auth/Postgres/Storage. Keep collection, investigation, and reporting as separate modules in one backend. This minimizes operational components while retaining testable boundaries.
2. **Separate API, queue, and browser workers.** Better independent scaling and job durability, but adds services and memory requirements that conflict with the initial zero-spend constraint. Revisit after usage justifies it.
3. **Local browser runner.** Avoids cloud browser costs but was explicitly rejected by the user; not part of this proposal.

## Proposed technical structure

- TypeScript pnpm workspace: Next.js App Router/React/Tailwind frontend in `apps/web` on Vercel, Node/Fastify API and Playwright collector in `apps/api` on Render, and Zod contracts in `packages/contracts`. Final dependency versions must be checked and pinned during implementation.
- Supabase Google/GitHub authentication, Postgres for investigations/events/evidence metadata/findings, and private Storage for screenshots.
- Gemini adapter for analysis of collected text and selected screenshots. Keep evidence contracts independent of the provider.
- Authenticated event streaming with persisted sequence IDs and reconnect support. Polling fallback if streaming is unreliable on the selected free hosting configuration.
- One active browser investigation globally at first. Reject excess demand with a clear busy state; do not hold user keys in a durable queue.
- Proposed exploration budget: up to three same-origin pages, two minutes of browser work, six viewport screenshots, and up to three model calls within a separately bounded analysis phase. These are benchmark inputs, not performance promises.

## Investigation pipeline

1. **Collect:** inspect URL eligibility, launch an isolated browser, navigate within policy, save screenshots and relevant page/network/console observations.
2. **Map:** record pages and observed navigation transitions, including blocked and failed attempts.
3. **Understand:** describe observed page purposes and available flows using evidence references.
4. **Investigate:** form bounded hypotheses and gather permitted follow-up evidence while budget remains.
5. **Reason:** validate finding structure and evidence references; distinguish observed failures from interpretations and unverified possibilities.
6. **Report:** present findings, evidence, reproduction context, coverage, and limitations. A run can legitimately finish with no supported findings.

Stages are conceptual; the UI shows real events rather than simulated reasoning, invented percentages, or a forced linear animation.

## Screens and visual direction

- **Public landing page:** softly rendered 3D marten, concise product explanation, sign-in entry, and an explicitly labeled example report.
- **Dashboard:** new investigation form, optional brief, session/run API-key input, past investigations, and clear backend availability status.
- **Investigation workspace:** actual activity timeline, screenshot/evidence panel, inspected pages, cancellation, and emerging evidence-backed results.
- **Report:** summary, prioritized findings, evidence viewer, coverage, limitations, and deletion action.
- **Authentication:** Google and GitHub through Supabase; reports and screenshots remain private to their owner.

Dark brown-black surfaces, ivory text, restrained amber accents. Readable sans serif typography; monospace only for technical evidence. Use pre-rendered 3D mascot assets rather than requiring a real-time 3D engine. Keep mascot prominence high at entry and low during evidence review. Support keyboard navigation, visible focus, sufficient contrast, and reduced motion.

## Data, key handling, and failure behavior

- API keys travel over HTTPS to the backend and provider; keep them in memory only for the active run. Never include keys in prompts, screenshots, event payloads, storage, or logs.
- Every persisted object belongs to an authenticated user. Database policies and storage access must enforce ownership; API authorization independently checks it.
- Store evidence metadata before claiming that evidence is available. Signed screenshot URLs are short-lived.
- Persist bounded progress events and evidence incrementally. On process restart, stale active runs become interrupted. Preserve partial results; an explicit retry requires a fresh key and creates a new run.
- Cancellation must stop collection and pending analysis where supported and prevent new work. Quota exhaustion produces a partial outcome, not fabricated findings.
- Proposed retention: seven days for reports and their evidence together, with earlier owner-requested deletion. Enforce expiry on reads and retry physical cleanup after service wake/restart; do not promise exact physical deletion time on a sleeping service. Show expiry before a run and in history.

## Safety and truthfulness requirements

- Enforce public destination restrictions across DNS resolution, redirects, navigation, subresources, and other browser connections. Deny private/internal/metadata/local destinations.
- Browser process isolation and egress enforcement must be proven in the actual deployment environment; route interception alone is insufficient.
- Use fresh contexts without credentials for target websites. An investigation brief or target-page content cannot grant additional execution permissions.
- Start with safe navigation and selected non-submitting controls. Avoid arbitrary autonomous clicks; avoid submissions and data-changing actions.
- Structured AI output is validated for schema and actual evidence IDs; valid JSON alone is not proof of accuracy.
- Inform users that their selected provider's free-tier data handling and usage limits apply.

## Hosting feasibility gates

The user-selected hosts are retained. Zero spend is an initial constraint, not a guarantee of production reliability or unlimited usage.

Sprint 0 must establish browser startup, peak memory, sandbox behavior, enforced network boundaries, and interruption handling on Render. If the available plan cannot meet these gates, do not expose unrestricted user-submitted destinations. Continue local/controlled-fixture development and return concrete measured options to the user without silently changing hosts or purchasing services.

The official documentation currently limits Vercel Hobby to personal/noncommercial use and describes Render Free as unsuitable for production reliability. The first release is therefore proposed as a limited portfolio beta. Render limits, Supabase quotas, and Gemini availability must be rechecked before deployment. Use platform-provided domains initially to avoid a custom-domain purchase.

## Proposed sprints and completion criteria

### Sprint 0 — Runtime and evidence feasibility

Owners: architecture/backend, security, testing.

- Establish repository structure and a controlled fixture site with a seeded broken link and healthy control pages.
- Build a minimal bounded collector that captures one screenshot and structured observation.
- Measure local and deployed browser resource use; exercise timeout/cancel/restart behavior.
- Verify sandbox and network policy assumptions with targeted tests.
- Produce an explicit go/no-go decision for public arbitrary-URL investigations on the selected free infrastructure.

Done when measurements and security tests support a concrete deployment decision. Local success alone does not verify Render deployment.

### Sprint 1 — First real URL-to-report slice

Owners: frontend/UX, backend, AI, security/testing.

- Sign-in, ownership schema, private storage, URL/brief/key form.
- One real collector run with durable activity events and screenshots.
- Gemini analysis producing validated evidence-linked findings.
- Report view, partial failures, quota errors, and cancellation.

Done when a signed-in user can complete a real investigation and a second user cannot access their data. Public target scope depends on Sprint 0's outcome.

### Sprint 2 — Exploration and investigation depth

Owners: browser/backend, AI, testing.

- Bounded multi-page exploration and application map.
- Brief-guided prioritization within the same action policy.
- Hypothesis follow-up, reproduction context, uncertainty, and coverage.
- Evaluation against seeded defects and healthy pages, including false-positive checks.

Done when reports accurately distinguish observed defects, interpretations, and untested areas across controlled scenarios.

### Sprint 3 — Product polish and release

Owners: UX/frontend, security, testing, deployment.

- Final 3D mascot assets, responsive layout, accessible states, and landing page.
- History, deletion/retention, reconnection, cold-start explanations, admission limits.
- Deployment configuration and end-to-end verification on the selected hosts.

Done when the deployed flow works within measured limits, private data remains isolated, and the product does not imply reliability or coverage it cannot deliver.

## Verification strategy

- Unit tests: URL/action policy, run transitions, budget enforcement, report schemas and evidence references.
- Integration tests: redirects and blocked egress, private report/storage access, key redaction, durable events and interrupted runs.
- Browser tests: sign-in flow where configured, submission, real progress, screenshot viewing, report, cancellation, quota failure, and cross-user denial.
- Evaluation fixtures: reproducible defects plus healthy pages to expose unsupported findings.
- Deployment checks: peak memory, sandbox, actual external connectivity restrictions, cold starts, resource limits, and partial-result recovery.

## Approval boundary

The user approved this design after clarifying the investigation report, then authorized Sprint 0. Execute `2026-10-06-sprint-0.md` with specialist agents. Hosting feasibility remains an engineering gate, not a claim established by design approval.

## Specialist synthesis

The integrated proposal adopts the architecture specialist's Next.js/Fastify workspace. It adopts the security specialist's more conservative three-page/two-minute starting limits and seven-day expiry for reports and evidence together; the architecture specialist's five-page/three-minute suggestion is a later benchmark, not an additional supported mode. Sprint 1 includes initial AI findings so the first vertical slice satisfies the user's real URL-to-report requirement. Later sprints deepen exploration rather than postponing all reasoning.

Source references: [Render free services](https://render.com/docs/free), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Supabase pricing](https://supabase.com/pricing), [Playwright container isolation](https://playwright.dev/docs/docker), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing). Detailed sources and unresolved verification limitations are recorded in the specialist documents.
