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
		const supabaseUrl = getEnv('PUBLIC_SUPABASE_URL');
		const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

		console.info('[webhook] env', logEnvStatus([
			'STRIPE_SECRET_KEY',
			'STRIPE_WEBHOOK_SECRET',
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
		console.info('[webhook] event', { type: event.type, client_reference_id: clientReferenceId });

		if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.expired') {
			return json(200, { ok: true, ignored: true, type: event.type });
		}

		if (!supabaseUrl || !serviceRoleKey) {
			return json(500, { error: 'supabase_env_missing' });
		}

		const adminSb = createClient(supabaseUrl, serviceRoleKey, {
			auth: { persistSession: false },
		});

		if (event.type === 'checkout.session.completed') {
			const session = event.data.object as Stripe.Checkout.Session;
			const orderId = session.client_reference_id;

			if (!orderId) {
				return json(400, { error: 'missing_client_reference_id' });
			}

			const stripeSessionId = session.id;
			const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;
			const paymentIntentId =
				typeof session.payment_intent === 'string'
					? session.payment_intent
					: session.payment_intent?.id ?? null;

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
				return json(404, { error: 'order_not_found', order_id: orderId });
			}
			if (existingOrder.status === 'paid') {
				// Asegura que la factura existe incluso si llega un retry del webhook
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

						if (!invOrder.invoice_token) {
							invUpdates.invoice_token = randomBytes(24).toString('hex');
						}

						if (!invOrder.invoice_number) {
							const { data: invoiceNumber, error: invoiceNumberError } = await adminSb.rpc(
								'fs_next_invoice_number'
							);
							if (invoiceNumberError) {
								console.error('[webhook] next invoice number error', invoiceNumberError);
							} else if (invoiceNumber) {
								nextInvoiceNumber = invoiceNumber;
								invUpdates.invoice_number = invoiceNumber;
							}
						}

						if (!invOrder.invoice_issued_at) {
							invUpdates.invoice_issued_at = new Date().toISOString();
						}

						if (Object.keys(invUpdates).length > 0) {
							let q = adminSb.from('fs_orders').update(invUpdates).eq('id', orderId);
							if ('invoice_token' in invUpdates) q = q.is('invoice_token', null);
							if ('invoice_number' in invUpdates) q = q.is('invoice_number', null);
							if ('invoice_issued_at' in invUpdates) q = q.is('invoice_issued_at', null);

							const { error: invUpdError } = await q;
							if (invUpdError) {
								console.error('[webhook] update invoice fields error', invUpdError);
							} else if (nextInvoiceNumber) {
								console.info('[webhook] invoice assigned', { order_id: orderId, invoice_number: nextInvoiceNumber });
							}
						}
					}
				} catch (invErr) {
					console.error('[webhook] invoice error (non-fatal)', toErrorDetails(invErr));
				}

				return json(200, { ok: true, status: 'already_paid' });
			}

			const updateData: Record<string, unknown> = {
				status: 'paid',
				stripe_session_id: stripeSessionId,
				stripe_payment_intent_id: paymentIntentId,
				paid_at: new Date().toISOString(),
			};
			if (customerEmail) updateData.email = customerEmail;

			const { error: updError } = await adminSb
				.from('fs_orders')
				.update(updateData)
				.eq('id', orderId);

			if (updError) {
				console.error('[webhook] update order error', updError);
				return json(500, { error: 'update_order_failed', details: updError.message });
			}

			console.info('[webhook] order marked paid', { order_id: orderId });

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

					if (!invOrder.invoice_token) {
						invUpdates.invoice_token = randomBytes(24).toString('hex');
					}

					if (!invOrder.invoice_number) {
						const { data: invoiceNumber, error: invoiceNumberError } = await adminSb.rpc(
							'fs_next_invoice_number'
						);
						if (invoiceNumberError) {
							console.error('[webhook] next invoice number error', invoiceNumberError);
						} else if (invoiceNumber) {
							nextInvoiceNumber = invoiceNumber;
							invUpdates.invoice_number = invoiceNumber;
						}
					}

					if (!invOrder.invoice_issued_at) {
						invUpdates.invoice_issued_at = new Date().toISOString();
					}

					if (Object.keys(invUpdates).length > 0) {
						let q = adminSb.from('fs_orders').update(invUpdates).eq('id', orderId);
						if ('invoice_token' in invUpdates) q = q.is('invoice_token', null);
						if ('invoice_number' in invUpdates) q = q.is('invoice_number', null);
						if ('invoice_issued_at' in invUpdates) q = q.is('invoice_issued_at', null);

						const { error: invUpdError } = await q;
						if (invUpdError) {
							console.error('[webhook] update invoice fields error', invUpdError);
						} else if (nextInvoiceNumber) {
							console.info('[webhook] invoice assigned', { order_id: orderId, invoice_number: nextInvoiceNumber });
						}
					}
				}
			} catch (invErr) {
				console.error('[webhook] invoice error (non-fatal)', toErrorDetails(invErr));
			}

			// Emails (opcional, no rompe el webhook si falla)
			try {
				const { data: paidOrder } = await adminSb
					.from('fs_orders')
					.select(
						'id,status,paid_at,stripe_session_id,email,subtotal_cents,discount_cents,total_cents,invoice_token,invoice_number,invoice_issued_at'
					)
					.eq('id', orderId)
					.maybeSingle();

				const { data: items } = await adminSb
					.from('fs_order_items')
					.select('name,qty,size,price_cents,line_total_cents')
					.eq('order_id', orderId)
					.order('created_at', { ascending: true });

				if (paidOrder) {
					const { sendOrderPaidEmails } = await import('../../../lib/services/storeOrderEmail');
					console.info('[webhook] sendOrderPaidEmails', { order_id: orderId });
					await sendOrderPaidEmails(paidOrder, Array.isArray(items) ? items : [], stripeSessionId);
				}
			} catch (emailErr) {
				console.error('[webhook] email error (non-fatal)', toErrorDetails(emailErr));
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
				return json(404, { error: 'order_not_found', order_id: orderId });
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