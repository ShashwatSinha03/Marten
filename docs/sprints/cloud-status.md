# Cloud setup checkpoint — 2026-10-17

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

## Remaining setup

- Vercel: browser still showed login after Render sign-in; user sign-in requested. No Marten frontend deployment yet.
- Supabase: both existing active free projects (FrontDeskOS and Surge) are needed and remain unchanged. A dedicated Marten project has not been created because the account's two active free slots are occupied. No migrations or credentials applied.
- Startup probe is currently enabled on Render for diagnosis; turn it off after controlled validation so later wakeups do not repeat the probe.
