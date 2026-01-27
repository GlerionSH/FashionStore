import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../../lib/database/supabaseServer';
import { requireAdmin } from '../../../../../lib/auth/requireAdmin';

export const prerender = false;

const json = (status: number, data: unknown) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

export const POST: APIRoute = async ({ params, cookies }) => {
	const auth = await requireAdmin(cookies);
	if (!auth.ok) {
		return json(auth.status, { error: auth.error });
	}

	const offerId = params.offerId;
	if (!offerId) {
		return json(400, { error: 'offerId_required' });
	}

	const sb = getSupabaseAdmin() as any;

	const { data: offer, error: offerError } = await sb
		.from('fs_flash_offers')
		.select('id,is_enabled,discount_percent,starts_at,ends_at,popup_title,popup_text,updated_at')
		.eq('id', offerId)
		.maybeSingle();

	if (offerError) {
		return json(500, { error: 'offer_load_failed' });
	}

	if (!offer) {
		return json(404, { error: 'offer_not_found' });
	}

	const percent = Number.isFinite(offer.discount_percent) ? Math.trunc(offer.discount_percent) : 0;
	const subject = percent > 0 ? `Oferta Flash -${percent}% por tiempo limitado` : 'Oferta Flash activa';

	const { data: campaignRow, error: campaignError } = await sb
		.from('fs_email_campaigns')
		.upsert(
			{
				type: 'flash_offer',
				ref_id: String(offerId),
				subject,
				status: 'queued',
			},
			{ onConflict: 'type,ref_id' }
		)
		.select('id,status,subject')
		.maybeSingle();

	if (campaignError || !campaignRow) {
		return json(500, { error: 'campaign_upsert_failed' });
	}

	let inserted = 0;
	let offset = 0;
	const pageSize = 1000;

	while (true) {
		const { data: subs, error: subsError } = await sb
			.from('fs_subscribers')
			.select('email')
			.eq('status', 'subscribed')
			.order('created_at', { ascending: true })
			.range(offset, offset + pageSize - 1);

		if (subsError) {
			return json(500, { error: 'subscribers_load_failed' });
		}

		const emails: string[] = (subs ?? []).map((s: any) => String(s.email || '').trim()).filter(Boolean);
		if (emails.length === 0) break;

		const deliveries = emails.map((email) => ({ campaign_id: campaignRow.id, email, status: 'queued' }));
		const { error: delivError } = await sb
			.from('fs_email_deliveries')
			.upsert(deliveries, { onConflict: 'campaign_id,email' });

		if (delivError) {
			return json(500, { error: 'deliveries_upsert_failed' });
		}

		inserted += deliveries.length;
		offset += pageSize;
	}

	return json(202, {
		ok: true,
		campaignId: campaignRow.id,
		status: campaignRow.status,
		subject: campaignRow.subject,
		deliveries_upserted: inserted,
		offer: { id: offer.id, discount_percent: offer.discount_percent, is_enabled: offer.is_enabled },
	});
};
