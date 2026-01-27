export type FlashOffer = {
	id: string;
	discount_percent: number;
	show_popup: boolean;
	popup_title: string | null;
	popup_text: string | null;
	starts_at: string | null;
	ends_at: string | null;
	is_enabled: boolean;
};

export const applyPercentDiscountCents = (priceCents: number, percent: number): number => {
	const p = Number.isFinite(percent) ? Math.trunc(percent) : 0;
	if (p <= 0) return priceCents;
	const base = Number.isFinite(priceCents) ? Math.trunc(priceCents) : 0;
	const discounted = Math.floor((base * (100 - p)) / 100);
	return Math.max(0, discounted);
};

export const isFlashOfferActiveNow = (offer: Pick<FlashOffer, 'is_enabled' | 'starts_at' | 'ends_at'>, now = new Date()): boolean => {
	if (!offer?.is_enabled) return false;
	const startOk = !offer.starts_at || new Date(offer.starts_at) <= now;
	const endOk = !offer.ends_at || new Date(offer.ends_at) >= now;
	return startOk && endOk;
};

export const getActiveFlashOffer = async (sb: any): Promise<FlashOffer | null> => {
	const { data: settingsData, error: settingsError } = await sb
		.from('fs_settings')
		.select('flash_offers_enabled')
		.eq('singleton', true)
		.maybeSingle();

	if (settingsError || !settingsData?.flash_offers_enabled) return null;

	const { data: offersData, error: offersError } = await sb
		.from('fs_flash_offers')
		.select('id,is_enabled,discount_percent,starts_at,ends_at,show_popup,popup_title,popup_text,updated_at')
		.eq('is_enabled', true)
		.order('updated_at', { ascending: false })
		.limit(10);

	if (offersError) return null;

	const offers: any[] = Array.isArray(offersData) ? offersData : offersData ? [offersData] : [];
	const now = new Date();
	for (const raw of offers) {
		const offer: FlashOffer = {
			id: String(raw.id),
			is_enabled: Boolean(raw.is_enabled),
			discount_percent: Number(raw.discount_percent ?? 0),
			starts_at: raw.starts_at ?? null,
			ends_at: raw.ends_at ?? null,
			show_popup: Boolean(raw.show_popup),
			popup_title: raw.popup_title ?? null,
			popup_text: raw.popup_text ?? null,
		};
		if (isFlashOfferActiveNow(offer, now) && offer.discount_percent > 0) return offer;
	}

	return null;
};
