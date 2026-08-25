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
-- 5. Grant the existing account staff access
--
--     The account was registered as ksftechservices@gmaill.com — note the
--     double L, a typo in the original signup. Matching on the intended
--     spelling would insert zero rows and silently lock everyone out, so
--     this matches the user id instead, which is stable whether or not the
--     address is later corrected.
--
--     To add more staff later:
--       insert into public.admins (user_id, email)
--       select id, email from auth.users where email = 'them@example.com';
-- ---------------------------------------------------------------------
insert into public.admins (user_id, email)
select id, email
from auth.users
where id = '77b3d936-68ec-4102-b968-bae610a8a645'
   or email in ('ksftechservices@gmaill.com', 'ksftechservices@gmail.com')
on conflict (user_id) do nothing;


-- ---------------------------------------------------------------------
-- 6. Verify — expect: leads and admins present, RLS true, 1 admin row
-- ---------------------------------------------------------------------
select 'tables' as check, table_name as detail
from information_schema.tables
where table_schema = 'public' and table_name in ('leads','admins')
union all
select 'admin rows', count(*)::text from public.admins;
