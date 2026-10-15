# Marten

Browser-only software investigation platform. Sprint 3 provides a dark marten-themed interface, Google/GitHub sign-in integration, private investigation history, captured evidence, and Gemini BYOK reports. The only supported investigation target is the explicitly labeled controlled fixture `https://fixture.marten.test`. Public website execution remains disabled pending Render isolation verification.

The interface and sample report run without cloud credentials. Real authenticated investigations need a new Marten Supabase project and a user-supplied Gemini key. No cloud services have been deployed or configured by this repository.

Controlled exploration now follows discovered links within three navigation attempts, ranks eligible links using the optional brief, and records captured/failed/unvisited destinations with coverage limits. Reports include deterministic linked HTTP-error checks, optional reproduction context, and uncertainty. See [Sprint 2 results](docs/sprints/sprint-2-results.md) for verification and remaining limits.

## Local development

Requires Node 22 and pnpm 9.15.0.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium --only-shell
pnpm typecheck
pnpm test
pnpm probe
node --import tsx --test apps/web/lib/request.test.ts
pnpm web:typecheck
pnpm web:build
pnpm web:dev
```

On Linux, use `pnpm exec playwright install --with-deps chromium --only-shell` when system dependencies are missing. Tests require permission to bind ephemeral loopback ports and launch Chromium. Chromium's sandbox is explicitly enabled; do not disable it to work around host restrictions.

`pnpm probe` starts its own fixtures, captures a healthy page and HTTP 404, then intentionally times out on a hanging route. Expected state is `partial`, two evidence pages, and exit code 0. Ctrl-C/SIGTERM cancels collection and preserves completed evidence.

Ignored `output/playwright/<run-id>/` contains PNG screenshots, per-page JSON (including SHA-256 screenshot hashes), append-only `events.jsonl`, and final `manifest.json`. Text/links, pages, and duration are bounded. Fixtures include an off-origin subrequest that must be blocked before reaching a second controlled loopback server. This is a route-policy check, not a public-site SSRF or Linux sandbox certification.

Memory is sampled as Node RSS and separately as the summed RSS of Node's process tree using `ps`. Shared memory can be double-counted and short peaks missed. These measurements are not Render container memory.

## Configure the real fixture-to-report flow

1. Follow `supabase/README.md`; the SQL is a proposal, not an applied migration. Configure Google/GitHub providers and the frontend origin redirect.
2. Copy `apps/web/.env.example` to `apps/web/.env.local` and set the Supabase public URL, publishable key, and backend URL. Never put a secret/service key in `NEXT_PUBLIC_*` variables.
3. Copy `apps/api/.env.example` to `apps/api/.env.local` and fill backend configuration locally. Do not commit filled environment files. Start the backend with `node --env-file=apps/api/.env.local --import tsx apps/api/src/server.ts`; plain `pnpm start` expects variables already exported by the host.
4. Run `pnpm web:dev`, open `http://localhost:3000`, sign in, choose **Use the fixture URL**, enter an optional brief and a Gemini key, and start the run. The key is held transiently for that run, never stored in the database or browser storage.

The API fails closed if Supabase configuration is missing. API routes under `/v1/investigations` require authentication and ownership; `/health` is public. Five starts per UTC day are allowed globally, with one active run in a single API process. Access expires after seven days; a bounded cleanup pass runs at API startup and every 15 minutes while awake, retrying failed storage-first deletions. Sleeping hosting delays physical removal. Reports use captured text, links, and HTTP status; screenshots are available for human inspection, not sent to the model in this slice. No live OAuth, Supabase schema/storage, or Gemini success is claimed until configured and tested.

## Deployment preparation

**Vercel:** select `apps/web` as the Next.js root, install from the committed pnpm workspace lockfile, and configure the three `NEXT_PUBLIC_*` variables before building. Allow imports outside the app directory for the shared contracts. Use a matching exact frontend origin for Supabase redirects and backend CORS. Production Vercel deployment is unverified.

**Render:**

`Dockerfile` installs the matching browser and runs as non-root `node`. `render.yaml` selects Free and `/health`. After creating a GitHub repository and Render service, set `MARTEN_STARTUP_PROBE=true` for a controlled startup probe; inspect the logged manifest, then return it to `false`. The health check only reports HTTP process readiness, not probe success. The probe never accepts user URLs. Files are ephemeral and the startup flag runs on every restart while enabled.

Docker build and Render deployment are unverified. Render must support Chromium's sandbox for the probe to succeed. Do not enable public investigations until container memory, sandbox enforcement, and network egress isolation are separately validated. Free hosting capacity is not established by a successful local probe.

## Release readiness

Local release hardening is recorded in [Sprint 3 results](docs/sprints/sprint-3-results.md). Follow the [hosted acceptance checklist](docs/sprints/release-acceptance.md) before claiming deployment readiness. GitHub Actions validates tests, types, frontend build and container packaging; it does not deploy.
