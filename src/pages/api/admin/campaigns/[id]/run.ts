import type { APIRoute } from 'astro';
import { getEnv } from '../../../../../lib/env';
import { getSupabaseAdmin } from '../../../../../lib/database/supabaseServer';
import { requireAdmin } from '../../../../../lib/auth/requireAdmin';
import { renderBaseEmail } from '../../../../../lib/email/templates/base';
import { escapeHtml, sendBrevoEmail } from '../../../../../lib/services/brevoEmail';

export const prerender = false;

const json = (status: number, data: unknown) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const POST: APIRoute = async ({ params, cookies, request }) => {
	const auth = await requireAdmin(cookies);
	if (!auth.ok) {
		return json(auth.status, { error: auth.error });
	}

	const campaignId = params.id;
	if (!campaignId) {
		return json(400, { error: 'campaignId_required' });
	}

	let body: { max?: number } = {};
	try {
		body = await request.json();
	} catch {
		body = {};
	}

	const max = Number.isFinite(body.max) ? Math.max(1, Math.min(1000, Math.trunc(body.max as number))) : 250;

	const sb = getSupabaseAdmin() as any;

	const { data: campaign, error: campError } = await sb
		.from('fs_email_campaigns')
		.select('id,type,ref_id,subject,status')
		.eq('id', campaignId)
		.maybeSingle();

	if (campError) return json(500, { error: 'campaign_load_failed' });
	if (!campaign) return json(404, { error: 'campaign_not_found' });

	if (campaign.status === 'sent' || campaign.status === 'failed') {
		return json(200, { ok: true, status: campaign.status, message: 'already_completed' });
	}

	await sb.from('fs_email_campaigns').update({ status: 'sending' }).eq('id', campaignId);

	const { data: deliveries, error: delivError } = await sb
		.from('fs_email_deliveries')
		.select('id,email')
		.eq('campaign_id', campaignId)
		.eq('status', 'queued')
		.order('created_at', { ascending: true })
		.limit(max);

	if (delivError) return json(500, { error: 'deliveries_load_failed' });

	const publicSiteUrl = (getEnv('PUBLIC_SITE_URL') ?? '').replace(/\/+$/, '');
	const offerUrl = publicSiteUrl ? `${publicSiteUrl}/?flash=1` : '';
	const productsUrl = publicSiteUrl ? `${publicSiteUrl}/productos` : '';

	let offer: any = null;
	if (campaign.type === 'flash_offer') {
		const { data: o } = await sb
			.from('fs_flash_offers')
			.select('id,discount_percent,starts_at,ends_at,show_popup,popup_title,popup_text')
			.eq('id', campaign.ref_id)
			.maybeSingle();
		offer = o ?? null;
	}

	const percent = offer && Number.isFinite(offer.discount_percent) ? Math.trunc(offer.discount_percent) : 0;
	const preheader = percent > 0 ? `Hoy: -${percent}% en la tienda` : 'Oferta flash activa';

	const emails = (deliveries ?? []).map((d: any) => String(d.email || '').trim()).filter(Boolean);
	const tokensByEmail = new Map<string, string>();
	if (emails.length) {
		const { data: subs } = await sb
			.from('fs_subscribers')
			.select('email,unsubscribe_token,status')
			.in('email', emails);
		for (const s of subs ?? []) {
			if (s?.email && s?.unsubscribe_token) {
				tokensByEmail.set(String(s.email), String(s.unsubscribe_token));
			}
		}
	}

	let sentNow = 0;
	let failedNow = 0;
	let skippedNow = 0;

	for (const d of deliveries ?? []) {
		const email = String(d.email || '').trim();
		if (!email) continue;

		const token = tokensByEmail.get(email) ?? '';
		const unsubscribeUrl = publicSiteUrl && token ? `${publicSiteUrl}/api/marketing/unsubscribe?token=${encodeURIComponent(token)}` : '';

		const title = 'Oferta Flash activada';
		const endsAt = offer?.ends_at ? new Date(offer.ends_at).toLocaleString('es-ES') : null;

		const bodyHtml = `
			<h2 style="margin:0 0 12px; font-size:18px; font-weight:600;">${escapeHtml(title)}</h2>
			<p style="margin:0 0 12px; color:#374151; font-size:14px; line-height:1.6;">
				${percent > 0 ? `Hoy tienes <strong>-${escapeHtml(String(percent))}%</strong> en productos seleccionados.` : 'Tenemos una oferta flash activa en la tienda.'}
			</p>
			${endsAt ? `<p style="margin:0 0 12px; color:#111; font-size:14px; line-height:1.6;"><strong>Finaliza:</strong> ${escapeHtml(endsAt)}</p>` : ''}
			${offer?.popup_title ? `<p style="margin:0 0 6px; color:#111; font-size:14px;"><strong>${escapeHtml(String(offer.popup_title))}</strong></p>` : ''}
			${offer?.popup_text ? `<p style="margin:0 0 12px; color:#374151; font-size:14px; line-height:1.6;">${escapeHtml(String(offer.popup_text))}</p>` : ''}
			${unsubscribeUrl ? `<p style="margin:18px 0 0; color:#6b7280; font-size:12px; line-height:1.6;">Si no quieres recibir ofertas, puedes <a href="${escapeHtml(unsubscribeUrl)}" style="color:#111; text-decoration:underline;">darte de baja</a>.</p>` : ''}
		`;

		if (!offerUrl) {
			await sb.from('fs_email_deliveries').update({ status: 'failed', error: 'PUBLIC_SITE_URL_missing' }).eq('id', d.id);
			failedNow += 1;
			continue;
		}

		const html = renderBaseEmail({
			title,
			preheader,
			bodyHtml,
			cta: { label: 'Ver oferta', url: offerUrl },
			secondaryCta: productsUrl ? { label: 'Ir a la tienda', url: productsUrl } : undefined,
		});

		try {
			await sendBrevoEmail({ to: email, subject: campaign.subject, html });
			await sb
				.from('fs_email_deliveries')
				.update({ status: 'sent', sent_at: new Date().toISOString(), error: null })
				.eq('id', d.id);
			sentNow += 1;
		} catch (e: any) {
			await sb
				.from('fs_email_deliveries')
				.update({ status: 'failed', error: String(e?.message || 'send_failed') })
				.eq('id', d.id);
			failedNow += 1;
		}

		await sleep(120);
	}

	const countByStatus = async (status: string) => {
		const { count } = await sb
			.from('fs_email_deliveries')
			.select('id', { count: 'exact', head: true })
			.eq('campaign_id', campaignId)
			.eq('status', status);
		return count ?? 0;
	};

	const queuedCount = await countByStatus('queued');
	const sentCount = await countByStatus('sent');
	const failedCount = await countByStatus('failed');
	const skippedCount = await countByStatus('skipped');
	const totalCount = queuedCount + sentCount + failedCount + skippedCount;

	const totals = {
		queued_count: queuedCount,
		sent_count: sentCount,
		failed_count: failedCount,
		skipped_count: skippedCount,
		total_count: totalCount,
		sent_now: sentNow,
		failed_now: failedNow,
		skipped_now: skippedNow,
	};

	let nextStatus: 'sending' | 'sent' | 'failed' = 'sending';
	let sentAt: string | null = null;
	if (queuedCount === 0) {
		sentAt = new Date().toISOString();
		nextStatus = sentCount > 0 ? 'sent' : 'failed';
	}

	await sb
		.from('fs_email_campaigns')
		.update({ status: nextStatus, totals, sent_at: sentAt })
		.eq('id', campaignId);

	return json(200, { ok: true, status: nextStatus, totals });
};
