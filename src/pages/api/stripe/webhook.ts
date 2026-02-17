import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { randomBytes } from 'node:crypto';
import { getEnv, logEnvStatus } from '../../../lib/env';

export const prerender = false;

const json = (status: number, data: unknown) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

const toErrorDetails = (err: unknown) => {
	if (!err) return err;
	if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack };
	return err;
};

export const POST: APIRoute = async ({ request }) => {
	console.info('[webhook] hit');

	try {
		const stripeSecretKey = getEnv('STRIPE_SECRET_KEY');
		const stripeWebhookSecret = getEnv('STRIPE_WEBHOOK_SECRET');
		const supabaseUrl = getEnv('SUPABASE_URL') ?? getEnv('PUBLIC_SUPABASE_URL');
		const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

		console.info('[webhook] env', logEnvStatus([
			'STRIPE_SECRET_KEY',
			'STRIPE_WEBHOOK_SECRET',
			'SUPABASE_URL',
			'PUBLIC_SUPABASE_URL',
			'SUPABASE_SERVICE_ROLE_KEY',
		]));

		if (!stripeSecretKey || !stripeWebhookSecret) {
			return json(500, { error: 'stripe_env_missing' });
		}

		const sig = request.headers.get('stripe-signature');
		if (!sig) {
			return json(400, { error: 'invalid_signature' });
		}

		const rawBody = await request.text();

		const stripe = new Stripe(stripeSecretKey);

		let event: Stripe.Event;
		try {
			event = stripe.webhooks.constructEvent(rawBody, sig, stripeWebhookSecret);
		} catch (err) {
			console.error('[webhook] signature verification failed', toErrorDetails(err));
			return json(400, { error: 'invalid_signature' });
		}

		const clientReferenceId = (event.data?.object as any)?.client_reference_id ?? null;
		const metadataOrderId = (event.data?.object as any)?.metadata?.order_id ?? null;
		console.info('[webhook] event', { type: event.type, client_reference_id: clientReferenceId, metadata_order_id: metadataOrderId });

		const allowedTypes = new Set([
			'checkout.session.completed',
			'checkout.session.expired',
			'payment_intent.succeeded',
			'payment_intent.payment_failed',
		]);
		if (!allowedTypes.has(event.type)) {
			return json(200, { ok: true, ignored: true, type: event.type });
		}

		if (!supabaseUrl || !serviceRoleKey) {
			return json(500, { error: 'supabase_env_missing' });
		}

		const adminSb = createClient(supabaseUrl, serviceRoleKey, {
			auth: { persistSession: false },
		});

		if (event.type === 'payment_intent.succeeded') {
			const pi = event.data.object as Stripe.PaymentIntent;
			const orderId = pi.metadata?.order_id ?? null;
			if (!orderId) {
				console.error('[webhook] payment_intent.succeeded missing metadata.order_id', { pi_id: pi.id });
				return json(200, { ok: true, missing_order_id: true });
			}

			const { data: finalizeRows, error: finalizeError } = await (adminSb as any).rpc(
				'fs_finalize_order_paid',
				{
					order_id: orderId,
					stripe_payment_intent_id: pi.id,
					customer_email: null,
					stripe_session_id: null,
				}
			);
			if (finalizeError) {
				console.error('[webhook] finalize paid error', finalizeError);
				return json(200, { ok: false, error: 'finalize_failed' });
			}

			const finalizeRow = Array.isArray(finalizeRows) ? finalizeRows[0] : finalizeRows;
			if (finalizeRow?.status === 'not_found') {
				console.info('[webhook] order not found (payment_intent.succeeded)', { order_id: orderId, pi_id: pi.id });
				return json(200, { ok: true, status: 'order_not_found' });
			}

			console.info('[webhook] order finalized (payment_intent.succeeded)', { order_id: orderId, status: finalizeRow?.status });

			// Invoice + Emails as in checkout.session.completed flow
			const stripeSessionId: string | undefined = undefined;
			const paymentIntentId: string | null = pi.id;

			// Invoice (no rompe el webhook si falla)
			try {
				const { data: invOrder, error: invOrderError } = await adminSb
					.from('fs_orders')
					.select('invoice_token,invoice_number,invoice_issued_at')
					.eq('id', orderId)
					.maybeSingle();

				if (invOrderError) {
					console.error('[webhook] load invoice fields error', invOrderError);
				} else if (invOrder) {
					const invUpdates: Record<string, unknown> = {};
					let nextInvoiceNumber: string | null = null;

					if (!invOrder.invoice_token) invUpdates.invoice_token = randomBytes(24).toString('hex');
					if (!invOrder.invoice_number) {
						const { data: invoiceNumber, error: invoiceNumberError } = await adminSb.rpc('fs_next_invoice_number');
						if (invoiceNumberError) console.error('[webhook] next invoice number error', invoiceNumberError);
						else if (invoiceNumber) {
							nextInvoiceNumber = invoiceNumber;
							invUpdates.invoice_number = invoiceNumber;
						}
					}
					if (!invOrder.invoice_issued_at) invUpdates.invoice_issued_at = new Date().toISOString();

					if (Object.keys(invUpdates).length > 0) {
						let q = adminSb.from('fs_orders').update(invUpdates).eq('id', orderId);
						if ('invoice_token' in invUpdates) q = q.is('invoice_token', null);
						if ('invoice_number' in invUpdates) q = q.is('invoice_number', null);
						if ('invoice_issued_at' in invUpdates) q = q.is('invoice_issued_at', null);
						const { error: invUpdError } = await q;
						if (invUpdError) console.error('[webhook] update invoice fields error', invUpdError);
						else if (nextInvoiceNumber) console.info('[webhook] invoice assigned', { order_id: orderId, invoice_number: nextInvoiceNumber });
					}
				}
			} catch (invErr) {
				console.error('[webhook] invoice error (non-fatal)', toErrorDetails(invErr));
			}

			// Emails (non-fatal)
			try {
				const { data: paidOrder } = await adminSb
					.from('fs_orders')
					.select(
						'id,status,paid_at,stripe_session_id,stripe_payment_intent_id,email,subtotal_cents,discount_cents,total_cents,invoice_token,invoice_number,invoice_issued_at,email_sent_at,email_last_error'
					)
					.eq('id', orderId)
					.maybeSingle();

				if (paidOrder?.email_sent_at) {
					console.info('[webhook] email already sent, skip', { order_id: orderId });
					return json(200, { ok: true, status: 'email_already_sent' });
				}

				const { data: items } = await adminSb
					.from('fs_order_items')
					.select('name,qty,size,price_cents,line_total_cents')
					.eq('order_id', orderId)
					.order('created_at', { ascending: true });

				if (paidOrder) {
					const { sendOrderPaidEmails } = await import('../../../lib/services/storeOrderEmail');
					console.info('[webhook] sendOrderPaidEmails', { order_id: orderId });
					await sendOrderPaidEmails(paidOrder, Array.isArray(items) ? items : [], stripeSessionId);
					await adminSb
						.from('fs_orders')
						.update({ email_sent_at: new Date().toISOString(), email_last_error: null })
						.eq('id', orderId);
				}
			} catch (emailErr) {
				const details = toErrorDetails(emailErr) as any;
				console.error('[webhook] email error (non-fatal)', details);
				await adminSb
					.from('fs_orders')
					.update({ email_last_error: String(details?.message ?? details ?? 'unknown') })
					.eq('id', orderId);
			}

			return json(200, { ok: true });
		}

		if (event.type === 'payment_intent.payment_failed') {
			const pi = event.data.object as Stripe.PaymentIntent;
			const orderId = pi.metadata?.order_id ?? null;
			console.error('[webhook] payment_intent.payment_failed', {
				pi_id: pi.id,
				order_id: orderId,
				error: (pi.last_payment_error as any)?.message ?? null,
			});
			if (orderId) {
				await adminSb
					.from('fs_orders')
					.update({ status: 'payment_failed', stripe_payment_intent_id: pi.id })
					.eq('id', orderId)
					.neq('status', 'paid');
			}
			return json(200, { ok: true });
		}

		if (event.type === 'checkout.session.completed') {
			const session = event.data.object as Stripe.Checkout.Session;
			const orderId = session.metadata?.order_id ?? session.client_reference_id;

			if (!orderId) {
				return json(400, { error: 'missing_client_reference_id' });
			}

			const stripeSessionId = session.id;
			const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;
			const paymentIntentId =
				typeof session.payment_intent === 'string'
					? session.payment_intent
					: session.payment_intent?.id ?? null;

			const { data: finalizeRows, error: finalizeError } = await (adminSb as any).rpc(
				'fs_finalize_order_paid',
				{
					order_id: orderId,
					stripe_payment_intent_id: paymentIntentId,
					customer_email: customerEmail,
					stripe_session_id: stripeSessionId,
				}
			);
			if (finalizeError) {
				console.error('[webhook] finalize paid error', finalizeError);
				return json(200, { ok: false, error: 'finalize_failed' });
			}
			const finalizeRow = Array.isArray(finalizeRows) ? finalizeRows[0] : finalizeRows;
			if (finalizeRow?.status === 'not_found') {
				console.info('[webhook] order not found (checkout.session.completed)', { order_id: orderId, stripe_session_id: stripeSessionId });
				return json(200, { ok: true, status: 'order_not_found' });
			}
			console.info('[webhook] order finalized (checkout.session.completed)', { order_id: orderId, status: finalizeRow?.status });

			// Invoice (no rompe el webhook si falla)
			try {
				const { data: invOrder, error: invOrderError } = await adminSb
					.from('fs_orders')
					.select('invoice_token,invoice_number,invoice_issued_at')
					.eq('id', orderId)
					.maybeSingle();

				if (invOrderError) {
					console.error('[webhook] load invoice fields error', invOrderError);
				} else if (invOrder) {
					const invUpdates: Record<string, unknown> = {};
					let nextInvoiceNumber: string | null = null;

					if (!invOrder.invoice_token) invUpdates.invoice_token = randomBytes(24).toString('hex');
					if (!invOrder.invoice_number) {
						const { data: invoiceNumber, error: invoiceNumberError } = await adminSb.rpc('fs_next_invoice_number');
						if (invoiceNumberError) console.error('[webhook] next invoice number error', invoiceNumberError);
						else if (invoiceNumber) {
							nextInvoiceNumber = invoiceNumber;
							invUpdates.invoice_number = invoiceNumber;
						}
					}
					if (!invOrder.invoice_issued_at) invUpdates.invoice_issued_at = new Date().toISOString();

					if (Object.keys(invUpdates).length > 0) {
						let q = adminSb.from('fs_orders').update(invUpdates).eq('id', orderId);
						if ('invoice_token' in invUpdates) q = q.is('invoice_token', null);
						if ('invoice_number' in invUpdates) q = q.is('invoice_number', null);
						if ('invoice_issued_at' in invUpdates) q = q.is('invoice_issued_at', null);
						const { error: invUpdError } = await q;
						if (invUpdError) console.error('[webhook] update invoice fields error', invUpdError);
						else if (nextInvoiceNumber) console.info('[webhook] invoice assigned', { order_id: orderId, invoice_number: nextInvoiceNumber });
					}
				}
			} catch (invErr) {
				console.error('[webhook] invoice error (non-fatal)', toErrorDetails(invErr));
			}

			// Emails (non-fatal)
			try {
				const { data: paidOrder } = await adminSb
					.from('fs_orders')
					.select(
						'id,status,paid_at,stripe_session_id,stripe_payment_intent_id,email,subtotal_cents,discount_cents,total_cents,invoice_token,invoice_number,invoice_issued_at,email_sent_at,email_last_error'
					)
					.eq('id', orderId)
					.maybeSingle();

				if (paidOrder?.email_sent_at) {
					console.info('[webhook] email already sent, skip', { order_id: orderId });
					return json(200, { ok: true, status: 'email_already_sent' });
				}

				const { data: items } = await adminSb
					.from('fs_order_items')
					.select('name,qty,size,price_cents,line_total_cents')
					.eq('order_id', orderId)
					.order('created_at', { ascending: true });

				if (paidOrder) {
					const { sendOrderPaidEmails } = await import('../../../lib/services/storeOrderEmail');
					console.info('[webhook] sendOrderPaidEmails', { order_id: orderId });
					await sendOrderPaidEmails(paidOrder, Array.isArray(items) ? items : [], stripeSessionId);
					await adminSb
						.from('fs_orders')
						.update({ email_sent_at: new Date().toISOString(), email_last_error: null })
						.eq('id', orderId);
				}
			} catch (emailErr) {
				const details = toErrorDetails(emailErr) as any;
				console.error('[webhook] email error (non-fatal)', details);
				await adminSb
					.from('fs_orders')
					.update({ email_last_error: String(details?.message ?? details ?? 'unknown') })
					.eq('id', orderId);
			}

			return json(200, { ok: true });
		}

		if (event.type === 'checkout.session.expired') {
			const session = event.data.object as Stripe.Checkout.Session;
			const orderId = session.client_reference_id;

			if (!orderId) {
				return json(400, { error: 'missing_client_reference_id' });
			}

			const { data: existingOrder, error: existingError } = await adminSb
				.from('fs_orders')
				.select('id,status')
				.eq('id', orderId)
				.maybeSingle();

			if (existingError) {
				console.error('[webhook] load order error', existingError);
				return json(500, { error: 'load_order_failed', details: existingError.message });
			}
			if (!existingOrder?.id) {
				console.info('[webhook] order not found (checkout.session.expired)', { order_id: orderId });
				return json(200, { ok: true, status: 'order_not_found' });
			}

			if (existingOrder.status === 'paid') {
				return json(200, { ok: true, status: 'already_paid' });
			}

			const { error: updError } = await adminSb
				.from('fs_orders')
				.update({ status: 'cancelled' })
				.eq('id', orderId);

			if (updError) {
				console.error('[webhook] update order error', updError);
				return json(500, { error: 'update_order_failed', details: updError.message });
			}

			console.info('[webhook] order cancelled', { order_id: orderId });
			return json(200, { ok: true });
		}

		return json(200, { ok: true });
	} catch (err) {
		console.error('[webhook] fatal', (err as any)?.stack || err);
		return json(500, { error: 'webhook_fatal', details: toErrorDetails(err) });
	}
};