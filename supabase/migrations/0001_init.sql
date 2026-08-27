-- =====================================================================
-- KSF Tech Services — initial schema
-- Target: Supabase project "innocentpeter964@gmail.com's Project"
--         org Kfs · ref fzxukernlqccajjhjilg
--
-- HOW TO RUN
--   Dashboard > SQL Editor > New query > paste this whole file > Run.
--   It is idempotent: safe to run more than once.
--
-- WHY THIS IS A FILE RATHER THAN AUTOMATED
--   Claude's Supabase tooling is authenticated against a different account
--   (ip331112-dot's Org) and cannot reach this project. Every schema change
--   from here on is delivered as SQL to paste, and committed to this repo
--   so the history stays reviewable.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. leads — service enquiries from the contact page and 5 service pages
-- ---------------------------------------------------------------------
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(trim(name)) between 2 and 120),
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone       text check (phone is null or char_length(phone) <= 40),
  service     text check (service is null or char_length(service) <= 60),
  message     text not null check (char_length(trim(message)) between 10 and 4000),
  source_path text check (source_path is null or char_length(source_path) <= 200),
  ip_hash     text check (ip_hash is null or char_length(ip_hash) = 64),
  status      text not null default 'new'
              check (status in ('new','read','replied','archived','spam'))
);

comment on table  public.leads is
  'Service enquiries. Public writes go through the server action only.';
comment on column public.leads.ip_hash is
  'SHA-256 of IP + salt. Rate limiting only — never store a raw IP address.';

create index if not exists leads_status_created_idx
  on public.leads (status, created_at desc);
create index if not exists leads_ip_recent_idx
  on public.leads (ip_hash, created_at desc);

alter table public.leads enable row level security;


-- ---------------------------------------------------------------------
-- 2. admins — who may use /admin
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

comment on table public.admins is
  'KSF staff permitted to use /admin. No INSERT policy exists, so members can only be added here in the dashboard — an admin can never promote anyone, including themselves.';

alter table public.admins enable row level security;


-- ---------------------------------------------------------------------
-- 3. private.is_admin() — the membership test used by every policy
--
-- SECURITY DEFINER so it can read admins without triggering that table's
-- own RLS, which would recurse. It lives in a schema PostgREST does not
-- expose, so it is unreachable at /rest/v1/rpc/ — a security-advisor
-- finding on the previous project that is pre-fixed here.
-- ---------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;


-- ---------------------------------------------------------------------
-- 4. Policies
--
-- Deliberately absent:
--   * INSERT on leads  — public submissions must go through the server
--     action, so Turnstile, the honeypot and rate limiting cannot be
--     bypassed by posting straight at PostgREST.
--   * DELETE on leads  — enquiries are archived, never destroyed.
--   * INSERT on admins — see the table comment above.
-- ---------------------------------------------------------------------
drop policy if exists "admin reads own membership"  on public.admins;
drop policy if exists "admins read leads"           on public.leads;
drop policy if exists "admins update lead status"   on public.leads;

create policy "admin reads own membership"
  on public.admins for select to authenticated
  using (user_id = auth.uid());

create policy "admins read leads"
  on public.leads for select to authenticated
  using (private.is_admin());

create policy "admins update lead status"
  on public.leads for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());


-- ---------------------------------------------------------------------
-- 5. Grant the KSF account staff access
--
--     Matched by user id, not by email, and deliberately so. The account
--     was registered as kfstechservices@gmail.com — K and S transposed.
--     The owner's actual address is ksftechservices@gmail.com, confirmed
--     2026-08-27, and chose to keep the account rather than recreate it.
--     The id is the one thing here that is not in dispute.
--
--     KNOWN RISK, recorded so nobody has to rediscover it: a password
--     reset on this account emails kfstechservices@gmail.com, which the
--     owner does not control. Losing that password means losing /admin.
--     Fixing it means creating a new account on the correct address and
--     re-running this file — the second clause below already matches it,
--     so no edit is needed when that day comes.
--
--     RUN ORDER MATTERS. This selects from auth.users, so the account has
--     to exist first. Run it too early and it inserts zero rows, leaving
--     /admin unreachable with no error to explain why. The whole file is
--     idempotent, so if that happens, just run it again.
--
--     To add more staff later:
--       insert into public.admins (user_id, email)
--       select id, email from auth.users where email = 'them@example.com';
-- ---------------------------------------------------------------------
insert into public.admins (user_id, email)
select id, email
from auth.users
where id = '1b790698-a10c-4867-b80e-122070f7ca0a'
   or email = 'ksftechservices@gmail.com'
on conflict (user_id) do nothing;


-- ---------------------------------------------------------------------
-- 6. Verify — expect: leads and admins present, and exactly 1 admin row
--
--     Zero admin rows is the failure that looks like success: every
--     statement above will have run without complaint, and sign-in will
--     still be refused. Read the last line of the output.
-- ---------------------------------------------------------------------
select 'tables' as check, table_name as detail
from information_schema.tables
where table_schema = 'public' and table_name in ('leads','admins')
union all
select
  'admin rows',
  count(*)::text ||
  case
    when count(*) = 0
      then ' — NOT DONE: create the auth user, then run this file again'
    else ' — ok'
  end
from public.admins;
