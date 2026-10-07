# Marten — Sprint 0

Controlled browser feasibility harness. This is not the user-facing product yet. The HTTP API exposes only `GET /health`; arbitrary URL collection, authentication, AI, and frontend are not implemented.

## Local development

Requires Node 22 and pnpm 9.15.0.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium --only-shell
pnpm typecheck
pnpm test
pnpm probe
pnpm start
```

On Linux, use `pnpm exec playwright install --with-deps chromium --only-shell` when system dependencies are missing. Tests require permission to bind ephemeral loopback ports and launch Chromium. Chromium's sandbox is explicitly enabled; do not disable it to work around host restrictions.

`pnpm probe` starts its own fixtures, captures a healthy page and HTTP 404, then intentionally times out on a hanging route. Expected state is `partial`, two evidence pages, and exit code 0. Ctrl-C/SIGTERM cancels collection and preserves completed evidence.

Ignored `output/playwright/<run-id>/` contains PNG screenshots, per-page JSON (including SHA-256 screenshot hashes), append-only `events.jsonl`, and final `manifest.json`. Text/links, pages, and duration are bounded. Fixtures include an off-origin subrequest that must be blocked before reaching a second controlled loopback server. This is a route-policy check, not a public-site SSRF or Linux sandbox certification.

Memory is sampled as Node RSS and separately as the summed RSS of Node's process tree using `ps`. Shared memory can be double-counted and short peaks missed. These measurements are not Render container memory.

## Render preparation

`Dockerfile` installs the matching browser and runs as non-root `node`. `render.yaml` selects Free and `/health`. After creating a GitHub repository and Render service, set `MARTEN_STARTUP_PROBE=true` for a controlled startup probe; inspect the logged manifest, then return it to `false`. The health check only reports HTTP process readiness, not probe success. The probe never accepts user URLs. Files are ephemeral and the startup flag runs on every restart while enabled.

Docker build and Render deployment are unverified. Render must support Chromium's sandbox for the probe to succeed. Do not enable public investigations until container memory, sandbox enforcement, and network egress isolation are separately validated. Free hosting capacity is not established by a successful local probe.
