import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../../../lib/env';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	const token = url.searchParams.get('token')?.trim();
	if (!token) {
		return new Response('token_required', { status: 400 });
	}

	const supabaseUrl = getEnv('PUBLIC_SUPABASE_URL');
	const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
	const publicSiteUrl = (getEnv('PUBLIC_SITE_URL') ?? '').replace(/\/+$/, '');

	if (!supabaseUrl || !serviceRoleKey) {
		return new Response('supabase_not_configured', { status: 500 });
	}

	const sb = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

	try {
		const { data: sub, error: loadError } = await (sb as any)
			.from('fs_subscribers')
			.select('id,status')
			.eq('unsubscribe_token', token)
			.maybeSingle();

		if (loadError || !sub) {
			return new Response('invalid_token', { status: 404 });
		}

		if (sub.status !== 'unsubscribed') {
			await (sb as any)
				.from('fs_subscribers')
				.update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
				.eq('id', sub.id);
		}

		if (publicSiteUrl) {
			return Response.redirect(`${publicSiteUrl}/?unsubscribed=1`, 302);
		}

		return new Response('unsubscribed', { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
	} catch {
		return new Response('error', { status: 500 });
	}
};
