-- FashionStore: orders + order items

create table if not exists public.fs_orders (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default now(),
	email text null,
	subtotal_cents integer not null,
	discount_cents integer not null default 0,
	total_cents integer not null,
	status text not null default 'test'
);

create table if not exists public.fs_order_items (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default now(),
	order_id uuid not null references public.fs_orders(id) on delete cascade,
	product_id uuid not null references public.fs_products(id),
	qty integer not null,
	price_cents integer not null,
	line_total_cents integer not null,
	constraint fs_order_items_qty_positive check (qty > 0)
);

create index if not exists fs_order_items_order_id_idx on public.fs_order_items(order_id);
create index if not exists fs_order_items_product_id_idx on public.fs_order_items(product_id);
