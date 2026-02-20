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

export const POST: APIRoute = async ({ params, cookies }) => {
	const auth = await requireAdmin(cookies);
	if (!auth.ok) return json(auth.status, { error: auth.error });

	const ticketId = params.id;
	if (!ticketId || !RE_UUID.test(ticketId)) return json(400, { error: 'invalid_id' });

	const sb = getSupabaseAdmin() as any;

	const { data: ticket, error: ticketError } = await sb
		.from('fs_support_tickets')
		.select('id,status')
		.eq('id', ticketId)
		.maybeSingle();

	if (ticketError) return json(500, { error: 'ticket_load_failed' });
	if (!ticket) return json(404, { error: 'ticket_not_found' });
	if (ticket.status === 'closed') return json(200, { ok: true, already_closed: true });

	const { error: updateError } = await sb
		.from('fs_support_tickets')
		.update({ status: 'closed' })
		.eq('id', ticketId);

	if (updateError) {
		console.error('[support/close] update error', updateError);
		return json(500, { error: 'update_failed' });
	}

	return json(200, { ok: true });
};
