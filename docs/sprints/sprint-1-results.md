# Sprint 1 — Local implementation checkpoint

Verified 2026-10-10. Local code and preview are ready; live service acceptance remains pending configuration.

## Delivered

- Responsive dark brown/ivory/amber Next.js interface with an original soft-3D marten asset, locally hosted font, public labeled sample report, sign-in/start form, history, activity, screenshots, evidence-linked findings and cancellation.
- Google/GitHub Supabase OAuth wiring with PKCE and root-origin redirect. Missing configuration is explained; there is no fake signed-in mode.
- Authenticated Fastify API with owner/expiry checks, fixed fixture scope, single-process admission, a durable five-start daily budget, private screenshot proxy, deletion, and interrupted-run reconciliation.
- Real collector callbacks persist evidence and events through the repository before publication. Gemini BYOK adapter validates structured findings and evidence references, uses a fixed service endpoint, and exposes safe quota/key errors.
- Supabase schema proposal, private bucket and service-only access configuration, environment templates, Vercel/Render instructions. No remote projects were modified.

## Verification

- `pnpm test`: **23 passed, 0 failed**. Includes real Chromium fixture collection into a test repository, authorization/expiry across all resource routes, cancellation, quota errors, fabricated citations, duplicate finding IDs, API-key transport/redaction, and safe startup diagnostics.
- `pnpm typecheck` and `pnpm web:typecheck`: passed.
- `pnpm web:build`: passed (Next.js production build).
- Specialist specification/security review: no remaining material findings for this fixture-only preview. Fixed final-event polling order, modern/legacy Supabase key transport, stale history, UI state races, and callback/expiry wording.
- Desktop/mobile visual checks and sample/setup navigation passed. Screenshots are in ignored `output/playwright/sprint1-*.png`. Independent in-app browser inspection confirmed the labeled sample, fixture URL selection, honest unconfigured login error, and production landing page.
- Local production preview started at `http://127.0.0.1:3002` because port 3000 was occupied. This is a developer preview, not a hosted deployment.

## What these checks do not prove

Supabase Auth/Storage/SQL and Gemini HTTP calls were tested through test doubles, not live credentials. The real browser integration test uses real fixture pages and screenshots with a fake analyzer and in-memory test repository. The shipped API uses the Supabase repository and fails closed if unconfigured; it does not silently fall back to in-memory storage.

No Marten Supabase project, Google/GitHub OAuth application, GitHub remote, Render service, or Vercel deployment has been configured. Docker execution remains unverified. Render memory/sandbox/egress gates remain pending. The generated mascot is one initial pose, not the complete Sprint 3 asset set.

Only `https://fixture.marten.test` is accepted as an explicit fixture identifier; an entered public URL is rejected. Reports currently analyze text, links and HTTP status. Screenshots are available to the reader, not submitted for model visual reasoning in this slice. Seven-day access expiry is enforced, but scheduled physical cleanup is not implemented; it is a prerequisite before hosted use. Use one backend instance until durable concurrency coordination exists.

## Next integration step

Provision a dedicated Marten Supabase project, test/apply the proposed schema and storage rules, configure Google/GitHub OAuth and exact frontend redirect origins, then configure the environment templates locally or on the chosen hosts. Run a real signed-in fixture investigation with a user-supplied Gemini key, verify access with two accounts, and complete Render's browser validation before enabling public websites.

The next feature sprint can deepen controlled exploration, but no live integration or public-site capability should be inferred from this checkpoint.
