# Sprint 3 — Local release hardening checkpoint

Verified 2026-10-11. Local hardening complete; deployed acceptance is still pending.

## Delivered

- Retention queries expired metadata separately from capped history, oldest first, at most 25 per pass. Startup and 15-minute single-flight cleanup deletes Storage before metadata and retries failures. Shutdown stops new deletions and drains the current operation. Immediate access expiry remains enforced independently.
- Proposed Supabase schema retains inaccessible cleanup metadata after account deletion with nullable owner/SET NULL and an expiry index. Existing-schema upgrade instructions are documented; no SQL was applied remotely.
- Frontend requests, including response bodies, have a 75-second bound. Slow-request explanations, manual reconnect/screenshot retries, distinct history errors, local expiry timestamps and auth error handling preserve context. Ambiguous start failures direct users to history; mutations are not automatically retried.
- Pinned credential-free CI runs serial API tests, frontend request tests, typechecks, frontend build and Docker packaging. Render manual-deploy configuration and hosted acceptance/rollback instructions are prepared.

## Verification

- `node --import tsx --test --test-concurrency=1 apps/api/test/*.test.ts apps/web/lib/request.test.ts`: **41 passed, 0 failed**. Includes real Chromium fixtures, retention retries/lifecycle/shutdown and frontend timeout/body-read boundaries.
- `pnpm typecheck`, `pnpm web:typecheck`, `pnpm web:build`, whitespace checks: passed.
- Production preview verified at localhost:3005; unconfigured sign-in correctly reports setup pending. Authenticated cold-start/reconnect states require the live acceptance run; unit tests are not a substitute.
- YAML parsed locally. Docker and Supabase CLI unavailable, so neither container runtime nor schema application was verified. CI has not run remotely.

## Remaining acceptance

Dedicated GitHub/Vercel/Render/Supabase resources and OAuth configuration, applied/tested schema, real user-key Gemini run, two-user isolation, retention against real Storage and deployed Render memory/sandbox/egress checks remain pending. Public URL execution remains disabled. No hosted reliability, live model accuracy, strict physical deletion deadline or unlimited free usage is claimed.

Follow release-acceptance.md for the next configuration and verification stage. Mascot poses and resting favicon remain intact.
