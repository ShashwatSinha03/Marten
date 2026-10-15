# Marten Supabase setup (not deployed)

Use a NEW Marten project; never reuse unrelated projects. `schema.sql` is a proposed schema, not a generated or applied migration. The Supabase CLI is unavailable in the local environment. When setting up a database, read CLI help, create a migration using `supabase migration new`, test the schema locally, and run database advisors before deploying it.

Enable Google and GitHub OAuth; configure provider credentials and allow the exact frontend origin as the post-login redirect (for example `http://localhost:3000` locally and the actual Vercel origin when deployed). The frontend redirects to `window.location.origin` and Supabase's browser client handles the PKCE callback there; there is no `/auth/callback` route. Configure each provider's OAuth callback using the Supabase Auth callback URL shown in its dashboard. The frontend uses the publishable key. Only the Render backend receives `SUPABASE_SECRET_KEY`, alongside `SUPABASE_URL` and exact `FRONTEND_ORIGIN` (no trailing slash).

The API verifies every bearer token through Supabase Auth, then checks ownership and expiry for every resource. Tables have RLS enabled and no anon/authenticated grants. Screenshots are private and streamed through the API after authorization. Never expose the service secret in frontend environment variables.

Initial API uses a single backend process and bounded JSON documents per run, saved after every evidence capture and event. Deploy exactly one instance; multi-replica locking is not implemented. A restart interrupts current investigations; reading such a run marks it interrupted. Access expires after seven days. The retention worker attempts bounded physical cleanup at startup and every 15 minutes while the backend is awake; sleeping or unavailable services delay removal, so seven days is an access limit, not an exact deletion deadline. Delete removes private screenshots before the database row. No API key is persisted.

Account deletion sets `owner_id` to null instead of cascading the row away: this preserves expiry and object metadata for cleanup, while the API ownership check denies access. Cleanup must delete through the Storage API before removing the run row; deleting SQL storage metadata does not remove underlying objects. [Supabase object deletion](https://supabase.com/docs/guides/storage/management/delete-objects)

## Updating an existing Sprint 1/2 schema

Do not rerun the full create-only `schema.sql` against an existing database. With the CLI installed, inspect `supabase migration new --help`, create a migration, and put the following idempotent change in its generated file. Test locally and run advisors before applying to the intended Marten project. This assumes the default constraint name from the original checked-in schema; inspect it first if the schema was customized.

```sql
begin;
alter table public.marten_runs alter column owner_id drop not null;
alter table public.marten_runs drop constraint if exists marten_runs_owner_id_fkey;
alter table public.marten_runs add constraint marten_runs_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete set null;
create index if not exists marten_runs_expiry_idx on public.marten_runs(expires_at);
commit;
```

Existing orphaned storage objects from earlier account deletions cannot be recovered from missing rows by this change. Audit them separately through the Storage API before launch. Test account deletion with a disposable user and screenshot: the row must remain ownerless, API/direct-client reads must fail, and expiry cleanup must remove both object and row.

Live Auth, RLS, Storage, and SQL correctness remain unverified until a Marten project is provisioned. Check cross-user access and missing-token access directly against both REST and Storage after applying the schema.
