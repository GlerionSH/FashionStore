export type FlashOffer = {
	id: string;
	discount_percent: number;
	show_popup: boolean;
	popup_title: string | null;
	popup_text: string | null;
};

export type FlashOfferResponse =	| { active: false }
	| { active: true; offer: FlashOffer };

let cachedPromise: Promise<FlashOfferResponse> | null = null;

export const getActiveFlashOffer = (): Promise<FlashOfferResponse> => {
	if (typeof window === 'undefined') {
		return Promise.resolve({ active: false });
	}

	if (cachedPromise) return cachedPromise;

	cachedPromise = fetch('/api/flash-offer', { method: 'GET' })
		.then(async (res) => {
			if (!res.ok) return { active: false } as FlashOfferResponse;
			const data = (await res.json()) as any;
			if (!data?.active || !data?.offer) return { active: false } as FlashOfferResponse;
			return {
				active: true,
				offer: data.offer as FlashOffer,
			} as FlashOfferResponse;
		})
		.catch(() => ({ active: false } as FlashOfferResponse));

	return cachedPromise;
};
