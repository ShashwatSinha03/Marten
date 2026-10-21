# Marten Neon setup

Implementation exists locally; provisioning and end-to-end authentication/storage acceptance are separate gates. Use a dedicated Free project, leaving existing Supabase projects unchanged. Verify current Auth and Object Storage availability in the selected region and never select paid upgrades automatically.

1. Enable Managed Better Auth. Inspect `neon_auth."user"` and confirm the `id` is UUID before applying `schema.sql` once with the owning database role. The SQL creates only Marten tables; it does not change managed auth tables. [Official Supabase migration guide](https://neon.com/docs/auth/migrate/from-supabase) documents the table and UUID user IDs.
2. Keep Data API disabled for these tables. RLS is enabled with no browser policies; use the table-owning database role only on Render. Verify ordinary roles cannot access rows before release.
3. Create a **private** evidence bucket. Use branch-scoped storage credentials with only the read/write permissions required for PutObject/GetObject/DeleteObject. These credentials are not per-user credentials; ownership checks remain in the API. Use the exact console endpoint and region. Do not enable public access or browser policies. [Storage authentication](https://neon.com/docs/storage/authentication)
4. Configure the server variables in `apps/api/.env.example` on Render. `DATABASE_URL` is server-only; the adapter requires TLS certificate verification. All seven Neon settings are required, otherwise investigation endpoints remain unconfigured. No storage/database secret belongs in `NEXT_PUBLIC_*`.
5. Configure frontend auth separately using `apps/web/.env.example`, trusted origin and Google/GitHub production OAuth credentials. Render validates EdDSA JWT signatures, required subject/expiry, and issuer/audience equal to the origin of `NEON_AUTH_BASE_URL`. JWKS uses the full auth base path followed by `/.well-known/jwks.json`. [JWT guide](https://neon.com/docs/auth/guides/plugins/jwt)

## Ownership and retention

SQL `owner_id`, `created_at`, and `expires_at` override report JSON. Account deletion nulls ownership and retains cleanup metadata; subsequent progress updates never restore the owner. Every API read/mutation checks ownership and expiry. JWTs remain valid until their expiry after sign-out; they are not a session-revocation mechanism. Test account deletion and sign-out behavior with real users before release.

Seven-day retention is enforced on reads immediately. Physical cleanup runs at startup and every 15 minutes while Render is awake, up to 25 expired runs per pass. Each of the three possible screenshot objects is deleted before its database row; failures retain metadata for retry. Sleeping hosting can delay cleanup. Five global daily attempts are charged by a single atomic PostgreSQL upsert independent of report deletion.

## Required live verification

Apply the schema on the intended new database; validate auth-user FK compatibility, account deletion while an active run completes, concurrent quota (five successes maximum), private upload/read/delete, cross-user denial, expiry and interrupted deletion retry. Unit tests validate adapter behavior and JWT cryptography but do not prove live database permissions, provider credentials or storage availability. Public URL isolation is a separate release gate; keep fixture-only mode enabled.

Provisioning observation: on 2026-10-20, read-only `information_schema.columns` inspection in project `patient-boat-69691632` confirmed `neon_auth.user.id` has PostgreSQL type `uuid`. The schema was subsequently applied successfully and private `marten-evidence` bucket created on that project. Credentials, OAuth and live acceptance remain pending.
