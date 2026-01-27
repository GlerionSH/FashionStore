-- FashionStore: returns (devoluciones)

-- Add refund columns to fs_orders if not exist
alter table if exists public.fs_orders
	add column if not exists refund_total_cents integer not null default 0,
	add column if not exists paid_at timestamptz null,
	add column if not exists stripe_session_id text null,
	add column if not exists stripe_payment_intent_id text null;

-- Returns table
create table if not exists public.fs_returns (
	id uuid primary key default gen_random_uuid(),
	order_id uuid not null references public.fs_orders(id) on delete cascade,
	user_id uuid null,
	status text not null default 'requested'
		check (status in ('requested','approved','rejected','refunded','cancelled')),
	reason text null,
	requested_at timestamptz not null default now(),
	reviewed_at timestamptz null,
	reviewed_by text null,
	refunded_at timestamptz null,
	refund_method text not null default 'manual'
		check (refund_method in ('manual','stripe')),
	refund_total_cents integer not null default 0,
	currency text not null default 'EUR',
	stripe_refund_id text null,
	notes text null
);

-- Return items table
create table if not exists public.fs_return_items (
	id uuid primary key default gen_random_uuid(),
	return_id uuid not null references public.fs_returns(id) on delete cascade,
	order_item_id uuid not null references public.fs_order_items(id) on delete restrict,
	qty integer not null check (qty > 0),
	line_total_cents integer not null default 0
);

-- Indexes
create index if not exists fs_returns_order_id_idx on public.fs_returns(order_id);
create index if not exists fs_returns_status_requested_idx on public.fs_returns(status, requested_at desc);
create index if not exists fs_returns_user_id_idx on public.fs_returns(user_id);
create index if not exists fs_return_items_return_id_idx on public.fs_return_items(return_id);

-- Function: recalculate refund_total_cents in fs_returns from its items
create or replace function public.fs_recalc_return_total()
returns trigger
language plpgsql
as $$
declare
	v_return_id uuid;
	v_total integer;
begin
	if TG_OP = 'DELETE' then
		v_return_id := OLD.return_id;
	else
		v_return_id := NEW.return_id;
	end if;

	select coalesce(sum(line_total_cents), 0)::int
	into v_total
	from public.fs_return_items
	where return_id = v_return_id;

	update public.fs_returns
	set refund_total_cents = v_total
	where id = v_return_id;

	if TG_OP = 'DELETE' then
		return OLD;
	else
		return NEW;
	end if;
end;
$$;

drop trigger if exists trg_fs_return_items_recalc on public.fs_return_items;
create trigger trg_fs_return_items_recalc
after insert or update or delete on public.fs_return_items
for each row execute function public.fs_recalc_return_total();

-- Function: recalculate refund_total_cents in fs_orders when return status changes to refunded
create or replace function public.fs_recalc_order_refunds()
returns trigger
language plpgsql
as $$
declare
	v_order_id uuid;
	v_total integer;
begin
	v_order_id := NEW.order_id;

	select coalesce(sum(refund_total_cents), 0)::int
	into v_total
	from public.fs_returns
	where order_id = v_order_id
	  and status = 'refunded';

	update public.fs_orders
	set refund_total_cents = v_total
	where id = v_order_id;

	return NEW;
end;
$$;

drop trigger if exists trg_fs_returns_recalc_order on public.fs_returns;
create trigger trg_fs_returns_recalc_order
after insert or update on public.fs_returns
for each row execute function public.fs_recalc_order_refunds();

-- RLS (basic, will validate ownership in endpoints)
alter table public.fs_returns enable row level security;
alter table public.fs_return_items enable row level security;

-- Policy: users can view their own returns
drop policy if exists fs_returns_select_own on public.fs_returns;
create policy fs_returns_select_own on public.fs_returns
	for select using (user_id = auth.uid());

-- Policy: users can insert returns for their orders
drop policy if exists fs_returns_insert_own on public.fs_returns;
create policy fs_returns_insert_own on public.fs_returns
	for insert with check (
		exists (
			select 1 from public.fs_orders
			where id = order_id
			  and user_id = auth.uid()
			  and status = 'paid'
		)
	);

-- Policy: return items viewable if return is viewable
drop policy if exists fs_return_items_select on public.fs_return_items;
create policy fs_return_items_select on public.fs_return_items
	for select using (
		exists (
			select 1 from public.fs_returns
			where id = return_id
			  and user_id = auth.uid()
		)
	);

-- Policy: return items insertable if return is own
drop policy if exists fs_return_items_insert on public.fs_return_items;
create policy fs_return_items_insert on public.fs_return_items
	for insert with check (
		exists (
			select 1 from public.fs_returns
			where id = return_id
			  and user_id = auth.uid()
		)
	);
