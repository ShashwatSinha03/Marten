# Sprint 3 — Deployment and release acceptance

Status: prepared locally, not deployed. Run this against a new Marten project and record evidence; a checked box requires an observed result. Public destinations remain disabled even after fixture acceptance.

## Reproducible validation

`.github/workflows/validate.yml` runs on pushes and pull requests without application secrets. It uses pinned actions, Node 22.23.1, pnpm 9.15.0, a frozen lockfile, installed Chromium, serial API tests, both typechecks, the frontend production build, and backend Docker build. The image build checks packaging; it does not prove runtime Chromium isolation. Require its `validate` check before merging/releasing. No workflow deploys or applies SQL. Review dependency/action updates before changing pins.

## Configure the three services

1. Record repository, reviewed commit, Vercel project, Render service, Supabase project reference, region, and operator. Do not include credentials in this record.
2. Create a new Supabase project using its free option; prepare/test a CLI-generated migration from `supabase/schema.sql` (or the documented upgrade), run advisors, and apply it only to this project. Follow `supabase/README.md` for private storage and OAuth.
3. First run the credential-free Render probe in [render-validation.md](render-validation.md). The blueprint retains free compute and disables automatic deploys so each tested commit can be deployed deliberately. Do not attach a disk or paid worker. No scaling beyond a single process. Current Blueprint fields are documented by [Render](https://render.com/docs/blueprint-spec).
4. For the controlled application, set Render `SUPABASE_URL`, backend-only `SUPABASE_SECRET_KEY`, exact HTTPS `FRONTEND_ORIGIN` without trailing slash, and `GEMINI_MODEL` to a model verified available to the user's key. Disable `MARTEN_STARTUP_PROBE` after measurement. Let Render supply `PORT`; never put a Gemini key in service configuration.
5. Import the frontend into Vercel with Root Directory `apps/web`, Next.js preset, Node 22.x, install command `pnpm install --frozen-lockfile`, build command `pnpm build`, and default Next output. Enable access to source files outside Root Directory because the frontend imports `packages/contracts`. Preserve the repository-root workspace and lockfile. See [Vercel monorepos](https://vercel.com/docs/monorepos).
6. Set Vercel `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_API_URL` to the intended projects. Never set a secret/service-role key there. Redeploy after public env changes. Configure the exact frontend origin in Supabase redirects and Render CORS; arbitrary preview origins are not automatically allowed.

Use provider free offerings only where eligible. User-supplied AI keys do not guarantee free inference: model eligibility/quota must be checked with that key's provider. No paid tier, paid domain, billing change, or automatic keepalive is part of this setup.

## Hosted fixture acceptance record

| Gate | Required observation | Status/evidence |
| --- | --- | --- |
| Versions | Same reviewed commit on both services; CI green; private database schema version recorded | Pending |
| Runtime | Render fixture probe, memory, sandbox, cancellation and cold-start measurements | Pending |
| Authentication | Google and GitHub sign-in/out succeed at exact origin; invalid/expired tokens rejected | Pending |
| Ownership | Two disposable accounts cannot read, list, cancel, delete or download each other's run/evidence; direct REST and Storage deny client access | Pending |
| Honest boundaries | Arbitrary supplied URL rejected; only exact fixture marker accepted; wrong CORS origin rejected | Pending |
| Real report | User-provided Gemini key yields grounded fixture report; invalid key/quota failure preserves evidence and shows actionable failure; no key in logs/storage | Pending |
| Persistence | Refresh restores run, coverage and evidence; restart interrupts unfinished work without false completion | Pending |
| Limits | Concurrent run rejected; durable five-attempt daily limit survives restart/deletion; bounded page/time limits hold | Pending |
| Retention | Expired run inaccessible; worker deletes Storage objects before row; retry after injected failure succeeds; account deletion retains inaccessible cleanup metadata | Pending |
| Frontend | Desktop/mobile, loading/thinking mascot, failure/cancel states, keyboard access and reduced motion inspected against live service | Pending |

Record timestamp, commit, expected/actual result and sanitized evidence for each. CI/mock-provider tests do not satisfy live provider/database gates. Monitor retention while awake and after an idle wake; sleeping free compute postpones physical removal. Do not claim a strict deletion deadline.

## Rollback and public-release boundary

Stop new investigations before backend rollback (suspend the service if needed), preserve logs without secrets, and deploy the previous reviewed commit. Roll back frontend to a tested deployment with matching public environment values. Do not undo schema changes destructively: nullable owner metadata is forward compatible and protects cleanup. Verify health, auth, report reads, and retention again after rollback.

A successful fixture slice is still not an arbitrary-public-URL release. Network isolation/egress enforcement, sandbox evidence, actual free-tier resource headroom, live model quality, and all hosted gates above remain separate prerequisites. There is intentionally no environment switch here that enables public crawling.
