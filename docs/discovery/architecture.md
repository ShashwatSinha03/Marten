# Marten architecture discovery

Date: 2026-10-06. Status: recommendation for design approval, not an implementation plan or deployment guarantee.

## Scope and stack

Confirmed direction: public websites, real URL-to-report investigations, browser-only user experience, Vercel frontend, Render backend, Supabase persistence, Google/GitHub login, saved reports, live events and screenshots, optional brief with an automatic default, BYOK AI, and a dark visual identity with a 3D marten. Gemini is the recommended initial provider, pending explicit confirmation. Safe navigation without submissions remains tentative and needs explicit scope confirmation.

Recommend a TypeScript pnpm workspace: `apps/web` (Next.js App Router, React, Tailwind), `apps/api` (Node.js LTS, Fastify, Playwright Chromium), and `packages/contracts` (Zod schemas and event/report types). Use Supabase Auth, Postgres, and private Storage; direct Google GenAI SDK behind one adapter. Select and pin compatible stable package versions when implementation begins. No Redis, vector database, autonomous agent framework, or separate paid queue is necessary for the first bounded investigation.

Vercel serves UI, auth callbacks, and short frontend requests. The browser calls Render directly with a Supabase access token for starts, cancellation, and authenticated event streaming. Do not proxy the long browser run through a Vercel function. Supabase stores canonical state; Render local files are temporary only.

## Verified hosting limits

- Render Free has 15-minute idle spin-down, roughly one-minute wake-up, ephemeral files, arbitrary restarts, and 750 instance-hours per workspace/month. Free background workers are unavailable. High service-initiated public traffic can cause suspension; no exact threshold is published. Bandwidth/build overage may bill when a payment method exists, or suspend service/builds without one. Render explicitly discourages Free for production. [Render Free documentation](https://render.com/docs/free)
- Vercel Hobby is restricted to personal, noncommercial use; a portfolio prototype fits a different deployment posture from a commercial product. Its documented function maximum is 300 seconds. [Hobby documentation](https://vercel.com/docs/plans/hobby)
- Supabase Free currently includes 500 MB database, 1 GB file storage, 5 GB egress and 5 GB cached egress; projects can pause after a week of inactivity. Social OAuth is included. Screenshot retention must be finite. [Supabase pricing](https://supabase.com/pricing)
- Gemini offers free-tier models, with project/model-dependent quotas and different data handling from paid usage. Do not promise free investigations per day. [Pricing](https://ai.google.dev/gemini-api/docs/pricing), [limits](https://ai.google.dev/gemini-api/docs/rate-limits)

The Render pricing page did not expose compute capacity in the fetched content; memory/CPU allocation must be verified in the actual deployment dashboard. Supabase changelog markdown fetch failed; recheck before implementation. These are limitations of this discovery, not claims that the services lack those details.

## Browser execution and trust boundary

The collector is deterministic and policy-constrained. It observes DOM, screenshot, route, console/network metadata, and timestamp; the investigator reasons over those observations. Never render collected HTML as trusted Marten UI.

For the feasibility prototype, propose one active investigation globally, one page at a time, a fresh browser process/profile per run, and an explicit busy response instead of an unbounded in-memory queue. Start with five pages, three minutes, and three model calls as provisional caps to tune with measurements. These are product defaults, not verified platform capacities.

Run Chromium as an unprivileged process with its sandbox enabled, sanitized environment, and no provider/database credentials. Keep privileged API credentials and Gemini calls in the controller. The browser worker gets only bounded instructions and returns evidence; separate OS-user/file permissions are necessary even within one container. Playwright browser contexts alone are not a security sandbox. [Playwright Docker guidance](https://playwright.dev/docs/docker)

All browser egress requires enforced destination policy, including redirects, DNS resolution/rebinding, subresources, frames, downloads, websockets, and alternate protocols. Blocking a URL only before `page.goto` is insufficient. A validated outbound proxy or equivalent enforceable network boundary is the preferred design. Whether Render Free permits the required sandbox and network enforcement is unresolved. Do not publish arbitrary untrusted URL execution if either fails; keep the prototype restricted to controlled fixtures while resolving hosting architecture.

Proposed action policy: same-site navigation scope, no login, form submission, downloads, purchases, or arbitrary model-generated JavaScript. Public asset/CDN requests may require different egress allowances from navigation. Prefer actual link destinations rather than arbitrary click execution initially. Do not claim that GET-only requests prove absence of side effects; also expose any blocked requests that reduce inspection fidelity.

## Data and run lifecycle

Suggested tables: `investigations` (owner, URL, optional brief, status, stage, limits, model/config version, timestamps), `events` (run, monotonic sequence, kind, payload), `pages`, `evidence`, `findings`, and `finding_evidence`. Store screenshot bytes in a private bucket; database rows hold identifiers, hashes, metadata, and object keys. Signed URLs are generated after owner authorization. Enable ownership RLS on all exposed tables and storage policies; never ship service-role secrets to the frontend.

Lifecycle: accepted → collecting → mapping → understanding → investigating → reasoning → reporting → completed. Failure, cancelled, and partial are terminal outcomes; stages can have bounded follow-up collection without a fabricated linear progress percentage. Append events after corresponding work succeeds, and persist before emitting them. Resume live display by sequence ID using authenticated fetch streaming; offer polling fallback.

The controller stores a run lease/heartbeat. On startup and relevant requests, reconcile stale running records into interrupted/partial states. Do not automatically replay actions or model calls after a crash. A volatile BYOK key cannot resume itself: user must re-enter it for an explicit retry. Saved evidence survives independently of browser lifetime. Avoid keeping the service artificially awake.

BYOK is submitted over HTTPS, kept transiently in the controller, omitted from logs, and cleared at run end/timeout. No key in Supabase, localStorage, prompts, or collector environment. Reopening a report needs no Gemini call or key. Rate-limit starts per owner and globally, and make duplicate start submissions idempotent.

## AI and report contract

One Gemini adapter accepts compact evidence with screenshot inputs and produces schema-validated hypotheses/findings. Every asserted finding references existing evidence IDs, identifies observed versus inferred facts, explains user impact, and lists reproduction context and uncertainty. A hypothesis cannot become a confirmed defect merely because a second model call repeats it. Structured output validates shape, not truth. Report inspected pages, skipped actions, blocked resources, and coverage limitations.

Prefer deterministic checks for observable failures; use AI for application understanding, prioritizing allowed follow-ups, and explaining evidence. Webpage text is untrusted data and cannot change scope, tool permissions, budgets, or credentials. Model-returned actions must pass controller policy. Keep model choice configurable and recorded per run; no automatic paid/provider fallback.

## Sprint recommendations and acceptance gates

1. **Sprint 0 — feasibility and design:** prove pinned Chromium launches with a working sandbox on Render; prove destination policy against adversarial fixtures; measure peak memory on representative pages; test cold start, cancellation, crash cleanup, storage and model quotas. Confirm noncommercial deployment posture and screenshot retention. Gate: no arbitrary-URL launch without isolation and egress enforcement.
2. **Sprint 1 — foundation and vertical slice:** shared contracts, Auth with Google/GitHub, owner-only run/report persistence, one controlled URL collected into real evidence, live events/screenshots, saved report shell. Gate: two-user isolation and reload/reconnect work.
3. **Sprint 2 — collect and map:** bounded same-site exploration, page/state map, capture and deduplication, destination/action policy, resource caps. Gate: fixture coverage and interrupted runs produce accurate partial results.
4. **Sprint 3 — understand and investigate:** Gemini BYOK adapter, optional brief, compact evidence, hypotheses and allowed follow-ups. Gate: seeded defects are identified with valid supporting evidence; prompt injection and 429 handling remain bounded.
5. **Sprint 4 — report and product quality:** evidence-backed findings, coverage, saved history and deletion, responsive/accessibility polish, mascot state integration. Gate: a fresh user completes login → URL → investigation → report → later revisit.
6. **Sprint 5 — release readiness:** independent security/test review, recovery exercises, usage/retention guards, deployment documentation and a clearly scoped portfolio beta. Gate: review outcomes and measured quotas support the claimed availability and scope.

No promise of permanently free production follows from this design. If secure browser execution or actual resource limits fail the Sprint 0 gate, the orchestrator must present that specific constraint and obtain a revised scope or hosting decision before public launch.

Skills consulted: superpowers using-superpowers, brainstorming, writing-plans; Supabase; Vercel Next.js. This document stays at discovery level; detailed implementation planning follows design approval.
