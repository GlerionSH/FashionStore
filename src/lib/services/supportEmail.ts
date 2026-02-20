import { getEnv } from '../env';
import { renderBaseEmail } from '../email/templates/base';
import { escapeHtml, sendBrevoEmail } from './brevoEmail';

type TicketInfo = {
	id: string;
	name: string;
	email: string;
	subject: string;
	message: string;
};

type ReplyInfo = {
	replyText: string;
};

const shortId = (id: string) => id.slice(0, 8).toUpperCase();

// P2-6: Strip CR/LF to prevent email header injection in subject/preheader fields
const safeHeaderText = (s: string): string => s.replace(/[\r\n]+/g, ' ').trim();

// ─── 1. ACK to user ─────────────────────────────────────────────────────────

export const sendTicketAckEmail = async (ticket: TicketInfo): Promise<void> => {
	const publicSiteUrl = getEnv('PUBLIC_SITE_URL')?.replace(/\/+$/, '') ?? '';

	const bodyHtml = `
		<h2 style="margin:0 0 12px; font-size:18px; font-weight:600;">Hemos recibido tu mensaje</h2>
		<p style="margin:0 0 12px; color:#374151; font-size:14px; line-height:1.6;">
			Hola ${escapeHtml(ticket.name)},<br />
			gracias por contactar con nosotros. Hemos recibido tu consulta y te responderemos
			en un plazo máximo de <strong>24 horas</strong> en días hábiles.
		</p>
		<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:12px; margin-bottom:12px;">
			<tr>
				<td style="padding:8px 0; font-size:13px; color:#6b7280; border-bottom:1px solid #f3f4f6; width:140px;">
					Referencia
				</td>
				<td style="padding:8px 0; font-size:13px; color:#111; border-bottom:1px solid #f3f4f6;">
					${escapeHtml(shortId(ticket.id))}
				</td>
			</tr>
			<tr>
				<td style="padding:8px 0; font-size:13px; color:#6b7280; width:140px;">Asunto</td>
				<td style="padding:8px 0; font-size:13px; color:#111;">${escapeHtml(ticket.subject)}</td>
			</tr>
		</table>
		<p style="margin:12px 0 0; color:#374151; font-size:13px; line-height:1.6;">
			Si tienes alguna información adicional que añadir, simplemente responde a este correo.
		</p>
	`;

	const html = renderBaseEmail({
		title: 'Mensaje recibido',
		preheader: safeHeaderText(`Ref. ${shortId(ticket.id)} — Hemos recibido tu consulta`),
		bodyHtml,
		secondaryCta: publicSiteUrl ? { label: 'Volver a la tienda', url: publicSiteUrl } : undefined,
	});

	await sendBrevoEmail({
		to: ticket.email,
		subject: safeHeaderText(`Hemos recibido tu mensaje [Ref. ${shortId(ticket.id)}]`),
		html,
	});
};

// ─── 2. Admin notification ───────────────────────────────────────────────────

export const sendTicketAdminNotifEmail = async (ticket: TicketInfo): Promise<void> => {
	const adminTo = getEnv('EMAIL_ADMIN_TO');
	if (!adminTo) {
		console.warn('[supportEmail] EMAIL_ADMIN_TO not set, skipping admin notif');
		return;
	}

	const publicSiteUrl = getEnv('PUBLIC_SITE_URL')?.replace(/\/+$/, '') ?? '';
	const ticketUrl = publicSiteUrl
		? `${publicSiteUrl}/admin-fs/soporte/${encodeURIComponent(ticket.id)}`
		: '';

	const excerpt =
		ticket.message.length > 300
			? ticket.message.slice(0, 300) + '…'
			: ticket.message;

	const bodyHtml = `
		<h2 style="margin:0 0 12px; font-size:18px; font-weight:600;">Nuevo ticket de soporte</h2>
		<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:16px;">
			<tr>
				<td style="padding:8px 0; font-size:13px; color:#6b7280; border-bottom:1px solid #f3f4f6; width:140px;">ID</td>
				<td style="padding:8px 0; font-size:13px; color:#111; border-bottom:1px solid #f3f4f6;">${escapeHtml(shortId(ticket.id))}</td>
			</tr>
			<tr>
				<td style="padding:8px 0; font-size:13px; color:#6b7280; border-bottom:1px solid #f3f4f6; width:140px;">Usuario</td>
				<td style="padding:8px 0; font-size:13px; color:#111; border-bottom:1px solid #f3f4f6;">${escapeHtml(ticket.name)} &lt;${escapeHtml(ticket.email)}&gt;</td>
			</tr>
			<tr>
				<td style="padding:8px 0; font-size:13px; color:#6b7280; width:140px;">Asunto</td>
				<td style="padding:8px 0; font-size:13px; color:#111;">${escapeHtml(ticket.subject)}</td>
			</tr>
		</table>
		<p style="margin:0 0 4px; font-size:12px; letter-spacing:0.1em; text-transform:uppercase; color:#6b7280;">Mensaje</p>
		<div style="background:#f9fafb; border:1px solid #e5e7eb; padding:12px; font-size:13px; color:#374151; line-height:1.7; white-space:pre-wrap;">${escapeHtml(excerpt)}</div>
	`;

	const html = renderBaseEmail({
		title: 'Nuevo ticket',
		preheader: safeHeaderText(`Nuevo ticket de ${ticket.name}: ${ticket.subject}`),
		bodyHtml,
		cta: ticketUrl ? { label: 'Ver ticket en el panel', url: ticketUrl } : undefined,
	});

	await sendBrevoEmail({
		to: adminTo,
		subject: safeHeaderText(`[Soporte] ${ticket.subject} — ${shortId(ticket.id)}`),
		html,
	});
};

// ─── 3. Reply to user ────────────────────────────────────────────────────────

export const sendTicketReplyEmail = async (
	ticket: TicketInfo,
	reply: ReplyInfo,
): Promise<void> => {
	const publicSiteUrl = getEnv('PUBLIC_SITE_URL')?.replace(/\/+$/, '') ?? '';

	const bodyHtml = `
		<h2 style="margin:0 0 12px; font-size:18px; font-weight:600;">Respuesta a tu consulta</h2>
		<p style="margin:0 0 12px; color:#374151; font-size:14px; line-height:1.6;">
			Hola ${escapeHtml(ticket.name)},<br />
			hemos respondido a tu consulta <strong>[Ref. ${escapeHtml(shortId(ticket.id))}]</strong>:
		</p>
		<div style="background:#f9fafb; border:1px solid #e5e7eb; padding:16px; margin-bottom:16px; font-size:14px; color:#111; line-height:1.7; white-space:pre-wrap;">${escapeHtml(reply.replyText)}</div>
		<p style="margin:0; font-size:12px; letter-spacing:0.1em; text-transform:uppercase; color:#6b7280;">Tu mensaje original</p>
		<div style="border-left:3px solid #e5e7eb; padding-left:12px; margin-top:8px; font-size:13px; color:#6b7280; line-height:1.6; white-space:pre-wrap;">${escapeHtml(ticket.message.length > 400 ? ticket.message.slice(0, 400) + '…' : ticket.message)}</div>
		<p style="margin:16px 0 0; color:#374151; font-size:13px; line-height:1.6;">
			Si necesitas más ayuda, responde a este correo o visita nuestra tienda.
		</p>
	`;

	const html = renderBaseEmail({
		title: 'Respuesta recibida',
		preheader: safeHeaderText(`Ref. ${shortId(ticket.id)} — Tenemos una respuesta para ti`),
		bodyHtml,
		secondaryCta: publicSiteUrl ? { label: 'Volver a la tienda', url: publicSiteUrl } : undefined,
	});

	await sendBrevoEmail({
		to: ticket.email,
		subject: safeHeaderText(`Re: ${ticket.subject} [Ref. ${shortId(ticket.id)}]`),
		html,
	});
};
