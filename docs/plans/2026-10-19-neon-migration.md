# Neon Migration Implementation Plan

**Goal:** Replace the unconfigured Supabase integration with Neon Free database, managed auth and private object storage while retaining Vercel and Render.

**Authorization:** User requested alternatives, received the Neon recommendation, and said continue. Existing free-only, Google/GitHub sign-in, private evidence and unchanged existing Supabase projects requirements apply.

**Architecture:** Next.js hosts the official Neon auth proxy and HTTP-only session; browser obtains short-lived JWT for existing Render API calls. Render verifies issuer/audience/signature/expiry via JWKS, accesses PostgreSQL with parameterized SQL, and streams private S3-compatible evidence only after owner/expiry checks. No browser DB or bucket credentials. Preserve five daily starts, three pages, seven-day retention and fixture-only restriction.

**Tech stack:** Next.js, Fastify, Neon Postgres, managed Better Auth, private Neon object storage, jose, PostgreSQL client and AWS S3 SDK. Select a region supporting both auth and storage; actual free-console availability remains a live gate.

## Design decisions

- Prefer all three Neon services over Neon plus separate auth/storage providers: fewer accounts and adapters. Self-hosted auth adds unnecessary session/security operations for this preview.
- Keep API-mediated screenshots rather than introducing signed URLs into the product contract.
- Authoritative owner comes from SQL, never serialized report JSON. Ownerless records cannot be accessed but remain eligible for cleanup.
- Fail closed on missing/partial configuration. Gemini keys remain ephemeral and never persisted.
- Account provisioning and real OAuth credentials are external prerequisites; do not enable investigations based only on mocked tests.

## Task 1 — Backend adapter

Files: `apps/api/src/repository.ts`, new Neon adapter/auth modules, `apps/api/src/app.ts`, `neon/schema.sql`, backend environment example and focused adapter tests.

1. Tests: forged/expired/wrong issuer/audience tokens, authoritative ownership, atomic quota, storage-first deletion error, bounded expired query.
2. Implement parameterized Postgres/S3 adapter and validated configuration; retain injected Repository interface where practical.
3. Preserve API ownership/expiry gates and fix nullable owner handling.
4. Run serial API tests and typecheck. Never expose remote errors/credentials.

## Task 2 — Frontend authentication

Files: `apps/web/lib/client.ts`, new Neon auth client/server files and `/api/auth/[...path]/route.ts`, `apps/web/components/marten-app.tsx`, web environment example.

1. Read official current Next.js API-only and JWT docs before selecting SDK methods.
2. Replace Supabase session/OAuth with Neon managed auth. Preserve identity-change key clearing and bounded requests.
3. Keep honest unconfigured state; never send database/storage credentials to the client.
4. Run request tests, web typecheck and production build.

## Task 3 — Integration and review

Orchestrator owns package manifests/lockfile to avoid concurrent installs. Pin verified package versions. Independently review cross-user authorization, credentials, retention, SDK compatibility and production auth requirements.

Run `pnpm typecheck`, serial `apps/api/test/*.test.ts`, frontend request tests, `pnpm web:typecheck`, `pnpm web:build`. Local passes establish only implementation readiness.

## Task 4 — Free provisioning and live acceptance

After user signs in: dedicated Neon Free project, supported region, private bucket, schema, managed auth and trusted Vercel origin; Google/GitHub production credentials remain user-owned. Explicitly authorize any new sensitive credential grants when required by UI policy. No paid plan or changes to existing projects.

Verify two-user history/report/screenshots/delete isolation, quota, expiry/cleanup, sign-out, actual fixture screenshots and BYOK run before reporting end-to-end success. Public-site isolation remains a separate unresolved release gate.

## Sources checked 2026-10-19

- https://neon.com/pricing
- https://neon.com/docs/storage/overview
- https://neon.com/docs/storage/authentication
- https://neon.com/docs/auth/quick-start/nextjs-api-only
- https://neon.com/docs/auth/guides/plugins/jwt
- https://neon.com/docs/auth/guides/setup-oauth
