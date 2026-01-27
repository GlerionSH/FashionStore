import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../../lib/database/supabaseServer';
import { getEnv } from '../../../../../lib/env';

export const prerender = false;

const json = (status: number, data: unknown) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

export const POST: APIRoute = async ({ params }) => {
	const adminSb = getSupabaseAdmin();
	if (!adminSb) {
		return json(500, { error: 'supabase_not_configured' });
	}

	const returnId = params.returnId;
	if (!returnId) {
		return json(400, { error: 'returnId_required' });
	}

	// Load return with order info
	const { data: ret, error: loadError } = await (adminSb as any)
		.from('fs_returns')
		.select('id,status,order_id,refund_total_cents,fs_orders(stripe_payment_intent_id)')
		.eq('id', returnId)
		.maybeSingle();

	if (loadError) {
		console.error('[admin/returns/refund] load error', loadError);
		return json(500, { error: 'return_load_failed' });
	}

	if (!ret) {
		return json(404, { error: 'return_not_found' });
	}

	// Idempotency: already refunded
	if (ret.status === 'refunded') {
		return json(200, { ok: true, status: 'refunded', message: 'already_refunded' });
	}

	if (ret.status !== 'approved') {
		return json(400, { error: 'return_not_approved', current_status: ret.status });
	}

	const amountCents = ret.refund_total_cents;
	if (!amountCents || amountCents <= 0) {
		return json(400, { error: 'no_refund_amount' });
	}

	const stripeSecretKey = getEnv('STRIPE_SECRET_KEY');
	const paymentIntentId = ret.fs_orders?.stripe_payment_intent_id;

	let refundMethod = 'manual';
	let stripeRefundId: string | null = null;

	// Try Stripe refund if configured and payment_intent available
	if (stripeSecretKey && paymentIntentId) {
		try {
			const Stripe = (await import('stripe')).default;
			const stripe = new Stripe(stripeSecretKey);

			const refund = await stripe.refunds.create({
				payment_intent: paymentIntentId,
				amount: amountCents,
			});

			if (refund.id) {
				refundMethod = 'stripe';
				stripeRefundId = refund.id;
				console.info('[admin/returns/refund] stripe refund created', { returnId, refundId: refund.id });
			}
		} catch (stripeErr) {
			console.error('[admin/returns/refund] stripe error', stripeErr);
			// Fall back to manual
			refundMethod = 'manual';
		}
	}

	// Update return to refunded
	const { error: updateError } = await (adminSb as any)
		.from('fs_returns')
		.update({
			status: 'refunded',
			refunded_at: new Date().toISOString(),
			refund_method: refundMethod,
			stripe_refund_id: stripeRefundId,
		})
		.eq('id', returnId);

	if (updateError) {
		console.error('[admin/returns/refund] update error', updateError);
		return json(500, { error: 'return_update_failed' });
	}

	// The trigger will recalculate refund_total_cents on fs_orders

	console.info('[admin/returns/refund] completed', { returnId, refundMethod, amountCents });

	return json(200, {
		ok: true,
		status: 'refunded',
		refund_method: refundMethod,
		stripe_refund_id: stripeRefundId,
		amount_cents: amountCents,
	});
};
