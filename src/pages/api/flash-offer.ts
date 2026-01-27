import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

type FlashOfferRow = {
	id: string;
	discount_percent: number;
	starts_at?: string | null;
	ends_at?: string | null;
	show_popup: boolean;
	popup_title: string | null;
	popup_text: string | null;
};

const json = (status: number, data: unknown) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

export const GET: APIRoute = async () => {
	try {
		const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
		const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
		if (!supabaseUrl || !anonKey) {
			return json(200, { active: false });
		}

		const sb = createClient(supabaseUrl, anonKey, {
			auth: { persistSession: false, autoRefreshToken: false },
		});

		const { data: settingsData } = await (sb as any)
			.from('fs_settings')
			.select('flash_offers_enabled')
			.eq('singleton', true)
			.maybeSingle();

		if (!settingsData?.flash_offers_enabled) {
			return json(200, { active: false });
		}

		const { data: offerData, error: offerError } = await (sb as any)
			.from('fs_flash_offers')
			.select('id,discount_percent,starts_at,ends_at,show_popup,popup_title,popup_text,updated_at')
			.eq('is_enabled', true)
			.order('updated_at', { ascending: false })
			.limit(10);

		if (offerError) {
			return json(200, { active: false });
		}

		const offers: FlashOfferRow[] = Array.isArray(offerData)
			? (offerData as FlashOfferRow[])
			: offerData
				? ([offerData] as FlashOfferRow[])
				: [];

		const now = new Date();
		const offer =
			offers.find((o) => {
				const p = Number.isFinite(o.discount_percent) ? Math.trunc(o.discount_percent) : 0;
				if (p <= 0) return false;
				const startOk = !o.starts_at || new Date(o.starts_at) <= now;
				const endOk = !o.ends_at || new Date(o.ends_at) >= now;
				return startOk && endOk;
			}) ?? null;

		if (!offer) {
			return json(200, { active: false });
		}

		return json(200, {
			active: true,
			offer,
		});
	} catch {
		return json(200, { active: false });
	}
};
