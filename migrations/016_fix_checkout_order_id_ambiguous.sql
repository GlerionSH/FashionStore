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
	v_current_size_qty integer;
	v_flash_percent integer;
	v_flash_enabled boolean;
	v_offer record;
	v_sum_paid integer;
	v_diff integer;
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
		from jsonb_to_recordset(items) as r(product_id uuid, qty integer, size text)
		where r.product_id is null or r.qty is null or r.qty <= 0
	) then
		raise exception 'INVALID_ITEMS: qty debe ser > 0 y product_id es requerido' using errcode = 'P0001';
	end if;

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

	for v_item in
		select r.product_id, r.size, sum(r.qty)::int as qty
		from jsonb_to_recordset(items) as r(product_id uuid, qty integer, size text)
		group by r.product_id, r.size
	loop
		select p.* into v_product
		from public.fs_products p
		where p.id = v_item.product_id;

		if v_product.sizes is not null and array_length(v_product.sizes, 1) > 0 then
			if v_item.size is null or v_item.size = '' then
				raise exception 'INVALID_ITEMS: talla requerida para producto %', v_product.id using errcode = 'P0001';
			end if;

			if not (v_item.size = any(v_product.sizes)) then
				raise exception 'INVALID_ITEMS: talla % no válida para producto %', v_item.size, v_product.id using errcode = 'P0001';
			end if;

			v_current_size_qty := coalesce((v_product.size_stock->>v_item.size)::int, 0);
			if v_current_size_qty < v_item.qty then
				raise exception 'OUT_OF_STOCK: stock insuficiente para talla % del producto %', v_item.size, v_product.id using errcode = 'P0001';
			end if;
		else
			if v_product.stock < v_item.qty then
				raise exception 'OUT_OF_STOCK: stock insuficiente para producto %', v_product.id using errcode = 'P0001';
			end if;
		end if;
	end loop;

	select sum(p.price_cents * req.qty)::int
	into v_subtotal
	from (
		select r.product_id, r.size, sum(r.qty)::int as qty
		from jsonb_to_recordset(items) as r(product_id uuid, qty integer, size text)
		group by r.product_id, r.size
	) req
	join public.fs_products p on p.id = req.product_id;

	select flash_offers_enabled into v_flash_enabled
	from public.fs_settings
	where singleton = true
	limit 1;

	v_flash_percent := 0;
	if coalesce(v_flash_enabled, false) then
		select o.discount_percent
		into v_flash_percent
		from public.fs_flash_offers o
		where o.is_enabled
			and (o.starts_at is null or o.starts_at <= now())
			and (o.ends_at is null or o.ends_at >= now())
		order by o.updated_at desc
		limit 1;
	end if;

	v_flash_percent := coalesce(v_flash_percent, 0);
	if v_flash_percent > 0 then
		v_discount := floor(v_subtotal * (v_flash_percent / 100.0))::int;
	else
		v_discount := case when v_subtotal >= 10000 then floor(v_subtotal * 0.1)::int else 0 end;
	end if;

	v_discount := greatest(0, least(v_discount, v_subtotal));
	v_total := v_subtotal - v_discount;

	insert into public.fs_orders (email, user_id, subtotal_cents, discount_cents, total_cents, status)
	values (customer_email, customer_user_id, v_subtotal, v_discount, v_total, 'pending')
	returning id into v_order_id;

	insert into public.fs_order_items (order_id, product_id, name, qty, price_cents, line_total_cents, size)
	select
		v_order_id,
		p.id,
		coalesce(nullif(trim(p.name), ''), 'Producto'),
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

	if v_subtotal > 0 then
		with items as (
			select i.id, i.qty, i.created_at,
				round(i.line_total_cents::numeric * (v_total::numeric / v_subtotal::numeric))::int as provisional
			from public.fs_order_items i
			where i.order_id = v_order_id
		),
		sumprov as (
			select coalesce(sum(provisional), 0)::int as sum_prov from items
		),
		ranked as (
			select it.*, (v_total - (select sum_prov from sumprov))::int as diff,
				row_number() over (order by created_at desc, id desc) as rn
			from items it
		)
		update public.fs_order_items oi
		set
			paid_line_total_cents = (r.provisional + case when r.rn = 1 then r.diff else 0 end),
			paid_unit_cents = case
				when oi.qty > 0 then round(((r.provisional + case when r.rn = 1 then r.diff else 0 end)::numeric) / oi.qty)::int
				else null
			end
		from ranked r
		where oi.id = r.id;
	else
		update public.fs_order_items oi
		set
			paid_line_total_cents = oi.line_total_cents,
			paid_unit_cents = case when oi.qty > 0 then round(oi.line_total_cents::numeric / oi.qty)::int else null end
		where oi.order_id = v_order_id;
	end if;

	for v_item in
		select r.product_id, r.size, sum(r.qty)::int as qty
		from jsonb_to_recordset(items) as r(product_id uuid, qty integer, size text)
		group by r.product_id, r.size
	loop
		select p.* into v_product
		from public.fs_products p
		where p.id = v_item.product_id;

		if v_product.sizes is not null and array_length(v_product.sizes, 1) > 0 and v_item.size is not null then
			v_current_size_qty := coalesce((v_product.size_stock->>v_item.size)::int, 0);
			update public.fs_products
			set size_stock = jsonb_set(
				coalesce(size_stock, '{}'::jsonb),
				array[v_item.size],
				to_jsonb(greatest(0, v_current_size_qty - v_item.qty))
			)
			where id = v_item.product_id;
		else
			update public.fs_products
			set stock = greatest(0, stock - v_item.qty)
			where id = v_item.product_id;
		end if;
	end loop;

	return query
	select v_order_id, v_subtotal, v_discount, v_total;
end;
$$;

revoke all on function public.fs_checkout_test(jsonb, text, uuid) from public;
grant execute on function public.fs_checkout_test(jsonb, text, uuid) to service_role;
