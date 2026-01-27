import { getEnv } from '../env';
import { renderBaseEmail } from '../email/templates/base';
import { escapeHtml, formatEURFromCents, sendBrevoEmail } from './brevoEmail';

type OrderRow = {
	id: string;
	email: string | null;
	subtotal_cents: number;
	discount_cents: number;
	total_cents: number;
	status: string;
	paid_at: string | null;
	invoice_token?: string | null;
	invoice_number?: string | null;
	invoice_issued_at?: string | null;
};

type OrderItemRow = {
	name: string;
	qty: number;
	size: string | null;
	price_cents: number;
	line_total_cents: number;
};

const buildOrderPaidHtml = (order: OrderRow, items: OrderItemRow[], invoiceUrl?: string | null) => {
	const rows = items
		.map((it) => {
			const name = it.size ? `${it.name} (${it.size})` : it.name;
			return `<tr>
<td style="padding:8px 0;">${escapeHtml(name)}</td>
<td style="padding:8px 0; text-align:center;">${it.qty}</td>
<td style="padding:8px 0; text-align:right;">${escapeHtml(formatEURFromCents(it.price_cents))}</td>
<td style="padding:8px 0; text-align:right;">${escapeHtml(formatEURFromCents(it.line_total_cents))}</td>
</tr>`;
		})
		.join('');

	const bodyHtml = `
		<h2 style="margin:0 0 12px; font-size:18px; font-weight:600;">Pago confirmado</h2>
		<p style="margin:0 0 12px; color:#374151; font-size:14px; line-height:1.6;">
			Gracias por tu compra. Hemos recibido tu pago correctamente.
		</p>
		<p style="margin:0; color:#111; font-size:14px; line-height:1.6;">
			<strong>ID pedido:</strong> ${escapeHtml(order.id)}
		</p>

		<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:12px;">
			<thead>
				<tr>
					<th align="left" style="border-bottom:1px solid #eee; padding:8px 0; font-size:12px; color:#6b7280; letter-spacing:0.12em; text-transform:uppercase;">Producto</th>
					<th align="center" style="border-bottom:1px solid #eee; padding:8px 0; font-size:12px; color:#6b7280; letter-spacing:0.12em; text-transform:uppercase;">Qty</th>
					<th align="right" style="border-bottom:1px solid #eee; padding:8px 0; font-size:12px; color:#6b7280; letter-spacing:0.12em; text-transform:uppercase;">Precio</th>
					<th align="right" style="border-bottom:1px solid #eee; padding:8px 0; font-size:12px; color:#6b7280; letter-spacing:0.12em; text-transform:uppercase;">Total</th>
				</tr>
			</thead>
			<tbody>
				${rows}
			</tbody>
		</table>

		<p style="margin-top:16px;"><strong>Total:</strong> ${escapeHtml(formatEURFromCents(order.total_cents))}</p>
	`;

	return renderBaseEmail({
		title: 'Pedido pagado',
		preheader: 'Pago confirmado. Gracias por tu compra.',
		bodyHtml,
		cta: invoiceUrl ? { label: 'Descargar factura (PDF)', url: invoiceUrl } : undefined,
	});
};

export const sendOrderPaidEmails = async (order: OrderRow, items: OrderItemRow[], stripeSessionId?: string) => {
	const isDev = Boolean(import.meta.env.DEV);
	const customerEmail = order.email;
	const adminTo = getEnv('EMAIL_ADMIN_TO');
	const customerDomain = customerEmail?.includes('@') ? customerEmail.split('@')[1] : null;
	console.info('[email] sendOrderPaidEmails', {
		dev: isDev,
		customer: Boolean(customerEmail),
		customerDomain,
		admin: Boolean(adminTo),
	});

	const subject = 'Tu pedido está pagado';
	const publicSiteUrl = getEnv('PUBLIC_SITE_URL');
	const invoiceToken = order.invoice_token ?? null;
	const invoiceUrl =
		publicSiteUrl && invoiceToken
			? `${publicSiteUrl.replace(/\/+$/, '')}/api/orders/${encodeURIComponent(order.id)}/invoice.pdf?token=${encodeURIComponent(invoiceToken)}`
			: null;
	if (!invoiceUrl) {
		console.info('[invoice] no invoice link', { hasPublicSiteUrl: Boolean(publicSiteUrl), hasToken: Boolean(invoiceToken) });
	}
	const html = buildOrderPaidHtml(order, items, invoiceUrl);

	console.info('[email] toCustomer', customerEmail);
	console.info('[email] toAdmin', adminTo);

	if (customerEmail && customerEmail !== adminTo) {
		await sendBrevoEmail({ to: customerEmail, subject, html });
	}

	if (adminTo) {
		const adminSubject = `Pedido pagado ${order.id}`;
		const adminHtml = `${html}\n<!-- stripe_session_id: ${escapeHtml(stripeSessionId || '')} -->`;
		await sendBrevoEmail({ to: adminTo, subject: adminSubject, html: adminHtml });
	}
};
