import { getEnv } from '../env';

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

const formatEURFromCents = (cents: number) =>
	new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);

const escapeHtml = (s: string) =>
	s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');

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

	const invoiceBlock = invoiceUrl
		? `<p style="margin-top:24px;">
<a href="${escapeHtml(invoiceUrl)}" style="display:inline-block; padding:10px 14px; background:#111; color:#fff; text-decoration:none; font-size:14px; letter-spacing:0.02em;">Descargar factura (PDF)</a>
</p>`
		: '';

	return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="font-family: Arial, sans-serif; color:#111;">
<h2>Pago confirmado</h2>
<p>Gracias por tu compra. Hemos recibido tu pago correctamente.</p>

<h3>Pedido</h3>
<p><strong>ID:</strong> ${escapeHtml(order.id)}</p>

<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<thead>
<tr>
<th align="left" style="border-bottom:1px solid #eee; padding:8px 0;">Producto</th>
<th align="center" style="border-bottom:1px solid #eee; padding:8px 0;">Qty</th>
<th align="right" style="border-bottom:1px solid #eee; padding:8px 0;">Precio</th>
<th align="right" style="border-bottom:1px solid #eee; padding:8px 0;">Total</th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
</table>

<p style="margin-top:16px;"><strong>Total:</strong> ${escapeHtml(formatEURFromCents(order.total_cents))}</p>
${invoiceBlock}
</body>
</html>`;
};

const sendBrevoEmail = async ({
	to,
	subject,
	html,
}: {
	to: string;
	subject: string;
	html: string;
}) => {
	const apiKey = getEnv('BREVO_API_KEY');
	console.info('[brevo] hasKey', Boolean(apiKey), 'prefix', apiKey?.slice(0, 4));
	if (!apiKey) throw new Error('BREVO_API_KEY missing');

	const fromEmail = getEnv('EMAIL_FROM_EMAIL') ?? 'no-reply@brevo.com';
	const fromName = getEnv('EMAIL_FROM_NAME') ?? 'Fashion Store';

	const response = await fetch('https://api.brevo.com/v3/smtp/email', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'api-key': apiKey,
		},
		body: JSON.stringify({
			sender: { name: fromName, email: fromEmail },
			to: [{ email: to }],
			subject,
			htmlContent: html,
		}),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Brevo error ${response.status}: ${text}`);
	}
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
