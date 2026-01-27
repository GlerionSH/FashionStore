import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

type CheckoutTestItem = {
	product_id: string;
	qty: number;
};

type CheckoutTestBody = {
	email?: string;
	items: CheckoutTestItem[];
};

type RpcResultRow = {
	order_id: string;
	subtotal_cents: number;
	discount_cents: number;
	total_cents: number;
};

const json = (status: number, data: unknown) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		const envReport = {
			has_PUBLIC_SUPABASE_URL: Boolean(import.meta.env.PUBLIC_SUPABASE_URL),
			has_PUBLIC_SUPABASE_ANON_KEY: Boolean(import.meta.env.PUBLIC_SUPABASE_ANON_KEY),
			has_SUPABASE_SERVICE_ROLE_KEY: Boolean(import.meta.env.SUPABASE_SERVICE_ROLE_KEY),
		};
		console.info('[checkout-test] env:', envReport);

		const contentType = request.headers.get('content-type') || '';
		if (!contentType.includes('application/json')) {
			return json(400, { error: 'Content-Type debe ser application/json' });
		}

		const body = (await request.json()) as CheckoutTestBody;
		const email = typeof body.email === 'string' ? body.email.trim() : undefined;
		const items = Array.isArray(body.items) ? body.items : [];
		console.info('[checkout-test] incoming payload:', { email: email ?? null, items });

		if (items.length === 0) {
			return json(400, { error: 'items no puede estar vacío' });
		}

		for (const item of items) {
			if (!item || typeof item.product_id !== 'string' || !item.product_id) {
				return json(400, { error: 'product_id inválido' });
			}
			if (
				typeof item.qty !== 'number' ||
				!Number.isFinite(item.qty) ||
				item.qty <= 0 ||
				!Number.isInteger(item.qty)
			) {
				return json(400, { error: 'qty debe ser > 0' });
			}
		}

		// Normalizar items por product_id (evita duplicados y simplifica stock updates)
		const qtyByProductId = new Map<string, number>();
		for (const item of items) {
			qtyByProductId.set(item.product_id, (qtyByProductId.get(item.product_id) ?? 0) + item.qty);
		}
		const normalizedItems: CheckoutTestItem[] = Array.from(qtyByProductId.entries()).map(
			([product_id, qty]) => ({ product_id, qty }),
		);

		const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
		const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
		const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
		console.info('[checkout-test] resolved env (booleans):', {
			hasUrl: Boolean(supabaseUrl),
			hasAnonKey: Boolean(anonKey),
			hasServiceRoleKey: Boolean(serviceRoleKey),
		});

		if (!supabaseUrl) {
			return json(500, { error: 'Supabase no está configurado' });
		}
		if (!anonKey) {
			return json(500, { error: 'Falta PUBLIC_SUPABASE_ANON_KEY' });
		}
		if (!serviceRoleKey) {
			return json(500, {
				error:
					'Falta SUPABASE_SERVICE_ROLE_KEY en el backend. Es necesaria para actualizar stock e insertar pedidos con RLS activado.',
			});
		}

		const adminSb = createClient(supabaseUrl, serviceRoleKey, {
			auth: { persistSession: false },
		});

		const accessToken = cookies.get('sb-access-token')?.value;

		let customerUserId: string | null = null;
		if (accessToken) {
			const anonSb = createClient(supabaseUrl, anonKey, {
				auth: { persistSession: false, autoRefreshToken: false },
				global: { headers: { Authorization: `Bearer ${accessToken}` } },
			});
			const { data: userData } = await anonSb.auth.getUser();
			customerUserId = userData.user?.id ?? null;
		}
		console.info('[checkout-test] session:', { hasAccessToken: Boolean(accessToken), customerUserId });

		const rpcPayload = {
			items: normalizedItems,
			customer_email: email || null,
			customer_user_id: customerUserId,
		};
		console.info('[checkout-test] rpc payload:', rpcPayload);

		const { data, error: rpcError } = await (adminSb as any).rpc('fs_checkout_test', rpcPayload);

		if (rpcError) {
			const msg = rpcError.message || 'Error en checkout';
			console.error('[checkout-test] supabase rpc error:', {
				message: rpcError.message,
				details: (rpcError as any).details,
				hint: (rpcError as any).hint,
				code: (rpcError as any).code,
			});
			if ((rpcError as any).code === '42883' || msg.includes('does not exist')) {
				return json(500, {
					error:
						'RPC fs_checkout_test no existe en la base de datos (¿corriste la migración/SQL en Supabase?).',
				});
			}
			if ((rpcError as any).code === '42501' || msg.toLowerCase().includes('permission denied')) {
				return json(500, {
					error:
						'Permiso denegado ejecutando la RPC. Verifica GRANT EXECUTE a service_role y que el endpoint use SUPABASE_SERVICE_ROLE_KEY.',
				});
			}
			if (msg.startsWith('OUT_OF_STOCK:')) {
				return json(409, { error: msg.replace(/^OUT_OF_STOCK:\s*/, '') });
			}
			if (msg.startsWith('INVALID_ITEMS:')) {
				return json(400, { error: msg.replace(/^INVALID_ITEMS:\s*/, '') });
			}
			if (msg.startsWith('INVALID_PRODUCT:')) {
				return json(400, { error: msg.replace(/^INVALID_PRODUCT:\s*/, '') });
			}
			if (msg.startsWith('INACTIVE_PRODUCT:')) {
				return json(400, { error: msg.replace(/^INACTIVE_PRODUCT:\s*/, '') });
			}
			console.error('[checkout-test] rpcError:', rpcError);
			return json(500, { error: 'Error interno del servidor' });
		}

		const row: RpcResultRow | null = Array.isArray(data) ? (data[0] as any) : (data as any);
		if (!row?.order_id) {
			return json(500, { error: 'Respuesta inválida del checkout' });
		}

		return json(200, {
			order_id: row.order_id,
			subtotal_cents: row.subtotal_cents,
			discount_cents: row.discount_cents,
			total_cents: row.total_cents,
		});
	} catch (error: any) {
		console.error('[checkout-test] unexpected error:', error);
		return json(500, { error: error?.message || 'Error interno del servidor' });
	}
};
