import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const prerender = false;

type CheckoutItem = {
	product_id: string;
	qty: number;
	size?: string;
};

type CheckoutBody = {
	email?: string;
	items: CheckoutItem[];
};

type RpcResultRow = {
	order_id: string;
	subtotal_cents: number;
	discount_cents: number;
	total_cents: number;
};

type OrderItemRow = {
	id: string;
	order_id: string;
	product_id: string;
	name: string;
	qty: number;
	price_cents: number;
	line_total_cents: number;
	size?: string | null;
	created_at: string;
};

const json = (status: number, data: unknown) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

const jsonError = (status: number, error: string, details?: unknown) =>
	json(status, details === undefined ? { error } : { error, details });

const toErrorDetails = (err: unknown) => {
	if (!err) return err;
	if (err instanceof Error) {
		return {
			name: err.name,
			message: err.message,
		};
	}
	return err;
};

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		const contentType = request.headers.get('content-type') || '';
		if (!contentType.includes('application/json')) {
			return jsonError(400, 'Content-Type debe ser application/json');
		}

		let body: CheckoutBody;
		try {
			body = (await request.json()) as CheckoutBody;
		} catch (err) {
			return jsonError(400, 'Invalid JSON body', toErrorDetails(err));
		}

		const email = typeof body.email === 'string' ? body.email.trim() : undefined;
		const items = Array.isArray(body.items) ? body.items : [];

		if (items.length === 0) {
			return jsonError(400, 'items no puede estar vacío');
		}

		for (const item of items) {
			if (!item || typeof item.product_id !== 'string' || !item.product_id) {
				return jsonError(400, 'product_id inválido');
			}
			if (
				typeof item.qty !== 'number' ||
				!Number.isFinite(item.qty) ||
				item.qty <= 0 ||
				!Number.isInteger(item.qty)
			) {
				return jsonError(400, 'qty debe ser > 0');
			}
		}

		const itemsByKey = new Map<string, CheckoutItem>();
		for (const item of items) {
			const key = item.size ? `${item.product_id}__${item.size}` : item.product_id;
			const existing = itemsByKey.get(key);
			if (existing) {
				existing.qty += item.qty;
			} else {
				itemsByKey.set(key, { product_id: item.product_id, qty: item.qty, size: item.size });
			}
		}
		const normalizedItems: CheckoutItem[] = Array.from(itemsByKey.values());

		const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
		const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
		const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
		const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
		const publicSiteUrl = import.meta.env.PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL;

		console.log('[stripe env check]', {
			hasStripe: Boolean(stripeSecretKey),
			hasSiteUrl: Boolean(publicSiteUrl),
		});

		if (!supabaseUrl) {
			return jsonError(500, 'Supabase no está configurado');
		}
		if (!anonKey) {
			return jsonError(500, 'Falta PUBLIC_SUPABASE_ANON_KEY');
		}
		if (!serviceRoleKey) {
			return jsonError(500, 'Falta SUPABASE_SERVICE_ROLE_KEY en el backend.');
		}
		if (!stripeSecretKey) {
			return jsonError(500, 'STRIPE_SECRET_KEY missing');
		}
		if (!publicSiteUrl) {
			return jsonError(500, 'PUBLIC_SITE_URL missing');
		}

		const adminSb = createClient(supabaseUrl, serviceRoleKey, {
			auth: { persistSession: false },
		});

		const accessToken = cookies.get('sb-access-token')?.value;
		let customerUserId: string | null = null;
		let userEmail: string | null = null;
		if (accessToken) {
			const anonSb = createClient(supabaseUrl, anonKey, {
				auth: { persistSession: false, autoRefreshToken: false },
				global: { headers: { Authorization: `Bearer ${accessToken}` } },
			});
			const { data: userData } = await anonSb.auth.getUser();
			customerUserId = userData.user?.id ?? null;
			userEmail = userData.user?.email ?? null;
		}

		if (!customerUserId) {
			return jsonError(401, 'Debes iniciar sesión para comprar');
		}

		const customerEmail = email || userEmail || undefined;

		const rpcPayload = {
			items: normalizedItems,
			customer_email: customerEmail || null,
			customer_user_id: customerUserId,
		};

		const { data, error: rpcError } = await (adminSb as any).rpc('fs_checkout_test', rpcPayload);

		if (rpcError) {
			const msg = rpcError.message || 'Error en checkout';
			console.error('[stripe/checkout] rpc fs_checkout_test error', {
				code: (rpcError as any).code,
				message: rpcError.message,
				details: (rpcError as any).details,
				hint: (rpcError as any).hint,
			});

			if ((rpcError as any).code === '42883' || msg.includes('does not exist')) {
				return jsonError(500, 'RPC fs_checkout_test no existe en la base de datos.', { code: (rpcError as any).code, message: msg });
			}
			if ((rpcError as any).code === '42501' || msg.toLowerCase().includes('permission denied')) {
				return jsonError(500, 'Permiso denegado ejecutando la RPC.', { code: (rpcError as any).code, message: msg });
			}

			if (msg.startsWith('OUT_OF_STOCK:')) {
				return jsonError(409, msg.replace(/^OUT_OF_STOCK:\s*/, ''), { message: msg });
			}
			if (msg.startsWith('INVALID_ITEMS:')) {
				return jsonError(400, msg.replace(/^INVALID_ITEMS:\s*/, ''), { message: msg });
			}
			if (msg.startsWith('INVALID_PRODUCT:')) {
				return jsonError(400, msg.replace(/^INVALID_PRODUCT:\s*/, ''), { message: msg });
			}
			if (msg.startsWith('INACTIVE_PRODUCT:')) {
				return jsonError(400, msg.replace(/^INACTIVE_PRODUCT:\s*/, ''), { message: msg });
			}

			return jsonError(500, msg, {
				code: (rpcError as any).code,
				message: msg,
				details: (rpcError as any).details,
				hint: (rpcError as any).hint,
			});
		}

		const row: RpcResultRow | null = Array.isArray(data) ? (data[0] as any) : (data as any);
		if (!row?.order_id) {
			return jsonError(500, 'Respuesta inválida del checkout', { data });
		}

		const { data: orderItems, error: orderItemsError } = await (adminSb as any)
			.from('fs_order_items')
			.select('id,order_id,product_id,name,qty,price_cents,line_total_cents,size,created_at')
			.eq('order_id', row.order_id)
			.order('created_at', { ascending: true });

		if (orderItemsError) {
			return jsonError(500, 'Error cargando items del pedido', toErrorDetails(orderItemsError));
		}

		if (!Array.isArray(orderItems) || orderItems.length === 0) {
			return jsonError(500, 'No se generaron items...', { order_id: row.order_id });
		}

		const stripe = new Stripe(stripeSecretKey, {
			apiVersion: '2025-12-15.clover',
		});

		const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = (orderItems as OrderItemRow[]).map(
			(it) => {
				const baseName = it.name || 'Producto';
				const fullName = it.size ? `${baseName} (${it.size})` : baseName;
				return {
					quantity: it.qty,
					price_data: {
						currency: 'eur',
						unit_amount: it.price_cents,
						product_data: { name: fullName },
					},
				};
			},
		);

		if (lineItems.length === 0) {
			return jsonError(500, 'No se pudieron construir line_items para Stripe', { order_id: row.order_id });
		}

		let couponId: string | undefined;
		try {
			if (row.discount_cents > 0) {
				const coupon = await stripe.coupons.create({
					amount_off: row.discount_cents,
					currency: 'eur',
					duration: 'once',
					name: 'Descuento',
				});
				couponId = coupon.id;
			}
		} catch (err) {
			return jsonError(502, 'Stripe coupon error', toErrorDetails(err));
		}

		const siteBase = publicSiteUrl.replace(/\/+$/, '');
		let session: Stripe.Checkout.Session;
		try {
			session = await stripe.checkout.sessions.create({
				mode: 'payment',
				line_items: lineItems,
				discounts: couponId ? [{ coupon: couponId }] : undefined,
				success_url: `${siteBase}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${siteBase}/carrito`,
				customer_email: customerEmail,
				client_reference_id: row.order_id,
				metadata: {
					order_id: row.order_id,
					user_id: customerUserId,
				},
				locale: 'es',
				shipping_address_collection: { allowed_countries: ['ES'] },
				billing_address_collection: 'required',
				phone_number_collection: { enabled: true },
			});
		} catch (err) {
			return jsonError(502, 'Stripe session error', toErrorDetails(err));
		}

		if (!session.url) {
			return jsonError(502, 'Stripe no devolvió una URL de checkout', { session_id: session.id });
		}

		return json(200, {
			url: session.url,
			session_id: session.id,
			order_id: row.order_id,
			subtotal_cents: row.subtotal_cents,
			discount_cents: row.discount_cents,
			total_cents: row.total_cents,
		});
	} catch (error: any) {
		return jsonError(500, error?.message || 'Unhandled error', toErrorDetails(error));
	}
};
