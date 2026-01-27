import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../lib/database/supabaseServer';

export const prerender = false;

const json = (status: number, data: unknown) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

export const GET: APIRoute = async ({ url }) => {
	const adminSb = getSupabaseAdmin();
	if (!adminSb) {
		return json(500, { error: 'supabase_not_configured' });
	}

	const status = url.searchParams.get('status') ?? null;
	const limitParam = url.searchParams.get('limit');
	const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 100) : 50;

	let query = (adminSb as any)
		.from('fs_returns')
		.select(`
			id,
			order_id,
			user_id,
			status,
			reason,
			requested_at,
			reviewed_at,
			reviewed_by,
			refunded_at,
			refund_method,
			refund_total_cents,
			currency,
			stripe_refund_id,
			notes,
			fs_orders!inner(id,email,total_cents,paid_at,stripe_payment_intent_id),
			fs_return_items(
				id,
				order_item_id,
				qty,
				line_total_cents,
				fs_order_items(id,product_id,qty,price_cents,line_total_cents,paid_unit_cents,paid_line_total_cents,size,name)
			)
		`)
		.order('requested_at', { ascending: false })
		.limit(limit);

	if (status) {
		query = query.eq('status', status);
	}

	const { data: returns, error: returnsError } = await query;

	if (returnsError) {
		console.error('[admin/returns] error', returnsError);
		return json(500, { error: 'returns_load_failed', details: returnsError.message });
	}

	return json(200, { returns: returns ?? [] });
};
