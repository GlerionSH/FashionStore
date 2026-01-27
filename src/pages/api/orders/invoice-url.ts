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

	const accessToken = cookies.get('sb-access-token')?.value;
	if (!accessToken) {
		console.info('[invoice-url] no access token -> 401');
		return json(401, { error: 'unauthorized' });
	}

	const authSb = createClient(supabaseUrl, anonKey, {
		auth: { persistSession: false, autoRefreshToken: false },
		global: { headers: { Authorization: `Bearer ${accessToken}` } },
	});

	const { data: userData, error: userError } = await authSb.auth.getUser();
	if (userError || !userData.user) {
		console.info('[invoice-url] invalid user token -> 401');
		return json(401, { error: 'unauthorized' });
	}

	const stripe = new Stripe(stripeSecretKey);

	let stripeSession: Stripe.Checkout.Session;
	try {
		stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
	} catch (err) {
		console.info('[invoice-url] stripe session retrieve error:', (err as Error).message);
		return json(404, { error: 'invoice_not_ready' });
	}

	const orderId = stripeSession.client_reference_id;
	console.info('[invoice-url] stripe client_reference_id:', orderId ? orderId.slice(0, 8) + '...' : null);

	if (!orderId) {
		console.info('[invoice-url] no client_reference_id -> invoice_not_ready');
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

	const userId = userData.user.id;
	const userEmail = userData.user.email ?? null;

	if (order.user_id) {
		if (order.user_id !== userId) {
			console.info('[invoice-url] user_id mismatch -> 403');
			return json(403, { error: 'forbidden' });
		}
	} else {
		const normalizedUserEmail = userEmail?.trim().toLowerCase() ?? null;
		const normalizedOrderEmail = order.email?.trim().toLowerCase() ?? null;
		if (!normalizedUserEmail || !normalizedOrderEmail || normalizedUserEmail !== normalizedOrderEmail) {
			console.info('[invoice-url] email mismatch -> 403');
			return json(403, { error: 'forbidden' });
		}
	}

	const invoiceReady = Boolean(order.invoice_token && order.invoice_number);
	console.info('[invoice-url] invoice ready:', invoiceReady);

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
