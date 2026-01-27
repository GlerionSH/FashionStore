import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
	try {
		const token = cookies.get('sb-access-token')?.value;
		if (!token) {
			return new Response(JSON.stringify({ loggedIn: false }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
		const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
		if (!supabaseUrl || !anonKey) {
			return new Response(JSON.stringify({ loggedIn: false }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const sb = createClient(supabaseUrl, anonKey, {
			auth: { persistSession: false, autoRefreshToken: false },
			global: { headers: { Authorization: `Bearer ${token}` } },
		});

		const { data, error } = await sb.auth.getUser();
		if (error || !data.user) {
			return new Response(JSON.stringify({ loggedIn: false }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify({ loggedIn: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch {
		return new Response(JSON.stringify({ loggedIn: false }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
