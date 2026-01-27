import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../../../lib/env';
import { sendReturnRequestedEmail } from '../../../lib/services/returnEmail';

export const prerender = false;

const json = (status: number, data: unknown) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

export const POST: APIRoute = async ({ request, cookies }) => {
	const supabaseUrl = getEnv('PUBLIC_SUPABASE_URL');
	const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
	const anonKey = getEnv('PUBLIC_SUPABASE_ANON_KEY');

	if (!supabaseUrl || !serviceRoleKey || !anonKey) {
		return json(500, { error: 'supabase_not_configured' });
	}

	const token = cookies.get('sb-access-token')?.value;
	if (!token) {
		return json(401, { error: 'unauthorized' });
	}

	// Get user from token
	const userSb = createClient(supabaseUrl, anonKey, {
		auth: { persistSession: false, autoRefreshToken: false },
		global: { headers: { Authorization: `Bearer ${token}` } },
	});

	const { data: userData } = await userSb.auth.getUser();
	const user = userData?.user;

	if (!user) {
		return json(401, { error: 'unauthorized' });
	}

	// Parse body
	let body: { orderId?: string; reason?: string; items?: { orderItemId: string; qty: number }[] };
	try {
		body = await request.json();
	} catch {
		return json(400, { error: 'invalid_json' });
	}

	const { orderId, reason, items } = body;

	if (!orderId || typeof orderId !== 'string') {
		return json(400, { error: 'orderId_required' });
	}

	if (!items || !Array.isArray(items) || items.length === 0) {
		return json(400, { error: 'items_required' });
	}

	// Validate items structure
	for (const item of items) {
		if (!item.orderItemId || typeof item.orderItemId !== 'string') {
			return json(400, { error: 'invalid_item_orderItemId' });
		}
		if (!item.qty || typeof item.qty !== 'number' || item.qty <= 0 || !Number.isInteger(item.qty)) {
			return json(400, { error: 'invalid_item_qty' });
		}
	}

	// Use admin client for operations
	const adminSb = createClient(supabaseUrl, serviceRoleKey, {
		auth: { persistSession: false },
	});

	// 1. Verify order exists, belongs to user, and is paid
	const { data: order, error: orderError } = await adminSb
		.from('fs_orders')
		.select('id,status,user_id,email')
		.eq('id', orderId)
		.maybeSingle();

	if (orderError) {
		console.error('[returns/request] order error', orderError);
		return json(500, { error: 'order_load_failed' });
	}

	if (!order) {
		return json(404, { error: 'order_not_found' });
	}

	if (order.user_id !== user.id) {
		return json(403, { error: 'order_not_yours' });
	}

	if (order.status !== 'paid') {
		return json(400, { error: 'order_not_paid', message: 'Solo puedes devolver pedidos pagados' });
	}

	// 2. Load order items
	const { data: orderItems, error: itemsError } = await adminSb
		.from('fs_order_items')
		.select('id,qty,price_cents,line_total_cents,name,size')
		.eq('order_id', orderId);

	if (itemsError) {
		console.error('[returns/request] items error', itemsError);
		return json(500, { error: 'items_load_failed' });
	}

	const orderItemsMap = new Map(orderItems?.map((oi) => [oi.id, oi]) ?? []);

	// 3. Load existing returns for this order to check already returned quantities
	const { data: existingReturns, error: existingError } = await adminSb
		.from('fs_returns')
		.select('id,status,fs_return_items(order_item_id,qty)')
		.eq('order_id', orderId)
		.in('status', ['requested', 'approved', 'refunded']);

	if (existingError) {
		console.error('[returns/request] existing returns error', existingError);
		return json(500, { error: 'existing_returns_load_failed' });
	}

	// Calculate already returned qty per order_item_id
	const returnedQtyMap = new Map<string, number>();
	for (const ret of existingReturns ?? []) {
		const retItems = (ret as any).fs_return_items ?? [];
		for (const ri of retItems) {
			const prev = returnedQtyMap.get(ri.order_item_id) ?? 0;
			returnedQtyMap.set(ri.order_item_id, prev + ri.qty);
		}
	}

	// 4. Validate requested items
	const returnItemsToInsert: { order_item_id: string; qty: number; line_total_cents: number }[] = [];

	for (const reqItem of items) {
		const orderItem = orderItemsMap.get(reqItem.orderItemId);
		if (!orderItem) {
			return json(400, { error: 'item_not_in_order', orderItemId: reqItem.orderItemId });
		}

		const alreadyReturned = returnedQtyMap.get(reqItem.orderItemId) ?? 0;
		const available = orderItem.qty - alreadyReturned;

		if (reqItem.qty > available) {
			return json(400, {
				error: 'qty_exceeds_available',
				orderItemId: reqItem.orderItemId,
				requested: reqItem.qty,
				available,
			});
		}

		// Calculate proportional refund (line_total / qty * requested_qty)
		const unitPrice = Math.floor(orderItem.line_total_cents / orderItem.qty);
		const lineTotalCents = unitPrice * reqItem.qty;

		returnItemsToInsert.push({
			order_item_id: reqItem.orderItemId,
			qty: reqItem.qty,
			line_total_cents: lineTotalCents,
		});
	}

	// 5. Create return record
	const { data: newReturn, error: insertError } = await adminSb
		.from('fs_returns')
		.insert({
			order_id: orderId,
			user_id: user.id,
			status: 'requested',
			reason: reason?.trim() || null,
			requested_at: new Date().toISOString(),
		})
		.select('id')
		.single();

	if (insertError || !newReturn) {
		console.error('[returns/request] insert return error', insertError);
		return json(500, { error: 'return_insert_failed' });
	}

	// 6. Insert return items
	const itemsWithReturnId = returnItemsToInsert.map((ri) => ({
		...ri,
		return_id: newReturn.id,
	}));

	const { error: insertItemsError } = await adminSb
		.from('fs_return_items')
		.insert(itemsWithReturnId);

	if (insertItemsError) {
		console.error('[returns/request] insert return items error', insertItemsError);
		// Try to clean up
		await adminSb.from('fs_returns').delete().eq('id', newReturn.id);
		return json(500, { error: 'return_items_insert_failed' });
	}

	console.info('[returns/request] created', { returnId: newReturn.id, orderId, userId: user.id });

	// Send email (non-fatal). If migration 013_return_email_flags.sql is applied, we also set email_sent_requested_at.
	try {
		const to = order.email;
		if (to) {
			const itemsForEmail = returnItemsToInsert.map((ri) => {
				const oi: any = orderItemsMap.get(ri.order_item_id);
				return {
					name: oi?.name ?? 'Producto',
					size: oi?.size ?? null,
					qty: ri.qty,
					line_total_cents: ri.line_total_cents,
				};
			});

			await sendReturnRequestedEmail({
				to,
				ret: {
					id: newReturn.id,
					order_id: orderId,
					status: 'requested',
					reason: reason?.trim() || null,
					requested_at: new Date().toISOString(),
				},
				items: itemsForEmail,
				order: { id: orderId, email: to },
			});

			const { error: flagError } = await adminSb
				.from('fs_returns')
				.update({ email_sent_requested_at: new Date().toISOString() })
				.eq('id', newReturn.id);

			if (flagError) {
				// Non-fatal; will happen if migration not applied.
				console.error('[returns/request] email flag update error (non-fatal)', flagError);
			}
		}
	} catch (emailErr) {
		console.error('[returns/request] email error (non-fatal)', emailErr);
	}

	return json(200, {
		ok: true,
		returnId: newReturn.id,
		status: 'requested',
	});
};
