# Marten Supabase setup (not deployed)

Use a NEW Marten project; never reuse unrelated projects. `schema.sql` is a proposed schema, not a generated or applied migration. The Supabase CLI is unavailable in the local environment. When setting up a database, read CLI help, create a migration using `supabase migration new`, test the schema locally, and run database advisors before deploying it.

Enable Google and GitHub OAuth; configure provider credentials and allow the exact frontend origin as the post-login redirect (for example `http://localhost:3000` locally and the actual Vercel origin when deployed). The frontend redirects to `window.location.origin` and Supabase's browser client handles the PKCE callback there; there is no `/auth/callback` route. Configure each provider's OAuth callback using the Supabase Auth callback URL shown in its dashboard. The frontend uses the publishable key. Only the Render backend receives `SUPABASE_SECRET_KEY`, alongside `SUPABASE_URL` and exact `FRONTEND_ORIGIN` (no trailing slash).

The API verifies every bearer token through Supabase Auth, then checks ownership and expiry for every resource. Tables have RLS enabled and no anon/authenticated grants. Screenshots are private and streamed through the API after authorization. Never expose the service secret in frontend environment variables.

Initial API uses a single backend process and bounded JSON documents per run, saved after every evidence capture and event. Deploy exactly one instance; multi-replica locking is not implemented. A restart interrupts current investigations; reading such a run marks it interrupted. Access expires after seven days; physical object cleanup is a deployment prerequisite, not currently scheduled. Delete removes private screenshots and the database row. No API key is persisted.

Live Auth, RLS, Storage, and SQL correctness remain unverified until a Marten project is provisioned. Check cross-user access and missing-token access directly against both REST and Storage after applying the schema.
