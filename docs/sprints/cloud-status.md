# Cloud setup checkpoint — updated 2026-10-20

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

CI for `8f4a43b` found two timing races: clipped navigation deadlines could be mislabeled, and a cancellation test used a fixed sleep. Follow-up commit `3531336` preserves timeout attribution and awaits persisted cancellation. All 41 serial API tests and backend typecheck passed locally; full remote CI passed: https://github.com/ShashwatSinha03/Marten/actions/runs/39160349894. Render deployed the follow-up successfully at 01:18:26 Asia/Kolkata with startup probes disabled.

## Remaining setup

- Vercel: frontend live; authentication and backend environment integration pending Neon credentials/OAuth and deployment of the migration.
- Supabase: both existing active free projects (FrontDeskOS and Surge) are needed and remain unchanged. A dedicated Marten project has not been created because the account's two active free slots are occupied. No migrations or credentials applied.
- Startup probe flag verified false and applied through the final deployment. No additional probe runs should be automatic.

## Neon migration — 2026-10-20

- Dedicated Neon Free project: `patient-boat-69691632`, production branch `br-flat-tree-b4cjowep`, AWS Ohio (`us-east-2`), PostgreSQL 18. No paid upgrade selected.
- Managed auth user ID inspected through `information_schema.columns`: `neon_auth.user.id` is `uuid`.
- `neon/schema.sql` applied successfully to the new project: Marten run/usage tables, nullable owner FK with `ON DELETE SET NULL`, indexes and RLS. Existing Supabase projects remain unchanged.
- Private object-storage bucket `marten-evidence` created. Storage credentials are branch-scoped, not user- or bucket-scoped; Marten's API must enforce ownership and expiry.
- Local migration replaces Supabase with parameterized PostgreSQL, managed-auth JWT verification and private S3-compatible screenshots. All 46 API tests and backend typecheck passed locally before integration review. These checks do not establish live auth, storage permissions or database concurrency acceptance.
- **Migration is not live.** Provider credentials, Google/GitHub OAuth, Vercel/Render environment configuration, reviewed deployment and hosted two-user acceptance remain pending. The hosted frontend remains a preview.
- Existing Render isolation gate (`HEAD /` received by off-origin fixture), sequential probes and public egress validation remain unresolved. Fixture-only restriction stays enabled.

Storage credential provisioning: a branch-scoped credential with read/write permissions only has been created for the private evidence integration. The user authorized configuring Render credentials. Database/storage connection provisioning is in progress; no successful live connection or investigation acceptance is claimed. Credential values are not stored in this record.
