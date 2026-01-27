create extension if not exists pgcrypto;

create or replace function public.fs_checkout_test(
	items jsonb,
	customer_email text default null,
	customer_user_id uuid default null
)
returns table (
	order_id uuid,
	subtotal_cents integer,
	discount_cents integer,
	total_cents integer
)
language plpgsql
as $$
declare
	v_order_id uuid;
	v_subtotal integer;
	v_discount integer;
	v_total integer;
	v_items_count integer;
	v_locked_count integer;
begin
	if items is null or jsonb_typeof(items) <> 'array' then
		raise exception 'INVALID_ITEMS: items debe ser un array JSON' using errcode = 'P0001';
	end if;

	select count(*)::int into v_items_count
	from jsonb_array_elements(items) e;

	if v_items_count = 0 then
		raise exception 'INVALID_ITEMS: items no puede estar vacío' using errcode = 'P0001';
	end if;

	if exists (
		select 1
		from jsonb_to_recordset(items) as r(product_id uuid, qty integer)
		where r.product_id is null or r.qty is null or r.qty <= 0
	) then
		raise exception 'INVALID_ITEMS: qty debe ser > 0 y product_id es requerido' using errcode = 'P0001';
	end if;

	with requested as (
		select r.product_id, sum(r.qty)::int as qty
		from jsonb_to_recordset(items) as r(product_id uuid, qty integer)
		group by r.product_id
	),
	locked as (
		select p.id, p.price_cents, p.stock, p.is_active, req.qty
		from public.fs_products p
		join requested req on req.product_id = p.id
		for update
	)
	select (select count(*) from requested)::int,
			(select count(*) from locked)::int
	into v_items_count, v_locked_count;

	if v_locked_count <> v_items_count then
		raise exception 'INVALID_PRODUCT: producto no encontrado en items' using errcode = 'P0001';
	end if;

	if exists (
		with requested as (
			select r.product_id
			from jsonb_to_recordset(items) as r(product_id uuid, qty integer)
			group by r.product_id
		)
		select 1
		from public.fs_products p
		join requested req on req.product_id = p.id
		where p.is_active is not true
	) then
		raise exception 'INACTIVE_PRODUCT: producto inactivo' using errcode = 'P0001';
	end if;

	if exists (
		with requested as (
			select r.product_id, sum(r.qty)::int as qty
			from jsonb_to_recordset(items) as r(product_id uuid, qty integer)
			group by r.product_id
		),
		locked as (
			select p.id, p.stock, req.qty
			from public.fs_products p
			join requested req on req.product_id = p.id
			for update
		)
		select 1 from locked where locked.stock < locked.qty
	) then
		raise exception 'OUT_OF_STOCK: stock insuficiente' using errcode = 'P0001';
	end if;

	select sum(p.price_cents * req.qty)::int
	into v_subtotal
	from (
		select r.product_id, sum(r.qty)::int as qty
		from jsonb_to_recordset(items) as r(product_id uuid, qty integer)
		group by r.product_id
	) req
	join public.fs_products p on p.id = req.product_id;

	v_discount := case when v_subtotal >= 10000 then floor(v_subtotal * 0.1)::int else 0 end;
	v_total := v_subtotal - v_discount;

	insert into public.fs_orders (email, user_id, subtotal_cents, discount_cents, total_cents, status)
	values (customer_email, customer_user_id, v_subtotal, v_discount, v_total, 'pending')
	returning id into v_order_id;

	insert into public.fs_order_items (order_id, product_id, qty, price_cents, line_total_cents)
	select
		v_order_id,
		p.id,
		req.qty,
		p.price_cents,
		(p.price_cents * req.qty)::int
	from (
		select r.product_id, sum(r.qty)::int as qty
		from jsonb_to_recordset(items) as r(product_id uuid, qty integer)
		group by r.product_id
	) req
	join public.fs_products p on p.id = req.product_id
	for update;

	update public.fs_products p
	set stock = p.stock - req.qty
	from (
		select r.product_id, sum(r.qty)::int as qty
		from jsonb_to_recordset(items) as r(product_id uuid, qty integer)
		group by r.product_id
	) req
	where p.id = req.product_id;

	return query
	select v_order_id, v_subtotal, v_discount, v_total;
end;
$$;

do $$
begin
	begin
		revoke all on function public.fs_checkout_test(jsonb, text) from public;
	exception when undefined_function then
		null;
	end;
end;
$$;

revoke all on function public.fs_checkout_test(jsonb, text, uuid) from public;
grant execute on function public.fs_checkout_test(jsonb, text, uuid) to service_role;