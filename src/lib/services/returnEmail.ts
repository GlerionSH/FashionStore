import { getEnv } from '../env';
import { renderBaseEmail } from '../email/templates/base';
import { escapeHtml, formatEURFromCents, sendBrevoEmail } from './brevoEmail';

type ReturnRow = {
	id: string;
	order_id: string;
	status: string;
	reason?: string | null;
	notes?: string | null;
	requested_at?: string | null;
	reviewed_at?: string | null;
	refunded_at?: string | null;
	refund_total_cents?: number | null;
	refund_method?: 'stripe' | 'manual' | string | null;
};

type ReturnItemRow = {
	name: string;
	size?: string | null;
	qty: number;
	line_total_cents?: number | null;
};

type OrderRow = {
	id: string;
	email: string | null;
};

const renderItemsTable = (items: ReturnItemRow[]) => {
	if (!items.length) return '';
	const rows = items
		.map((it) => {
			const fullName = it.size ? `${it.name} (Talla ${it.size})` : it.name;
			return `
				<tr>
					<td style="padding:8px 0;">${escapeHtml(fullName)}</td>
					<td style="padding:8px 0; text-align:center;">${it.qty}</td>
					<td style="padding:8px 0; text-align:right;">${it.line_total_cents != null ? escapeHtml(formatEURFromCents(it.line_total_cents)) : ''}</td>
				</tr>`;
		})
		.join('');

	return `
		<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:12px;">
			<thead>
				<tr>
					<th align="left" style="border-bottom:1px solid #eee; padding:8px 0; font-size:12px; color:#6b7280; letter-spacing:0.12em; text-transform:uppercase;">Producto</th>
					<th align="center" style="border-bottom:1px solid #eee; padding:8px 0; font-size:12px; color:#6b7280; letter-spacing:0.12em; text-transform:uppercase;">Qty</th>
					<th align="right" style="border-bottom:1px solid #eee; padding:8px 0; font-size:12px; color:#6b7280; letter-spacing:0.12em; text-transform:uppercase;">Importe</th>
				</tr>
			</thead>
			<tbody>
				${rows}
			</tbody>
		</table>`;
};

export const sendReturnRequestedEmail = async ({
	to,
	ret,
	items,
	order,
}: {
	to: string;
	ret: ReturnRow;
	items: ReturnItemRow[];
	order: OrderRow;
}) => {
	const publicSiteUrl = getEnv('PUBLIC_SITE_URL')?.replace(/\/+$/, '') ?? '';
	const orderUrl = publicSiteUrl ? `${publicSiteUrl}/cuenta/pedidos/${encodeURIComponent(order.id)}` : '';

	const bodyHtml = `
		<h2 style="margin:0 0 12px; font-size:18px; font-weight:600;">Solicitud de devolución recibida</h2>
		<p style="margin:0 0 12px; color:#374151; font-size:14px; line-height:1.6;">
			Hemos recibido tu solicitud y la revisaremos lo antes posible.
		</p>
		<p style="margin:0; color:#111; font-size:14px; line-height:1.6;">
			<strong>Devolución:</strong> ${escapeHtml(ret.id)}<br />
			<strong>Pedido:</strong> ${escapeHtml(order.id)}<br />
			<strong>Estado:</strong> requested
		</p>
		${renderItemsTable(items)}
	`;

	const html = renderBaseEmail({
		title: 'Devolución solicitada',
		preheader: 'Hemos recibido tu solicitud de devolución',
		bodyHtml,
		cta: orderUrl ? { label: 'Ver mi pedido', url: orderUrl } : undefined,
		secondaryCta: publicSiteUrl ? { label: 'Mis pedidos', url: `${publicSiteUrl}/cuenta/pedidos` } : undefined,
	});

	await sendBrevoEmail({
		to,
		subject: 'Hemos recibido tu solicitud de devolución',
		html,
	});
};

export const sendReturnReviewedEmail = async ({
	to,
	ret,
	items,
	order,
	action,
	reason,
}: {
	to: string;
	ret: ReturnRow;
	items: ReturnItemRow[];
	order: OrderRow;
	action: 'approve' | 'reject';
	reason?: string | null;
}) => {
	const publicSiteUrl = getEnv('PUBLIC_SITE_URL')?.replace(/\/+$/, '') ?? '';
	const orderUrl = publicSiteUrl ? `${publicSiteUrl}/cuenta/pedidos/${encodeURIComponent(order.id)}` : '';

	const approved = action === 'approve';
	const title = approved ? 'Devolución aprobada' : 'Devolución rechazada';
	const subject = approved ? 'Tu devolución ha sido aprobada' : 'Tu devolución ha sido rechazada';

	const details = approved
		? 'Tu devolución ha sido aprobada. En breve procesaremos el reembolso si corresponde.'
		: `Tu devolución ha sido rechazada.${reason ? ` Motivo: ${escapeHtml(reason)}` : ' Si necesitas ayuda, contáctanos.'}`;

	const bodyHtml = `
		<h2 style="margin:0 0 12px; font-size:18px; font-weight:600;">${escapeHtml(title)}</h2>
		<p style="margin:0 0 12px; color:#374151; font-size:14px; line-height:1.6;">${details}</p>
		<p style="margin:0; color:#111; font-size:14px; line-height:1.6;">
			<strong>Devolución:</strong> ${escapeHtml(ret.id)}<br />
			<strong>Pedido:</strong> ${escapeHtml(order.id)}<br />
			<strong>Estado:</strong> ${escapeHtml(approved ? 'approved' : 'rejected')}
		</p>
		${renderItemsTable(items)}
	`;

	const html = renderBaseEmail({
		title,
		preheader: subject,
		bodyHtml,
		cta: orderUrl ? { label: 'Ver mi pedido', url: orderUrl } : undefined,
	});

	await sendBrevoEmail({ to, subject, html });
};

export const sendReturnRefundedEmail = async ({
	to,
	ret,
	order,
	amount_cents,
	method,
}: {
	to: string;
	ret: ReturnRow;
	order: OrderRow;
	amount_cents: number;
	method: 'stripe' | 'manual';
}) => {
	const publicSiteUrl = getEnv('PUBLIC_SITE_URL')?.replace(/\/+$/, '') ?? '';
	const orderUrl = publicSiteUrl ? `${publicSiteUrl}/cuenta/pedidos/${encodeURIComponent(order.id)}` : '';

	const methodLabel = method === 'stripe' ? 'Stripe' : 'Manual';

	const bodyHtml = `
		<h2 style="margin:0 0 12px; font-size:18px; font-weight:600;">Reembolso realizado</h2>
		<p style="margin:0 0 12px; color:#374151; font-size:14px; line-height:1.6;">
			Hemos procesado tu reembolso.
		</p>
		<p style="margin:0; color:#111; font-size:14px; line-height:1.6;">
			<strong>Devolución:</strong> ${escapeHtml(ret.id)}<br />
			<strong>Pedido:</strong> ${escapeHtml(order.id)}<br />
			<strong>Importe:</strong> ${escapeHtml(formatEURFromCents(amount_cents))}<br />
			<strong>Método:</strong> ${escapeHtml(methodLabel)}
		</p>
	`;

	const html = renderBaseEmail({
		title: 'Reembolso realizado',
		preheader: 'Tu reembolso ha sido procesado',
		bodyHtml,
		cta: orderUrl ? { label: 'Ver mi pedido', url: orderUrl } : undefined,
	});

	await sendBrevoEmail({
		to,
		subject: 'Tu reembolso ha sido procesado',
		html,
	});
};
