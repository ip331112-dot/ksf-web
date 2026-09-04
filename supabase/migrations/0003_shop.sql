-- =====================================================================
-- KSF Tech Services — the shop
-- Target: Supabase project "innocentpeter964@gmail.com's Project"
--         org Kfs · ref fzxukernlqccajjhjilg
--
-- HOW TO RUN
--   Dashboard > SQL Editor. Paste and run ONE CHUNK AT A TIME, in order.
--   Chunk markers are the `-- ===== CHUNK n` lines below.
--
--   Do NOT paste the whole file. A ~200 line paste silently fails to land
--   in the dashboard's Monaco editor — this cost a long detour when 0002
--   was applied, and splitting it fixed it first time. There is a helper:
--       node scripts/migrate-chunk.mjs 0003 1
--   puts chunk 1 on the clipboard, ready to paste.
--
--   Every chunk is idempotent: safe to re-run if you lose your place.
--   Run 0001 and 0002 first — this depends on private.is_admin().
--
-- WHAT THIS BUILDS
--   A shop selling physical goods (adapters, kit, clothing, books) and
--   digital downloads side by side, stocked by staff through /admin with
--   no code. Ten tables, two storage buckets.
--
-- THE ONE IDEA WORTH HOLDING
--   The sellable unit is the VARIANT, not the product. A hoodie is one
--   product with four variants, each with its own stock, and any of them
--   can sell out alone. Products with no options still get exactly one
--   variant, so a mug and a hoodie travel the same code path instead of
--   needing two. Baskets and order lines therefore point at variants.
-- =====================================================================


-- ===== CHUNK 1 — enums ==============================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'product_kind') then
    create type product_kind as enum ('physical', 'digital');
  end if;

  if not exists (select 1 from pg_type where typname = 'product_status') then
    create type product_status as enum ('draft', 'published', 'archived');
  end if;

  -- dispatched is absent for a digital-only order: it is delivered at
  -- 'paid' and never posted. The status means "parcel has left", not
  -- "customer has been served".
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum (
      'awaiting_payment',
      'paid',
      'dispatched',
      'cancelled',
      'refunded'
    );
  end if;
end $$;


-- ===== CHUNK 2 — order references ===================================

-- KSF-ORD-2026-0042. A sequence, not a row count: counting would reuse a
-- reference after a deletion, and two orders placed in the same second
-- would collide. Mirrors next_application_reference() in 0002.
create sequence if not exists public.order_ref_seq start 1;

create or replace function public.next_order_reference()
returns text
language sql
volatile
as $$
  select 'KSF-ORD-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.order_ref_seq')::text, 4, '0');
$$;


-- ===== CHUNK 3 — shop_categories ====================================

-- The sidebar. Admin-editable, because "no code" has to include the menu
-- or adding a category becomes a deploy.
--
-- `grp` groups rows either side of the divider. It is not called "group",
-- which is a reserved word and would need quoting at every single use.
-- `icon` is a name resolved to a component in the app, not markup — the
-- database has no business storing SVG.
create table if not exists public.shop_categories (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_en    text not null check (char_length(trim(name_en)) between 1 and 60),
  name_fr    text not null check (char_length(trim(name_fr)) between 1 and 60),
  icon       text not null default 'bag' check (char_length(icon) <= 40),
  grp        smallint not null default 1 check (grp between 1 and 9),
  sort_order smallint not null default 0,
  visible    boolean not null default true
);

comment on table public.shop_categories is
  'Shop sidebar. "All" is NOT a row here — it is the unfiltered view.';

create index if not exists shop_categories_order_idx
  on public.shop_categories (grp, sort_order);

alter table public.shop_categories enable row level security;


-- ===== CHUNK 4 — products ===========================================

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category_id uuid references public.shop_categories(id) on delete restrict,
  kind        product_kind   not null default 'physical',
  status      product_status not null default 'draft',

  name_en        text, summary_en text, description_en text,
  name_fr        text, summary_fr text, description_fr text,

  -- Base price. A variant may override it; null on the variant means
  -- "use this". Two sources of truth is a real cost, but the alternative
  -- makes every simple product a join to show a price on a card.
  price_pence     integer not null default 0 check (price_pence >= 0),
  compare_at_pence integer check (compare_at_pence is null or compare_at_pence > price_pence),

  weight_grams    integer check (weight_grams is null or weight_grams between 0 and 100000),
  file_path       text,      -- digital only: object in shop-files
  file_bytes      bigint,
  sort_order      smallint not null default 0
);


-- ===== CHUNK 5 — the publish gate ===================================

-- Both languages, enforced here rather than only in the form. A form can
-- be bypassed by anything that talks to the database; a constraint
-- cannot. Drafts stay unconstrained so half-finished work can be saved.
--
-- A digital product must carry a file before it can be sold, or a buyer
-- pays for a download that does not exist.
alter table public.products drop constraint if exists products_publishable;
alter table public.products add constraint products_publishable check (
  status <> 'published' or (
        char_length(trim(coalesce(name_en, '')))        > 0
    and char_length(trim(coalesce(summary_en, '')))     > 0
    and char_length(trim(coalesce(description_en, ''))) > 0
    and char_length(trim(coalesce(name_fr, '')))        > 0
    and char_length(trim(coalesce(summary_fr, '')))     > 0
    and char_length(trim(coalesce(description_fr, ''))) > 0
    and category_id is not null
    and (kind <> 'digital' or file_path is not null)
  )
);

create index if not exists products_status_idx  on public.products (status, sort_order);
create index if not exists products_cat_idx     on public.products (category_id, sort_order);

alter table public.products enable row level security;


-- ===== CHUNK 6 — variants, images, specs ============================

-- The sellable unit. option1/option2 are generic on purpose: naming them
-- size/colour would be wrong the first time something has a length or a
-- capacity instead.
create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  option1     text check (option1 is null or char_length(option1) <= 40),
  option2     text check (option2 is null or char_length(option2) <= 40),
  sku         text unique check (sku is null or char_length(sku) <= 60),
  price_pence integer check (price_pence is null or price_pence >= 0),
  stock       integer not null default 0 check (stock >= 0),
  low_stock_at integer not null default 3 check (low_stock_at >= 0),
  sort_order  smallint not null default 0
);

create unique index if not exists product_variants_combo_idx
  on public.product_variants (product_id, coalesce(option1, ''), coalesce(option2, ''));

create table if not exists public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  path       text not null,
  alt_en     text, alt_fr text,
  sort_order smallint not null default 0
);

create index if not exists product_images_order_idx
  on public.product_images (product_id, sort_order);

create table if not exists public.product_specs (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label_en   text not null, label_fr text not null,
  value_en   text not null, value_fr text not null,
  sort_order smallint not null default 0
);

create index if not exists product_specs_order_idx
  on public.product_specs (product_id, sort_order);

alter table public.product_variants enable row level security;
alter table public.product_images   enable row level security;
alter table public.product_specs    enable row level security;


-- ===== CHUNK 7 — orders =============================================

create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  reference   text not null unique default public.next_order_reference(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  email  text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name   text not null check (char_length(trim(name)) between 2 and 120),
  phone  text check (phone is null or char_length(phone) <= 40),

  -- 0002 has no applications.locale, which is exactly why the decision
  -- email is stuck in English. Not repeating that here.
  locale text not null default 'en' check (locale in ('en', 'fr')),

  status order_status not null default 'awaiting_payment',

  -- Delivery. Null for a download-only order, required otherwise —
  -- enforced by the server action, not here, because an order is built
  -- in one insert and the check would have to know the items.
  ship_line1    text, ship_line2 text, ship_city text,
  ship_postcode text, ship_country text check (ship_country is null or char_length(ship_country) = 2),

  goods_pence   integer not null default 0 check (goods_pence >= 0),
  postage_pence integer not null default 0 check (postage_pence >= 0),
  total_pence   integer not null default 0 check (total_pence >= 0),
  currency      text not null default 'GBP',

  -- Express consent to immediate delivery, which waives the statutory
  -- withdrawal right on downloads. Stored, not just ticked: you may have
  -- to prove it was given.
  digital_consent    boolean not null default false,
  digital_consent_at timestamptz,

  paid_at      timestamptz,
  paid_by      text,
  payment_note text check (payment_note is null or char_length(payment_note) <= 200),

  dispatched_at timestamptz,
  dispatched_by text,
  tracking      text check (tracking is null or char_length(tracking) <= 120),
  carrier       text check (carrier is null or char_length(carrier) <= 60),

  -- Dormant, exactly as 0002 did for applications: switching cards on
  -- later becomes config plus a webhook, not a migration.
  stripe_customer_id       text,
  stripe_payment_intent_id text,
  stripe_checkout_id       text,

  ip_hash text check (ip_hash is null or char_length(ip_hash) = 64)
);

create index if not exists orders_status_idx on public.orders (status, created_at asc);
create index if not exists orders_email_idx  on public.orders (email);

alter table public.orders enable row level security;


-- ===== CHUNK 8 — order lines, trail, downloads ======================

-- Name and price are frozen at purchase. Raising a price must never
-- rewrite what somebody already agreed to pay, and archiving a product
-- must not blank an old invoice — hence `on delete set null`.
create table if not exists public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  variant_id      uuid references public.product_variants(id) on delete set null,
  product_id      uuid references public.products(id) on delete set null,
  name_snapshot   text not null,
  option_snapshot text,
  kind            product_kind not null default 'physical',
  unit_price_pence integer not null check (unit_price_pence >= 0),
  qty             integer not null default 1 check (qty between 1 and 99)
);

create index if not exists order_items_order_idx on public.order_items (order_id);

create table if not exists public.order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  actor      text,
  event      text not null check (char_length(event) <= 80),
  detail     text check (detail is null or char_length(detail) <= 2000)
);

create index if not exists order_events_order_idx
  on public.order_events (order_id, created_at desc);

-- Only the SHA-256 hash is stored, as with access_tokens in 0002: a
-- leaked database hands out no working download links.
create table if not exists public.download_grants (
  token_hash    text primary key check (char_length(token_hash) = 64),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  max_downloads integer not null default 5 check (max_downloads > 0),
  downloads_used integer not null default 0 check (downloads_used >= 0),
  last_used_at  timestamptz
);

create index if not exists download_grants_item_idx
  on public.download_grants (order_item_id);

alter table public.order_items    enable row level security;
alter table public.order_events   enable row level security;
alter table public.download_grants enable row level security;


-- ===== CHUNK 9 — policies ===========================================

-- Deliberately absent: any INSERT policy on orders. Orders arrive only
-- through the server action, so stock checks, price recalculation and
-- rate limiting cannot be bypassed by posting at PostgREST directly.
-- download_grants gets no policy at all — service role only.

drop policy if exists "public reads categories"     on public.shop_categories;
drop policy if exists "admins write categories"     on public.shop_categories;
drop policy if exists "public reads live products"  on public.products;
drop policy if exists "admins write products"       on public.products;
drop policy if exists "public reads variants"       on public.product_variants;
drop policy if exists "admins write variants"       on public.product_variants;
drop policy if exists "public reads images"         on public.product_images;
drop policy if exists "admins write images"         on public.product_images;
drop policy if exists "public reads specs"          on public.product_specs;
drop policy if exists "admins write specs"          on public.product_specs;
drop policy if exists "admins read orders"          on public.orders;
drop policy if exists "admins update orders"        on public.orders;
drop policy if exists "admins read order items"     on public.order_items;
drop policy if exists "admins read order events"    on public.order_events;

create policy "public reads categories" on public.shop_categories
  for select to anon, authenticated using (visible);

create policy "admins write categories" on public.shop_categories
  for all to authenticated using (private.is_admin()) with check (private.is_admin());


-- ===== CHUNK 10 — policies, continued ===============================

-- Anonymous visitors see published products only. Drafts and archived
-- rows are invisible at the API, not merely filtered in the query.
create policy "public reads live products" on public.products
  for select to anon, authenticated using (status = 'published');

create policy "admins write products" on public.products
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy "public reads variants" on public.product_variants
  for select to anon, authenticated using (
    exists (select 1 from public.products p
            where p.id = product_id and p.status = 'published')
  );

create policy "admins write variants" on public.product_variants
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy "public reads images" on public.product_images
  for select to anon, authenticated using (
    exists (select 1 from public.products p
            where p.id = product_id and p.status = 'published')
  );

create policy "admins write images" on public.product_images
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy "public reads specs" on public.product_specs
  for select to anon, authenticated using (
    exists (select 1 from public.products p
            where p.id = product_id and p.status = 'published')
  );

create policy "admins write specs" on public.product_specs
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy "admins read orders"       on public.orders       for select to authenticated using (private.is_admin());
create policy "admins update orders"     on public.orders       for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admins read order items"  on public.order_items  for select to authenticated using (private.is_admin());
create policy "admins read order events" on public.order_events for select to authenticated using (private.is_admin());


-- ===== CHUNK 11 — triggers and stock ================================

drop trigger if exists shop_categories_touch on public.shop_categories;
create trigger shop_categories_touch before update on public.shop_categories
  for each row execute function public.touch_updated_at();

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- Stock comes down when money lands, not when something enters a basket:
-- an abandoned cart must not hold the last adapter hostage. Called by the
-- mark-paid action under the service role.
--
-- Physical lines only. A download has no stock to decrement, and
-- greatest(...,0) means a race between two buyers of the last unit
-- leaves the count at zero rather than negative — resolved by refunding
-- one of them, not by a locking scheme nobody can debug.
create or replace function public.decrement_stock_for_order(p_order_id uuid)
returns void
language sql
volatile
as $$
  update public.product_variants v
     set stock = greatest(v.stock - i.qty, 0)
    from public.order_items i
   where i.order_id = p_order_id
     and i.variant_id = v.id
     and i.kind = 'physical';
$$;


-- ===== CHUNK 12 — storage buckets ===================================

-- shop-images is public: a product photo is on a public page and signing
-- every one of them would cost a round trip per card for no secrecy.
-- shop-files is private and gets NO policy, so it is unreachable with the
-- anon key no matter what a caller sends. Downloads are served by
-- redirecting to a 60-second signed URL minted with the service role.
insert into storage.buckets (id, name, public)
values ('shop-images', 'shop-images', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('shop-files', 'shop-files', false)
on conflict (id) do update set public = false;

drop policy if exists "public reads shop images" on storage.objects;
create policy "public reads shop images" on storage.objects
  for select to anon, authenticated using (bucket_id = 'shop-images');


-- ===== CHUNK 13 — seed the menu =====================================

-- Your eight categories, in the order and grouping you sent. "All" is
-- absent on purpose: it is the unfiltered view, not a row.
insert into public.shop_categories (slug, name_en, name_fr, icon, grp, sort_order) values
  ('hardware-bundles',  'Hardware Bundles',  'Packs matériel',        'gift', 1, 1),
  ('wireless-adapters', 'Wireless Adapters', 'Adaptateurs sans fil',  'wifi', 1, 2),
  ('pentesting-tools',  'Pentesting Tools',  'Outils de pentest',     'mask', 1, 3),
  ('security',          'Security',          'Sécurité',              'lock', 1, 4),
  ('accessories',       'Accessories',       'Accessoires',           'mug',  2, 1),
  ('clothing',          'Clothing',          'Vêtements',             'tie',  2, 2),
  ('books',             'Books',             'Livres',                'book', 2, 3)
on conflict (slug) do nothing;


-- ===== CHUNK 14 — order access tokens ===============================

-- Looking at your own order without an account, exactly as
-- access_tokens does for applications in 0002. Only the SHA-256 hash is
-- stored, so a leaked database hands out no working links; the raw token
-- exists in the buyer's email and their browser history and nowhere
-- else.
--
-- Separate from download_grants on purpose: this grants sight of an
-- order, that grants one file. A buyer who has forwarded their receipt
-- has not thereby handed over their downloads.
create table if not exists public.order_tokens (
  token_hash   text primary key check (char_length(token_hash) = 64),
  order_id     uuid not null references public.orders(id) on delete cascade,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  last_used_at timestamptz
);

create index if not exists order_tokens_order_idx
  on public.order_tokens (order_id);

-- No policy at all: resolved server-side with the service role, like
-- access_tokens. Nothing else may read this table.
alter table public.order_tokens enable row level security;


-- ===== CHUNK 15 — verify ============================================

select 'tables' as check, string_agg(table_name, ', ' order by table_name) as detail
from information_schema.tables
where table_schema = 'public'
  and table_name in ('shop_categories','products','product_variants','product_images',
                     'product_specs','orders','order_items','order_events',
                     'download_grants','order_tokens')
union all
select 'enums', string_agg(distinct t.typname, ', ')
from pg_type t join pg_enum e on e.enumtypid = t.oid
where t.typname in ('product_kind','product_status','order_status')
union all
select 'buckets', string_agg(id, ', ' order by id)
from storage.buckets where id in ('shop-images','shop-files')
union all
select 'categories seeded', count(*)::text from public.shop_categories
union all
select 'next reference',
       'KSF-ORD-' || to_char(now(), 'YYYY') || '-' ||
       lpad((case when is_called then last_value + 1 else last_value end)::text, 4, '0')
from public.order_ref_seq;

-- Expect: 10 tables, 3 enums, 2 buckets, 7 categories, KSF-ORD-2026-0001.
