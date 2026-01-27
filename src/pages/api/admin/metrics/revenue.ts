import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../lib/database/supabaseServer';

export const prerender = false;

const json = (status: number, data: unknown) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

const getRangeDates = (range: string): { start: Date; end: Date } => {
	const now = new Date();
	const end = new Date(now);
	end.setHours(23, 59, 59, 999);

	let start: Date;

	switch (range) {
		case 'today':
			start = new Date(now);
			start.setHours(0, 0, 0, 0);
			break;
		case '7d':
			start = new Date(now);
			start.setDate(start.getDate() - 7);
			start.setHours(0, 0, 0, 0);
			break;
		case '30d':
			start = new Date(now);
			start.setDate(start.getDate() - 30);
			start.setHours(0, 0, 0, 0);
			break;
		case 'month':
			start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
			break;
		default:
			// Default to 7d
			start = new Date(now);
			start.setDate(start.getDate() - 7);
			start.setHours(0, 0, 0, 0);
	}

	return { start, end };
};

export const GET: APIRoute = async ({ url }) => {
	const adminSb = getSupabaseAdmin();
	if (!adminSb) {
		return json(500, { error: 'supabase_not_configured' });
	}

	const range = url.searchParams.get('range') ?? '7d';
	const { start, end } = getRangeDates(range);

	const startIso = start.toISOString();
	const endIso = end.toISOString();

	// Gross: sum total_cents of paid orders in range
	const { data: paidOrders, error: paidError } = await (adminSb as any)
		.from('fs_orders')
		.select('total_cents')
		.eq('status', 'paid')
		.gte('paid_at', startIso)
		.lte('paid_at', endIso);

	if (paidError) {
		console.error('[admin/metrics/revenue] paid orders error', paidError);
		return json(500, { error: 'paid_orders_load_failed' });
	}

	const grossPaidCents = (paidOrders ?? []).reduce(
		(sum: number, o: { total_cents: number }) => sum + (o.total_cents ?? 0),
		0
	);
	const countPaid = paidOrders?.length ?? 0;

	// Refunds: sum refund_total_cents of refunded returns in range
	const { data: refundedReturns, error: refundsError } = await (adminSb as any)
		.from('fs_returns')
		.select('refund_total_cents')
		.eq('status', 'refunded')
		.gte('refunded_at', startIso)
		.lte('refunded_at', endIso);

	if (refundsError) {
		console.error('[admin/metrics/revenue] refunds error', refundsError);
		return json(500, { error: 'refunds_load_failed' });
	}

	const refundsCents = (refundedReturns ?? []).reduce(
		(sum: number, r: { refund_total_cents: number }) => sum + (r.refund_total_cents ?? 0),
		0
	);

	// Net
	const netCents = grossPaidCents - refundsCents;

	// Pending orders count
	const { count: countPending, error: pendingError } = await (adminSb as any)
		.from('fs_orders')
		.select('id', { count: 'exact', head: true })
		.eq('status', 'pending');

	if (pendingError) {
		console.error('[admin/metrics/revenue] pending count error', pendingError);
	}

	return json(200, {
		range,
		start: startIso,
		end: endIso,
		gross_paid_cents: grossPaidCents,
		refunds_cents: refundsCents,
		net_cents: netCents,
		count_paid: countPaid,
		count_pending: countPending ?? 0,
	});
};
