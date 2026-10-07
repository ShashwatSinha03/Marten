# Sprint 0 — Browser feasibility

Updated: 2026-10-07. Status: local harness verified; deployment preparation complete; full Sprint 0 hosting gates pending.

## Scope

Controlled-fixture browser collection, real screenshots and observations, persisted events, cancellation/deadline behavior, and resource measurements. This sprint does not ship the public product, sign-in, or Gemini reports.

## Verification record

Verified on 2026-10-07:

- `pnpm typecheck`: passed.
- `pnpm test`: 8 passed, 0 failed. Real browser tests cover healthy/404 captures and persisted metadata, page caps, navigation timeout, cancellation, pre-cancel, active-navigation deadline, actual off-origin rejection, and health-only API surface.
- `pnpm probe`: exit 0; expected `partial` outcome from the deliberately hanging third page. Two screenshots with SHA-256 hashes and corresponding page JSON/events/manifest persisted. Captured statuses: 200 and 404. Two off-origin requests blocked; secondary fixture server received zero requests. Browser closed.
- Probe elapsed: 5,150 ms. Node peak RSS: 153,485,312 bytes (146.4 MiB). Sampled process-tree RSS: 368,476,160 bytes (351.4 MiB). These are local macOS samples, may double-count shared memory/miss peaks, and do not establish Render container capacity.
- Probe artifacts: `output/playwright/39e42f42-afd0-48d7-8734-09452c566347/` (ignored generated output). The 404 screenshot was visually inspected.
- Independent specification and code-quality reviews passed for this controlled-fixture scope. `procps` was explicitly added to the Docker image for memory sampling after review; the image has not been built here.

Browser execution required approved host execution outside the Codex filesystem/process sandbox. Chromium's own sandbox remained enabled. An earlier approval attempt failed due to a usage limit; the resumed probe was approved and completed.

## Delivered

Pinned pnpm/TypeScript dependencies and lockfile; fixture collector; append-only event log; per-page metadata and PNGs; bounded run cancellation/timeout handling; health-only Fastify server; non-root Dockerfile; Render Free blueprint with optional startup probe; local and deployment instructions in README.

The internal probe is an engineering validation tool, not a user-installable runner. Marten's planned product remains browser-only. No frontend, authentication, Supabase persistence, or Gemini analysis is claimed in this sprint.

## Deployment status

The user confirmed that no GitHub repository or Render service exists yet and requested deployment files first. No Render tool/CLI or local Docker runtime is available in this session. Deployment configuration can be prepared, but local success cannot establish Linux sandbox support, actual Render memory headroom, or cold-start/restart behavior.

## Public release gate

Arbitrary user-submitted URLs remain disabled. A controlled fixture run is not proof of browser egress isolation for hostile websites. Production destination enforcement, process isolation, private cloud evidence persistence, and deployed resource limits must pass later verification before public investigations are enabled.

The deployment procedure is tracked separately in `render-validation.md`.
