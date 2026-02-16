-- FashionStore: collections / seasons and product i18n

-- Ensure pgcrypto for gen_random_uuid (id columns)
create extension if not exists pgcrypto;

-- Collections table (seasons, capsules, etc.)
create table if not exists public.fs_collections (
	id uuid primary key default gen_random_uuid(),
	slug text unique not null,
	type text not null default 'season',
	name_es text not null,
	name_en text not null,
	subtitle_es text null,
	subtitle_en text null,
	hero_image_url text null,
	banner_image_url text null,
	is_active boolean not null default true,
	sort_order integer not null default 0,
	starts_at timestamptz null,
	ends_at timestamptz null,
	created_at timestamptz not null default now()
);

-- Pivot table: collections ↔ products
create table if not exists public.fs_collection_products (
	collection_id uuid not null references public.fs_collections(id) on delete cascade,
	product_id uuid not null references public.fs_products(id) on delete cascade,
	sort_order integer not null default 0,
	primary key (collection_id, product_id)
);

-- Optional index for reverse lookup by product
create index if not exists fs_collection_products_product_id_idx
	on public.fs_collection_products(product_id);

-- i18n fields on products
alter table if exists public.fs_products
	add column if not exists name_es text,
	add column if not exists name_en text,
	add column if not exists description_es text,
	add column if not exists description_en text;

-- Backfill: move existing name into name_es if missing
update public.fs_products
set name_es = name
where name_es is null
	and name is not null;

-- Backfill: placeholder EN name = ES name if missing
update public.fs_products
set name_en = name_es
where name_en is null
	and name_es is not null;

-- RLS: enable row level security
alter table public.fs_collections enable row level security;
alter table public.fs_collection_products enable row level security;

-- Public read-only: only active collections in current timeframe
-- fs_collections
drop policy if exists fs_collections_select_public on public.fs_collections;
create policy fs_collections_select_public on public.fs_collections
	for select
	using (
		is_active = true
		and (starts_at is null or starts_at <= now())
		and (ends_at is null or ends_at >= now())
	);

-- Admins can manage collections
drop policy if exists fs_collections_admin_all on public.fs_collections;
create policy fs_collections_admin_all on public.fs_collections
	for all
	using (public.fs_is_admin())
	with check (public.fs_is_admin());

-- fs_collection_products: public can read only if parent collection is active
drop policy if exists fs_collection_products_select_public on public.fs_collection_products;
create policy fs_collection_products_select_public on public.fs_collection_products
	for select
	using (
		exists (
			select 1
			from public.fs_collections c
			where c.id = collection_id
				and c.is_active = true
				and (c.starts_at is null or c.starts_at <= now())
				and (c.ends_at is null or c.ends_at >= now())
		)
	);

-- Admins can manage collection-product relations
drop policy if exists fs_collection_products_admin_all on public.fs_collection_products;
create policy fs_collection_products_admin_all on public.fs_collection_products
	for all
	using (public.fs_is_admin())
	with check (public.fs_is_admin());

-- Seed initial four season collections (id auto-generated)
insert into public.fs_collections (
	slug,
	type,
	name_es,
	name_en,
	subtitle_es,
	subtitle_en,
	sort_order
) values
	('invierno', 'season', 'Invierno', 'Winter', 'Abrigos, punto y capas cálidas', 'Coats, knits and warm layers', 10),
	('primavera', 'season', 'Primavera', 'Spring', 'Capas ligeras y tonos suaves', 'Light layers and soft tones', 20),
	('verano', 'season', 'Verano', 'Summer', 'Vestidos fluidos y tejidos frescos', 'Flowy dresses and fresh fabrics', 30),
	('otono', 'season', 'Otoño', 'Autumn', 'Tonos tierra y capas de transición', 'Earth tones and transition layers', 40)
	on conflict (slug) do nothing;
