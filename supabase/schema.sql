-- Proposed schema, NOT an applied migration. Supabase CLI unavailable locally.
-- Review and apply to a new Marten project only.
create table public.marten_runs (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null,
 expires_at timestamptz not null,
 data jsonb not null
);
create index marten_runs_owner_idx on public.marten_runs(owner_id, created_at desc);
alter table public.marten_runs enable row level security;
revoke all on public.marten_runs from anon, authenticated;
grant select, insert, update, delete on public.marten_runs to service_role;
-- Access only through the authenticated API. No direct client grants or policies.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('marten-evidence','marten-evidence',false,5242880,array['image/png']);
-- Private bucket has no browser policies. API verifies owner and expiry before download.

-- Durable global daily budget; deleting reports cannot reset it.
create table public.marten_daily_usage (
 day date primary key,
 attempts integer not null check (attempts between 1 and 5)
);
alter table public.marten_daily_usage enable row level security;
revoke all on public.marten_daily_usage from anon, authenticated;
grant select, insert, update on public.marten_daily_usage to service_role;
create function public.marten_charge() returns boolean
language sql security invoker set search_path = '' as $$
 with charged as (
  insert into public.marten_daily_usage(day,attempts)
  values ((now() at time zone 'UTC')::date,1)
  on conflict (day) do update
  set attempts = public.marten_daily_usage.attempts + 1
  where public.marten_daily_usage.attempts < 5
  returning attempts
 ) select exists(select 1 from charged);
$$;
revoke all on function public.marten_charge() from public, anon, authenticated;
grant execute on function public.marten_charge() to service_role;
