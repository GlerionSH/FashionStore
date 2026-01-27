import { getEnv } from '../../env';
import { escapeHtml } from '../../services/brevoEmail';

type Cta = {
	label: string;
	url: string;
};

export const renderBaseEmail = ({
	title,
	preheader,
	bodyHtml,
	cta,
	secondaryCta,
}: {
	title: string;
	preheader: string;
	bodyHtml: string;
	cta?: Cta;
	secondaryCta?: Cta;
}) => {
	const publicSiteUrl = getEnv('PUBLIC_SITE_URL')?.replace(/\/+$/, '') ?? '';
	const envLogoUrl = getEnv('EMAIL_LOGO_URL')?.trim() ?? '';
	const logoUrl = envLogoUrl || (publicSiteUrl ? `${publicSiteUrl}/logo.png` : '');

	const ctaHtml = cta
		? `
			<tr>
				<td align="center" style="padding-top:24px;">
					<a href="${escapeHtml(cta.url)}" style="display:inline-block; background:#111; color:#fff; text-decoration:none; padding:12px 18px; font-size:14px; letter-spacing:0.04em; text-transform:uppercase;">
						${escapeHtml(cta.label)}
					</a>
				</td>
			</tr>`
		: '';

	const secondaryCtaHtml = secondaryCta
		? `
			<tr>
				<td align="center" style="padding-top:12px;">
					<a href="${escapeHtml(secondaryCta.url)}" style="display:inline-block; color:#111; text-decoration:underline; font-size:13px;">
						${escapeHtml(secondaryCta.label)}
					</a>
				</td>
			</tr>`
		: '';

	return `<!doctype html>
<html lang="es">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family: Arial, sans-serif; color:#111;">
	<span style="display:none; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">
		${escapeHtml(preheader)}
	</span>
	<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f3f4f6; padding:24px 0;">
		<tr>
			<td align="center">
				<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:600px; max-width:600px; background:#ffffff; border:1px solid #e5e7eb;">
					<tr>
						<td style="padding:18px 24px; border-bottom:1px solid #e5e7eb;">
							<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
								<tr>
									<td align="left" style="vertical-align:middle;">
										${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="FASHION STORE" style="height:28px; width:auto; display:block;" />` : `<div style="font-weight:700; letter-spacing:0.18em; font-size:14px;">FASHION STORE</div>`}
									</td>
									<td align="right" style="vertical-align:middle;">
										<div style="font-size:12px; letter-spacing:0.12em; text-transform:uppercase; color:#6b7280;">${escapeHtml(title)}</div>
									</td>
								</tr>
							</table>
						</td>
					</tr>

					<tr>
						<td style="padding:24px;">
							${bodyHtml}
						</td>
					</tr>

					${ctaHtml}
					${secondaryCtaHtml}

					<tr>
						<td style="padding:18px 24px; border-top:1px solid #e5e7eb; color:#6b7280; font-size:12px;">
							Fashion Store · Si necesitas ayuda, responde a este email o contacta soporte.
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`;
};
