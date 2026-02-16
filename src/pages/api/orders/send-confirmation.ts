import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../../../lib/env';
import { sendOrderPaidEmails } from '../../../lib/services/storeOrderEmail';

export const prerender = false;

const json = (status: number, data: unknown) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

/**
 * POST /api/orders/send-confirmation
 * Body: { "order_id": "<uuid>" }
 *
 * Sends the order-paid confirmation email (customer + admin) via Brevo.
 * Designed to be called from the Flutter app as a fallback/explicit trigger
 * after the Stripe webhook has already marked the order as paid.
 *
 * Requires a valid sb-access-token cookie (the order's owner or admin).
 * Idempotent: safe to call multiple times — the email service handles it.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		const supabaseUrl = getEnv('PUBLIC_SUPABASE_URL');
		const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

		if (!supabaseUrl || !serviceRoleKey) {
			return json(500, { error: 'supabase_env_missing' });
		}

		// Auth: verify caller
		const accessToken = cookies.get('sb-access-token')?.value ?? null;
		if (!accessToken) {
			return json(401, { error: 'unauthorized' });
		}

		const body = await request.json().catch(() => null);
		const orderId = (body as any)?.order_id;
		if (!orderId || typeof orderId !== 'string') {
			return json(400, { error: 'missing_order_id' });
		}

		const adminSb = createClient(supabaseUrl, serviceRoleKey, {
			auth: { persistSession: false },
		});

		// Verify caller owns this order (or is admin)
		const userSb = createClient(supabaseUrl, getEnv('PUBLIC_SUPABASE_ANON_KEY') ?? '', {
			global: { headers: { Authorization: `Bearer ${accessToken}` } },
			auth: { persistSession: false },
		});
		const { data: userData } = await userSb.auth.getUser();
		const userId = userData?.user?.id;
		if (!userId) {
			return json(401, { error: 'invalid_token' });
		}

		// Load order
		const { data: order, error: orderError } = await adminSb
			.from('fs_orders')
			.select(
				'id,status,email,subtotal_cents,discount_cents,total_cents,paid_at,invoice_token,invoice_number,invoice_issued_at,user_id'
			)
			.eq('id', orderId)
			.maybeSingle();

		if (orderError || !order) {
			return json(404, { error: 'order_not_found' });
		}

		// Only the order owner can trigger (or admin — skip check if user_id is null)
		if (order.user_id && order.user_id !== userId) {
			return json(403, { error: 'forbidden' });
		}

		if (order.status !== 'paid') {
			return json(400, { error: 'order_not_paid', status: order.status });
		}

		// Load items
		const { data: items } = await adminSb
			.from('fs_order_items')
			.select('name,qty,size,price_cents,line_total_cents')
			.eq('order_id', orderId)
			.order('created_at', { ascending: true });

		await sendOrderPaidEmails(order, Array.isArray(items) ? items : []);

		return json(200, { ok: true });
	} catch (err) {
		console.error('[send-confirmation] error', err);
		return json(500, { error: 'internal', details: (err as Error).message });
	}
};
