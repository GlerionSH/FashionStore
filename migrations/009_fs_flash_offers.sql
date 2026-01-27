create extension if not exists pgcrypto;

create or replace function public.fs_is_admin()
returns boolean
language sql
stable
as $$
	select exists (
		select 1
		from public.fs_profiles p
		where p.id = auth.uid()
			and p.role = 'admin'
	);
$$;

create table if not exists public.fs_flash_offers (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	is_enabled boolean not null default false,
	discount_percent integer not null default 0,
	starts_at timestamptz null,
	ends_at timestamptz null,
	show_popup boolean not null default false,
	popup_title text null,
	popup_text text null,
	constraint fs_flash_offers_discount_percent_check check (discount_percent >= 0 and discount_percent <= 90),
	constraint fs_flash_offers_dates_check check (starts_at is null or ends_at is null or starts_at <= ends_at)
);

create unique index if not exists fs_flash_offers_one_enabled_idx
on public.fs_flash_offers ((true))
where is_enabled;

create index if not exists fs_flash_offers_active_lookup_idx
on public.fs_flash_offers (is_enabled, starts_at, ends_at, updated_at);

drop trigger if exists fs_flash_offers_set_updated_at on public.fs_flash_offers;
create trigger fs_flash_offers_set_updated_at
before update on public.fs_flash_offers
for each row execute function public.fs_set_updated_at();

alter table public.fs_flash_offers enable row level security;

drop policy if exists "Public can read active flash offer" on public.fs_flash_offers;
create policy "Public can read active flash offer"
	on public.fs_flash_offers
	for select
	using (
		is_enabled
		and (starts_at is null or starts_at <= now())
		and (ends_at is null or ends_at >= now())
	);

drop policy if exists "Admins can manage flash offers" on public.fs_flash_offers;
create policy "Admins can manage flash offers"
	on public.fs_flash_offers
	for all
	using (public.fs_is_admin())
	with check (public.fs_is_admin());
