# Cloud setup checkpoint — updated 2026-10-19

## Published

- Public repository: https://github.com/ShashwatSinha03/Marten
- CI passed at `d59a335`: https://github.com/ShashwatSinha03/Marten/actions/runs/38799802314 (tests, typechecks, frontend build, Docker build).
- Render service: `marten-api`, `srv-db9p0o7btjjs73chkpv0`, Oregon, Docker, Free, 512 MB. Creation form advertised 0.1 CPU; metrics page displayed 0.15 CPU, so CPU allocation is not independently established.
- API: https://marten-api.onrender.com. `/health` returned `{"status":"ok","mode":"fixture-only"}`; unauthenticated `/v1/investigations` returned HTTP 503 `NOT_CONFIGURED`.
- Main branch, root Dockerfile/context, `/health` check, auto-deploy Off. No application credentials configured.

## First Render probe — not a pass

Deploy `dep-db9p0onbtjjs73chkqv0`, commit `d59a33580c937b87a01ab275fa60c126413c3ad6`; startup log at 2026-10-17 20:44:04 Asia/Kolkata:

| Measurement | Observed |
| --- | --- |
| State | partial |
| Elapsed | 11,937 ms |
| Peak Node RSS | 177,938,432 bytes |
| Sampled process-tree RSS sum | 654,151,680 bytes; shared memory can be counted repeatedly |
| Browser closed | true |
| Sandbox requested | true; log field `chromiumSandbox` is configuration, not enforcement certification |
| Blocked requests | 2 |
| Off-origin fixture requests received | **1; expected 0** |

The image built and the service became healthy. Neither proves investigation acceptance. Identify the unexpected request using bounded fixture diagnostics before interpreting its cause. The free dashboard gates CPU/memory metrics behind paid compute; no upgrade was selected. Container memory, three sequential runs, cold start, effective isolation and public egress remain unverified. Public URL investigations remain disabled.

## Diagnostic deployment — 2026-10-19

Commit `8f4a43b`, Render deploy `dep-dbai2suq1p3s73bopo1g`, log at 01:14:42 Asia/Kolkata: two evidence pages (200, 404), partial after 12,705 ms, browser closed. The one unexpected request was `HEAD /`; the browser-test paths were not recorded. Platform port probing is a hypothesis, not an established source. Keep the zero-request gate unresolved rather than ignoring this request.

Cgroup v2 reported lifetime peak 294,621,184 bytes against a 536,870,912-byte limit (~55%); current 202,489,856 bytes. This is distinct from the process-tree RSS sum of 650,366,976 bytes. Three sequential accepted probes and isolation/egress acceptance remain pending.

Vercel Hobby frontend deployed successfully: https://marten-iota.vercel.app, project `marten`, root `apps/web`, Next.js, source `8f4a43b`. Live browser verification confirmed the homepage and honest setup-pending sign-in state. No Supabase integration added.

CI for `8f4a43b` found two timing races: clipped navigation deadlines could be mislabeled, and a cancellation test used a fixed sleep. Follow-up fixes preserve timeout attribution and await persisted cancellation. All 41 serial API tests and backend typecheck passed locally after those fixes; remote CI must verify the follow-up commit.

## Remaining setup

- Vercel: frontend live; authentication and backend environment integration pending dedicated Supabase setup.
- Supabase: both existing active free projects (FrontDeskOS and Surge) are needed and remain unchanged. A dedicated Marten project has not been created because the account's two active free slots are occupied. No migrations or credentials applied.
- Startup probe flag saved as false after diagnostic collection; apply through the next deployment. No additional probe runs should be automatic.
