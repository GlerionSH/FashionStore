-- FashionStore: flash offers settings + product flag

create table if not exists public.fs_settings (
	id uuid primary key default gen_random_uuid(),
	singleton boolean not null default true,
	flash_offers_enabled boolean not null default false,
	updated_at timestamptz not null default now(),
	constraint fs_settings_singleton_true check (singleton = true),
	constraint fs_settings_singleton_unique unique (singleton)
);

create or replace function public.fs_set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists fs_settings_set_updated_at on public.fs_settings;
create trigger fs_settings_set_updated_at
before update on public.fs_settings
for each row execute function public.fs_set_updated_at();

insert into public.fs_settings (singleton, flash_offers_enabled)
values (true, false)
on conflict (singleton) do nothing;

alter table if exists public.fs_products
add column if not exists is_flash boolean not null default false;

create index if not exists fs_products_is_flash_idx on public.fs_products(is_flash);
