import { getEnv } from '../env';

export const escapeHtml = (s: string) =>
	s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');

export const formatEURFromCents = (cents: number) =>
	new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);

export const sendBrevoEmail = async ({
	to,
	subject,
	html,
}: {
	to: string;
	subject: string;
	html: string;
}) => {
	const apiKey = getEnv('BREVO_API_KEY');
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
