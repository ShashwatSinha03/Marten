-- Apply only to the new Marten database after enabling Managed Better Auth.
-- Official migration docs identify neon_auth."user" with UUID IDs.
-- Verify that relation in the target project before applying; never alter its schema.
begin;
create table public.marten_runs (
  id uuid primary key,
  owner_id uuid references neon_auth."user"(id) on delete set null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  data jsonb not null
);
create index marten_runs_owner_idx on public.marten_runs(owner_id, created_at desc);
create index marten_runs_expiry_idx on public.marten_runs(expires_at, id);
create table public.marten_daily_usage (
  day date primary key,
  attempts integer not null check (attempts between 1 and 5)
);
-- Backend-only tables: no Data API/browser policy. Use the owning database role on Render.
-- Table owners bypass RLS; ordinary database roles have no policy granting access.
alter table public.marten_runs enable row level security;
alter table public.marten_daily_usage enable row level security;
revoke all on public.marten_runs, public.marten_daily_usage from public;
commit;
