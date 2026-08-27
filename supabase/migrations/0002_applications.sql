-- =====================================================================
-- KSF Tech Services — applications
-- Target: Supabase project "innocentpeter964@gmail.com's Project"
--         org Kfs · ref fzxukernlqccajjhjilg
--
-- HOW TO RUN
--   Dashboard > SQL Editor > New query > paste this whole file > Run.
--   It is idempotent: safe to run more than once.
--   Run 0001_init.sql first — this depends on private.is_admin().
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. The status pipeline — the whole product, in one enum
--
--     payment_pending exists even though payment is currently switched
--     off. Applications skip straight to 'submitted' while
--     APPLY_REQUIRES_PAYMENT is unset, and the value is here so turning
--     Stripe on later is a config change rather than a migration.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'application_status') then
    create type application_status as enum (
      'payment_pending',  -- form submitted, Checkout not completed
      'submitted',        -- awaiting review
      'in_review',        -- opened by staff
      'accepted',
      'waitlisted',
      'declined',         -- triggers cancel + refund once Stripe is live
      'withdrawn'
    );
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 2. Human-readable references — KSF-2026-0042
--
--     A sequence rather than a count of rows: counting would reuse a
--     reference after a deletion, and two applications submitted in the
--     same second would collide. The number does not reset each year;
--     the year is stamped at insert, so 2027 simply continues upward.
-- ---------------------------------------------------------------------
create sequence if not exists public.application_ref_seq start 1;

create or replace function public.next_application_reference()
returns text
language sql
volatile
as $$
  select 'KSF-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.application_ref_seq')::text, 4, '0');
$$;


-- ---------------------------------------------------------------------
-- 3. applications
--
--     Note: the column is `occupation`, not `current_role`.
--     current_role is a reserved word in Postgres and would have to be
--     quoted at every single use — a trap worth stepping around once.
-- ---------------------------------------------------------------------
create table if not exists public.applications (
  id            uuid primary key default gen_random_uuid(),
  reference     text not null unique default public.next_application_reference(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  course_slug   text not null check (char_length(course_slug) between 2 and 80),

  -- Step 1 · about you
  name          text not null check (char_length(trim(name)) between 2 and 120),
  email         text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone         text check (phone is null or char_length(phone) <= 40),
  country       text check (country is null or char_length(country) <= 60),

  -- Step 2 · experience
  experience_level text check (experience_level is null or experience_level in
                     ('none','some','working','experienced')),
  occupation    text check (occupation is null or char_length(occupation) <= 120),
  background    text check (background is null or char_length(background) <= 2000),

  -- Step 3 · motivation
  motivation    text not null check (char_length(trim(motivation)) between 10 and 2000),
  goals         text check (goals is null or char_length(goals) <= 2000),
  weekly_hours  int check (weekly_hours is null or weekly_hours between 1 and 60),

  -- Step 4 · consent, captured before payment rather than after
  agreed_terms            boolean not null default false,
  agreed_immediate_start  boolean not null default false,

  status        application_status not null default 'submitted',

  -- Stripe, populated once payment is switched on
  stripe_customer_id     text,
  stripe_subscription_id text,
  stripe_checkout_id     text,
  paid_at                timestamptz,

  ip_hash       text check (ip_hash is null or char_length(ip_hash) = 64)
);

comment on table public.applications is
  'Certification track applications. Server-role writes only; RLS lets staff read and update status.';
comment on column public.applications.occupation is
  'Named occupation rather than current_role, which is a reserved word in Postgres.';

create index if not exists applications_status_created_idx
  on public.applications (status, created_at asc);
create index if not exists applications_course_idx
  on public.applications (course_slug, created_at desc);
create index if not exists applications_email_idx
  on public.applications (email);

alter table public.applications enable row level security;


-- ---------------------------------------------------------------------
-- 4. application_events — immutable audit trail
--
--     Every status change, who made it and when. No UPDATE or DELETE
--     policy exists anywhere: an audit trail that can be edited is not
--     an audit trail. Matters here because money moves on a decline.
-- ---------------------------------------------------------------------
create table if not exists public.application_events (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  created_at     timestamptz not null default now(),
  actor          text,   -- staff email, or null for automated steps
  event          text not null check (char_length(event) <= 80),
  detail         text check (detail is null or char_length(detail) <= 2000)
);

create index if not exists application_events_app_idx
  on public.application_events (application_id, created_at desc);

alter table public.application_events enable row level security;


-- ---------------------------------------------------------------------
-- 5. access_tokens — the status page, without accounts
--
--     Only the SHA-256 hash is stored. A leaked database therefore does
--     not hand out working status links, and the raw token exists only
--     in the applicant's email and their browser history.
-- ---------------------------------------------------------------------
create table if not exists public.access_tokens (
  token_hash     text primary key check (char_length(token_hash) = 64),
  application_id uuid not null references public.applications(id) on delete cascade,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  last_used_at   timestamptz
);

create index if not exists access_tokens_app_idx
  on public.access_tokens (application_id);

alter table public.access_tokens enable row level security;


-- ---------------------------------------------------------------------
-- 6. application_feedback — the written decision
-- ---------------------------------------------------------------------
create table if not exists public.application_feedback (
  application_id uuid primary key references public.applications(id) on delete cascade,
  body           text not null check (char_length(trim(body)) between 10 and 8000),
  decided_by     text,
  decided_at     timestamptz not null default now(),
  sent_at        timestamptz
);

alter table public.application_feedback enable row level security;


-- ---------------------------------------------------------------------
-- 7. Policies
--
--     Deliberately absent everywhere: INSERT and DELETE. Applications
--     arrive only through the server action, so validation, Turnstile
--     and rate limiting cannot be bypassed by posting at PostgREST.
--     Applications are withdrawn, never deleted.
-- ---------------------------------------------------------------------
drop policy if exists "admins read applications"    on public.applications;
drop policy if exists "admins update applications"  on public.applications;
drop policy if exists "admins read events"          on public.application_events;
drop policy if exists "admins read feedback"        on public.application_feedback;
drop policy if exists "admins write feedback"       on public.application_feedback;

create policy "admins read applications"
  on public.applications for select to authenticated
  using (private.is_admin());

create policy "admins update applications"
  on public.applications for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "admins read events"
  on public.application_events for select to authenticated
  using (private.is_admin());

create policy "admins read feedback"
  on public.application_feedback for select to authenticated
  using (private.is_admin());

create policy "admins write feedback"
  on public.application_feedback for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- access_tokens gets no policy at all. The status page resolves a token
-- server-side with the service role; nothing else may read this table.


-- ---------------------------------------------------------------------
-- 8. Keep updated_at honest
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists applications_touch_updated_at on public.applications;
create trigger applications_touch_updated_at
  before update on public.applications
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------
-- 9. Verify — expect 5 tables, the enum, and a working reference
-- ---------------------------------------------------------------------
select 'table' as check, table_name as detail
from information_schema.tables
where table_schema = 'public'
  and table_name in ('applications','application_events','access_tokens','application_feedback','leads')
union all
select 'enum values', string_agg(enumlabel, ', ' order by enumsortorder)
from pg_enum e join pg_type t on t.oid = e.enumtypid
where t.typname = 'application_status'
union all
-- Reads the sequence rather than calling next_application_reference(),
-- which would burn a number and make the first real applicant 0002.
select 'reference format',
       'KSF-' || to_char(now(), 'YYYY') || '-' ||
       lpad((case when is_called then last_value + 1 else last_value end)::text, 4, '0')
from public.application_ref_seq;
