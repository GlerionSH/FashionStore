-- Migration: Update checkout RPC to support sizes
-- Handles size validation, size_stock decrement, and saves size to order items

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
	v_item record;
	v_product record;
	v_size_stock jsonb;
	v_current_size_qty integer;
begin
	if items is null or jsonb_typeof(items) <> 'array' then
		raise exception 'INVALID_ITEMS: items debe ser un array JSON' using errcode = 'P0001';
	end if;

	select count(*)::int into v_items_count
	from jsonb_array_elements(items) e;

	if v_items_count = 0 then
		raise exception 'INVALID_ITEMS: items no puede estar vacío' using errcode = 'P0001';
	end if;

	-- Validate basic item structure
	if exists (
		select 1
		from jsonb_to_recordset(items) as r(product_id uuid, qty integer, size text)
		where r.product_id is null or r.qty is null or r.qty <= 0
	) then
		raise exception 'INVALID_ITEMS: qty debe ser > 0 y product_id es requerido' using errcode = 'P0001';
	end if;

	-- Lock and validate products
	with requested as (
		select r.product_id, r.size, sum(r.qty)::int as qty
		from jsonb_to_recordset(items) as r(product_id uuid, qty integer, size text)
		group by r.product_id, r.size
	),
	locked as (
		select p.id, p.price_cents, p.stock, p.is_active, p.sizes, p.size_stock
		from public.fs_products p
		where p.id in (select distinct product_id from requested)
		for update
	)
	select (select count(distinct product_id) from requested)::int,
			(select count(*) from locked)::int
	into v_items_count, v_locked_count;

	if v_locked_count <> v_items_count then
		raise exception 'INVALID_PRODUCT: producto no encontrado en items' using errcode = 'P0001';
	end if;

	-- Check for inactive products
	if exists (
		with requested as (
			select distinct r.product_id
			from jsonb_to_recordset(items) as r(product_id uuid, qty integer, size text)
		)
		select 1
		from public.fs_products p
		join requested req on req.product_id = p.id
		where p.is_active is not true
	) then
		raise exception 'INACTIVE_PRODUCT: producto inactivo' using errcode = 'P0001';
	end if;

	-- Validate size requirements and stock per size
	for v_item in 
		select r.product_id, r.size, sum(r.qty)::int as qty
		from jsonb_to_recordset(items) as r(product_id uuid, qty integer, size text)
		group by r.product_id, r.size
	loop
		select p.* into v_product
		from public.fs_products p
		where p.id = v_item.product_id;

		-- If product has sizes defined
		if v_product.sizes is not null and array_length(v_product.sizes, 1) > 0 then
			-- Size is required
			if v_item.size is null or v_item.size = '' then
				raise exception 'INVALID_ITEMS: talla requerida para producto %', v_product.id using errcode = 'P0001';
			end if;
			
			-- Size must be valid
			if not (v_item.size = any(v_product.sizes)) then
				raise exception 'INVALID_ITEMS: talla % no válida para producto %', v_item.size, v_product.id using errcode = 'P0001';
			end if;
			
			-- Check size stock
			v_current_size_qty := coalesce((v_product.size_stock->>v_item.size)::int, 0);
			if v_current_size_qty < v_item.qty then
				raise exception 'OUT_OF_STOCK: stock insuficiente para talla % del producto %', v_item.size, v_product.id using errcode = 'P0001';
			end if;
		else
			-- Product without sizes - check general stock
			if v_product.stock < v_item.qty then
				raise exception 'OUT_OF_STOCK: stock insuficiente para producto %', v_product.id using errcode = 'P0001';
			end if;
		end if;
	end loop;

	-- Calculate subtotal
	select sum(p.price_cents * req.qty)::int
	into v_subtotal
	from (
		select r.product_id, r.size, sum(r.qty)::int as qty
		from jsonb_to_recordset(items) as r(product_id uuid, qty integer, size text)
		group by r.product_id, r.size
	) req
	join public.fs_products p on p.id = req.product_id;

	v_discount := case when v_subtotal >= 10000 then floor(v_subtotal * 0.1)::int else 0 end;
	v_total := v_subtotal - v_discount;

	-- Create order
	insert into public.fs_orders (email, user_id, subtotal_cents, discount_cents, total_cents, status)
	values (customer_email, customer_user_id, v_subtotal, v_discount, v_total, 'pending')
	returning id into v_order_id;

	-- Insert order items with size
	insert into public.fs_order_items (order_id, product_id, qty, price_cents, line_total_cents, size)
	select
		v_order_id,
		p.id,
		req.qty,
		p.price_cents,
		(p.price_cents * req.qty)::int,
		req.size
	from (
		select r.product_id, r.size, sum(r.qty)::int as qty
		from jsonb_to_recordset(items) as r(product_id uuid, qty integer, size text)
		group by r.product_id, r.size
	) req
	join public.fs_products p on p.id = req.product_id;

	-- Update stock: decrement general stock and size_stock
	for v_item in 
		select r.product_id, r.size, sum(r.qty)::int as qty
		from jsonb_to_recordset(items) as r(product_id uuid, qty integer, size text)
		group by r.product_id, r.size
	loop
		select p.* into v_product
		from public.fs_products p
		where p.id = v_item.product_id;

		if v_product.sizes is not null and array_length(v_product.sizes, 1) > 0 and v_item.size is not null then
			-- Decrement size_stock
			v_current_size_qty := coalesce((v_product.size_stock->>v_item.size)::int, 0);
			update public.fs_products
			set size_stock = jsonb_set(
				coalesce(size_stock, '{}'::jsonb),
				array[v_item.size],
				to_jsonb(greatest(0, v_current_size_qty - v_item.qty))
			)
			where id = v_item.product_id;
		else
			-- Decrement general stock
			update public.fs_products
			set stock = greatest(0, stock - v_item.qty)
			where id = v_item.product_id;
		end if;
	end loop;

	return query
	select v_order_id, v_subtotal, v_discount, v_total;
end;
$$;

-- Revoke and grant permissions
revoke all on function public.fs_checkout_test(jsonb, text, uuid) from public;
grant execute on function public.fs_checkout_test(jsonb, text, uuid) to service_role;
