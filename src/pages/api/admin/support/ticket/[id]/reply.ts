import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../../../lib/database/supabaseServer';
import { requireAdmin } from '../../../../../../lib/auth/requireAdmin';
import { sendTicketReplyEmail } from '../../../../../../lib/services/supportEmail';

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

	const replyText = String(body.reply_text ?? '').trim().slice(0, 5000);
	if (replyText.length < 1) return json(422, { error: 'reply_text_required' });

	const sb = getSupabaseAdmin() as any;

	// ── Load ticket ────────────────────────────────────────────
	const { data: ticket, error: ticketError } = await sb
		.from('fs_support_tickets')
		.select('id,name,email,subject,message,status')
		.eq('id', ticketId)
		.maybeSingle();

	if (ticketError) {
		console.error('[support/reply] load ticket', ticketError);
		return json(500, { error: 'ticket_load_failed' });
	}
	if (!ticket) return json(404, { error: 'ticket_not_found' });
	if (ticket.status === 'closed') return json(409, { error: 'ticket_closed' });

	// ── Insert reply ───────────────────────────────────────────
	const { data: reply, error: replyError } = await sb
		.from('fs_support_replies')
		.insert({
			ticket_id:     ticketId,
			admin_user_id: auth.userId,
			reply_text:    replyText,
		})
		.select('id')
		.single();

	if (replyError || !reply) {
		console.error('[support/reply] insert reply', replyError);
		return json(500, { error: 'reply_insert_failed' });
	}

	// ── Update ticket status ───────────────────────────────────
	await sb
		.from('fs_support_tickets')
		.update({ status: 'answered' })
		.eq('id', ticketId);

	// ── Send email to user ─────────────────────────────────────
	let emailError: Error | null = null;
	try {
		await sendTicketReplyEmail(ticket, { replyText });
	} catch (e: any) {
		emailError = e instanceof Error ? e : new Error(String(e));
	}

	const sentAt = emailError ? null : new Date().toISOString();
	const lastErr = emailError ? emailError.message : null;

	await sb
		.from('fs_support_replies')
		.update({
			sent_to_user_at: sentAt,
			...(lastErr ? { last_error: lastErr } : {}),
		})
		.eq('id', reply.id);

	if (emailError) {
		console.error('[support/reply] email send failed', emailError.message);
	}

	return json(200, { ok: true, replyId: reply.id, emailSent: !emailError });
};
