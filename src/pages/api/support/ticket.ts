import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../../../lib/database/supabaseServer';
import { getEnv } from '../../../lib/env';
import { sendTicketAckEmail, sendTicketAdminNotifEmail } from '../../../lib/services/supportEmail';

export const prerender = false;

// ── Helpers ────────────────────────────────────────────────────────────────

const json = (status: number, data: unknown) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sanitize = (s: unknown, max: number): string =>
	String(s ?? '')
		.trim()
		.slice(0, max);

// ── P2-3: In-memory IP rate limit (3 req / 60 s per IP) ───────────────────

type RateEntry = { count: number; resetAt: number };
const ipMap = new Map<string, RateEntry>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX       = 3;

const getClientIp = (request: Request): string => {
	const xff = request.headers.get('x-forwarded-for');
	if (xff) return xff.split(',')[0].trim();
	return 'unknown';
};

const isRateLimited = (ip: string): boolean => {
	const now = Date.now();
	const entry = ipMap.get(ip);

	if (!entry || now > entry.resetAt) {
		ipMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
		return false;
	}
	entry.count += 1;
	if (entry.count > RATE_MAX) return true;
	return false;
};

// ── Route handler ──────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request, cookies }) => {
	// ── Rate limit ─────────────────────────────────────────────
	const ip = getClientIp(request);
	if (isRateLimited(ip)) {
		return json(429, { error: 'rate_limited' });
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json(400, { error: 'invalid_json' });
	}

	// ── Validate ───────────────────────────────────────────────
	const name    = sanitize(body.name, 200);
	const email   = sanitize(body.email, 320).toLowerCase();
	const subject = sanitize(body.subject, 300);
	const message = sanitize(body.message, 5000);

	if (!name)    return json(422, { error: 'name_required' });
	if (!email || !RE_EMAIL.test(email)) return json(422, { error: 'email_invalid' });
	if (!subject) return json(422, { error: 'subject_required' });
	if (message.length < 10) return json(422, { error: 'message_too_short' });

	// ── Resolve optional user_id from auth cookie ──────────────
	let userId: string | null = null;
	try {
		const token = cookies.get('sb-access-token')?.value;
		if (token) {
			const sbAuth = createClient(
				getEnv('PUBLIC_SUPABASE_URL')!,
				getEnv('PUBLIC_SUPABASE_ANON_KEY')!,
				{
					auth: { persistSession: false, autoRefreshToken: false },
					global: { headers: { Authorization: `Bearer ${token}` } },
				},
			);
			const { data } = await sbAuth.auth.getUser();
			userId = data?.user?.id ?? null;
		}
	} catch {
		// non-blocking — proceed as anon
	}

	const sb = getSupabaseAdmin() as any;

	// ── Insert ticket ──────────────────────────────────────────
	const { data: ticket, error: insertError } = await sb
		.from('fs_support_tickets')
		.insert({ name, email, subject, message, user_id: userId, status: 'open' })
		.select('id,name,email,subject,message')
		.single();

	if (insertError || !ticket) {
		console.error('[support/ticket] insert error', insertError);
		return json(500, { error: 'insert_failed' });
	}

	// ── Send emails in parallel (P2-4) ─────────────────────────
	const [ackResult, notifResult] = await Promise.allSettled([
		sendTicketAckEmail(ticket),
		sendTicketAdminNotifEmail(ticket),
	]);

	const ackError   = ackResult.status   === 'rejected' ? (ackResult.reason   as Error) : null;
	const notifError = notifResult.status === 'rejected' ? (notifResult.reason as Error) : null;

	const ackSentAt   = ackError   ? null : new Date().toISOString();
	const notifSentAt = notifError ? null : new Date().toISOString();
	const lastError   = ackError
		? `ack: ${ackError.message}`
		: notifError
			? `notif: ${notifError.message}`
			: null;

	await sb
		.from('fs_support_tickets')
		.update({
			email_user_ack_sent_at:    ackSentAt,
			email_admin_notif_sent_at: notifSentAt,
			...(lastError ? { last_error: lastError } : {}),
		})
		.eq('id', ticket.id);

	if (ackError)   console.error('[support/ticket] ack email failed',   ackError.message);
	if (notifError) console.error('[support/ticket] notif email failed', notifError.message);

	return json(200, { ok: true, ticketId: ticket.id });
};
