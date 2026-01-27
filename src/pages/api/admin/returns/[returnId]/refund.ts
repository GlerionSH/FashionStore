import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../../lib/database/supabaseServer';
import { getEnv } from '../../../../../lib/env';
import { sendReturnRefundedEmail } from '../../../../../lib/services/returnEmail';

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

	const { data: ret, error: loadError } = await (adminSb as any)
		.from('fs_returns')
		.select(
			'id,status,order_id,refund_total_cents,fs_orders(email,stripe_payment_intent_id),fs_return_items(id,order_item_id,qty,line_total_cents,fs_order_items(qty,paid_unit_cents,paid_line_total_cents,line_total_cents))'
		)
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

	const items: any[] = Array.isArray((ret as any).fs_return_items) ? (ret as any).fs_return_items : [];
	let amountCents = 0;
	const updates: { id: string; line_total_cents: number }[] = [];

	for (const ri of items) {
		const oi = ri?.fs_order_items;
		const orderQty = Number(oi?.qty ?? 0);
		const returnQty = Number(ri?.qty ?? 0);
		if (!ri?.id || returnQty <= 0) continue;

		let line = 0;
		const paidLine = oi?.paid_line_total_cents;
		const paidUnit = oi?.paid_unit_cents;
		const baseLine = oi?.line_total_cents;

		if (Number.isFinite(paidLine) && orderQty > 0) {
			line = Math.round((Number(paidLine) * returnQty) / orderQty);
		} else if (Number.isFinite(paidUnit)) {
			line = Math.round(Number(paidUnit) * returnQty);
		} else if (Number.isFinite(baseLine) && orderQty > 0) {
			line = Math.floor(Number(baseLine) / orderQty) * returnQty;
		}

		amountCents += Math.max(0, Math.trunc(line));
		if (Number.isFinite(line) && Number(ri.line_total_cents) !== Math.trunc(line)) {
			updates.push({ id: ri.id, line_total_cents: Math.max(0, Math.trunc(line)) });
		}
	}

	if (!amountCents || amountCents <= 0) {
		return json(400, { error: 'no_refund_amount' });
	}

	for (const u of updates) {
		await (adminSb as any).from('fs_return_items').update({ line_total_cents: u.line_total_cents }).eq('id', u.id);
	}

	await (adminSb as any)
		.from('fs_returns')
		.update({ refund_total_cents: amountCents })
		.eq('id', returnId);

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
			refund_total_cents: amountCents,
		})
		.eq('id', returnId);

	if (updateError) {
		console.error('[admin/returns/refund] update error', updateError);
		return json(500, { error: 'return_update_failed' });
	}

	// The trigger will recalculate refund_total_cents on fs_orders

	// Send email (non-fatal). If migration 013_return_email_flags.sql is applied, we also set email_sent_refunded_at.
	try {
		const to = ret.fs_orders?.email ?? null;
		if (to) {
			await sendReturnRefundedEmail({
				to,
				ret: {
					id: ret.id,
					order_id: ret.order_id,
					status: 'refunded',
					refund_total_cents: amountCents,
					refund_method: refundMethod,
				},
				order: { id: ret.order_id, email: to },
				amount_cents: amountCents,
				method: refundMethod as any,
			});

			const { error: flagError } = await (adminSb as any)
				.from('fs_returns')
				.update({ email_sent_refunded_at: new Date().toISOString() })
				.eq('id', returnId);

			if (flagError) {
				// Non-fatal; will happen if migration not applied.
				console.error('[admin/returns/refund] email flag update error (non-fatal)', flagError);
			}
		}
	} catch (emailErr) {
		console.error('[admin/returns/refund] email error (non-fatal)', emailErr);
	}

	console.info('[admin/returns/refund] completed', { returnId, refundMethod, amountCents });

	return json(200, {
		ok: true,
		status: 'refunded',
		refund_method: refundMethod,
		stripe_refund_id: stripeRefundId,
		amount_cents: amountCents,
	});
};
