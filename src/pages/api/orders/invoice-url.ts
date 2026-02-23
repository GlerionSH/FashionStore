import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { getEnv } from '../../../lib/env';

export const prerender = false;

const json = (status: number, data: unknown) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

/**
 * GET /api/orders/invoice-url?session_id=<stripe_session_id>
 *
 * Returns the invoice PDF URL for a completed Stripe session.
 * Auth strategy:
 *   - Logged-in users: ownership checked via user_id (or email fallback for guest orders).
 *   - Guests: no auth cookie required. The session_id itself proves purchase intent,
 *     and the returned URL is protected by the cryptographic invoice_token.
 */
export const GET: APIRoute = async ({ request, cookies }) => {
	const sessionId = new URL(request.url).searchParams.get('session_id');
	console.info('[invoice-url] session_id present:', Boolean(sessionId));

	if (!sessionId) {
		return json(400, { error: 'missing_session_id' });
	}

	const supabaseUrl = getEnv('PUBLIC_SUPABASE_URL');
	const anonKey = getEnv('PUBLIC_SUPABASE_ANON_KEY');
	const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
	const stripeSecretKey = getEnv('STRIPE_SECRET_KEY');
	const publicSiteUrl = getEnv('PUBLIC_SITE_URL');

	if (!supabaseUrl || !anonKey || !serviceRoleKey) {
		console.info('[invoice-url] supabase env missing');
		return json(500, { error: 'supabase_env_missing' });
	}
	if (!stripeSecretKey) {
		console.info('[invoice-url] stripe env missing');
		return json(500, { error: 'stripe_env_missing' });
	}

	// ── Optional: resolve logged-in user (non-blocking for guests) ────────────
	let userId: string | null = null;
	let userEmail: string | null = null;

	const accessToken = cookies.get('sb-access-token')?.value;
	if (accessToken) {
		try {
			const authSb = createClient(supabaseUrl, anonKey, {
				auth: { persistSession: false, autoRefreshToken: false },
				global: { headers: { Authorization: `Bearer ${accessToken}` } },
			});
			const { data: userData } = await authSb.auth.getUser();
			userId = userData?.user?.id ?? null;
			userEmail = userData?.user?.email ?? null;
		} catch {
			// non-blocking — treat as guest
		}
	}

	// ── Look up order via Stripe session ──────────────────────────────────────
	const stripe = new Stripe(stripeSecretKey);

	let stripeSession: Stripe.Checkout.Session;
	try {
		stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
	} catch (err) {
		console.info('[invoice-url] stripe session retrieve error:', (err as Error).message);
		return json(404, { error: 'invoice_not_ready' });
	}

	const orderId = stripeSession.metadata?.order_id ?? stripeSession.client_reference_id;
	console.info('[invoice-url] orderId:', orderId ? orderId.slice(0, 8) + '...' : null);

	if (!orderId) {
		console.info('[invoice-url] no orderId -> invoice_not_ready');
		return json(404, { error: 'invoice_not_ready' });
	}

	const adminSb = createClient(supabaseUrl, serviceRoleKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});

	const { data: order, error: orderError } = await adminSb
		.from('fs_orders')
		.select('id,user_id,email,status,invoice_token,invoice_number')
		.eq('id', orderId)
		.maybeSingle();

	if (orderError) {
		console.info('[invoice-url] db error:', orderError.message);
		return json(500, { error: 'db_error' });
	}
	if (!order?.id) {
		console.info('[invoice-url] order not found -> invoice_not_ready');
		return json(404, { error: 'invoice_not_ready' });
	}

	// ── Ownership check (only for logged-in users; guests pass via session_id) ─
	if (userId) {
		if (order.user_id) {
			if (order.user_id !== userId) {
				console.info('[invoice-url] user_id mismatch -> 403');
				return json(403, { error: 'forbidden' });
			}
		} else {
			// Guest order: match by email
			const normalizedUserEmail = userEmail?.trim().toLowerCase() ?? null;
			const normalizedOrderEmail = order.email?.trim().toLowerCase() ?? null;
			if (normalizedUserEmail && normalizedOrderEmail && normalizedUserEmail !== normalizedOrderEmail) {
				console.info('[invoice-url] email mismatch -> 403');
				return json(403, { error: 'forbidden' });
			}
		}
	}
	// Guest (no userId): the Stripe session_id is sufficient proof of purchase.

	// ── Invoice readiness ──────────────────────────────────────────────────────
	console.info('[invoice-url] invoice ready:', Boolean(order.invoice_token && order.invoice_number));

	if (!order.invoice_token || !order.invoice_number) {
		return json(404, { error: 'invoice_not_ready' });
	}

	if (!publicSiteUrl) {
		console.info('[invoice-url] PUBLIC_SITE_URL missing');
		return json(500, { error: 'public_site_url_missing' });
	}

	const base = publicSiteUrl.replace(/\/+$/, '');
	const invoiceUrl = `${base}/api/orders/${encodeURIComponent(order.id)}/invoice.pdf?token=${encodeURIComponent(order.invoice_token)}`;

	return json(200, { invoiceUrl });
};
