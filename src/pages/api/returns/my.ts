import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../../../lib/env';

export const prerender = false;

const json = (status: number, data: unknown) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

export const GET: APIRoute = async ({ cookies }) => {
	const supabaseUrl = getEnv('PUBLIC_SUPABASE_URL');
	const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
	const anonKey = getEnv('PUBLIC_SUPABASE_ANON_KEY');

	if (!supabaseUrl || !serviceRoleKey || !anonKey) {
		return json(500, { error: 'supabase_not_configured' });
	}

	const token = cookies.get('sb-access-token')?.value;
	if (!token) {
		return json(401, { error: 'unauthorized' });
	}

	// Get user from token
	const userSb = createClient(supabaseUrl, anonKey, {
		auth: { persistSession: false, autoRefreshToken: false },
		global: { headers: { Authorization: `Bearer ${token}` } },
	});

	const { data: userData } = await userSb.auth.getUser();
	const user = userData?.user;

	if (!user) {
		return json(401, { error: 'unauthorized' });
	}

	// Use admin client to fetch returns
	const adminSb = createClient(supabaseUrl, serviceRoleKey, {
		auth: { persistSession: false },
	});

	const { data: returns, error: returnsError } = await adminSb
		.from('fs_returns')
		.select(`
			id,
			order_id,
			status,
			reason,
			requested_at,
			reviewed_at,
			refunded_at,
			refund_method,
			refund_total_cents,
			currency,
			notes,
			fs_return_items(
				id,
				order_item_id,
				qty,
				line_total_cents
			)
		`)
		.eq('user_id', user.id)
		.order('requested_at', { ascending: false });

	if (returnsError) {
		console.error('[returns/my] error', returnsError);
		return json(500, { error: 'returns_load_failed' });
	}

	return json(200, { returns: returns ?? [] });
};
