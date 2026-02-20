import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../../../lib/database/supabaseServer';
import { requireAdmin } from '../../../../../../lib/auth/requireAdmin';

export const prerender = false;

const json = (status: number, data: unknown) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST: APIRoute = async ({ params, cookies, request }) => {
	const auth = await requireAdmin(cookies);
	if (!auth.ok) return json(auth.status, { error: auth.error });

	const ticketId = params.id;
	if (!ticketId || !RE_UUID.test(ticketId)) return json(400, { error: 'invalid_id' });

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json(400, { error: 'invalid_json' });
	}

	const adminNotes = String(body.admin_notes ?? '').trim().slice(0, 2000);

	const sb = getSupabaseAdmin() as any;

	const { error } = await sb
		.from('fs_support_tickets')
		.update({ admin_notes: adminNotes || null })
		.eq('id', ticketId);

	if (error) {
		console.error('[support/notes] update error', error);
		return json(500, { error: 'update_failed' });
	}

	return json(200, { ok: true });
};
