import { useEffect, useMemo, useState } from 'preact/hooks';
import { getActiveFlashOffer } from '../../lib/flashOfferClient';
import type { FlashOffer } from '../../lib/flashOfferClient';
import { getLang } from '../../lib/i18n';

export default function FlashOfferUI() {
	const [offer, setOffer] = useState<FlashOffer | null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const lang = getLang();

	useEffect(() => {
		let mounted = true;
		getActiveFlashOffer().then((res) => {
			if (!mounted) return;
			if (res.active) setOffer(res.offer);
		});
		return () => {
			mounted = false;
		};
	}, []);

	const dismissKey = useMemo(() => (offer ? `fs_flash_offer_dismissed_${offer.id}` : null), [offer]);

	useEffect(() => {
		if (!offer || !offer.show_popup || !dismissKey) return;
		try {
			const dismissed = window.localStorage.getItem(dismissKey);
			if (dismissed === '1') return;
			const t = window.setTimeout(() => setModalOpen(true), 600);
			return () => window.clearTimeout(t);
		} catch {
			const t = window.setTimeout(() => setModalOpen(true), 600);
			return () => window.clearTimeout(t);
		}
	}, [offer, dismissKey]);

	if (!offer) return null;

	return (
		<div class="fs-flash">
			<div class="fs-flash-banner" role="status">
				<div class="fs-flash-banner-inner">
					<div class="fs-flash-banner-left">
						<span class="fs-flash-badge">-{Math.trunc(offer.discount_percent)}%</span>
						<span class="fs-flash-text">
							{lang === 'en' ? 'FLASH OFFER ACTIVE' : 'OFERTA FLASH ACTIVA'}
						</span>
					</div>
					<a class="fs-flash-link" href="/productos">
						{lang === 'en' ? 'VIEW PRODUCTS' : 'VER PRODUCTOS'}
					</a>
				</div>
			</div>

			{modalOpen && (
				<div class="fs-flash-modal" role="dialog" aria-modal="true">
					<button
						type="button"
						class="fs-flash-backdrop"
						onClick={() => {
							setModalOpen(false);
							if (!dismissKey) return;
							try {
								window.localStorage.setItem(dismissKey, '1');
							} catch {}
						}}
						aria-label={lang === 'en' ? 'Close' : 'Cerrar'}
					/>
					<div class="fs-flash-card">
						<button
							type="button"
							class="fs-flash-close"
							onClick={() => {
								setModalOpen(false);
								if (!dismissKey) return;
								try {
									window.localStorage.setItem(dismissKey, '1');
								} catch {}
							}}
							aria-label={lang === 'en' ? 'Close' : 'Cerrar'}
						>
							×
						</button>
						<div class="fs-flash-kicker">{lang === 'en' ? 'FLASH OFFER' : 'OFERTA FLASH'}</div>
						<h3 class="fs-flash-title">
							{offer.popup_title || (lang === 'en' ? 'Special discount' : 'Descuento especial')}
						</h3>
						<p class="fs-flash-body">
							{offer.popup_text
								|| (lang === 'en'
									? `Enjoy a -${Math.trunc(offer.discount_percent)}% discount on all products.`
									: `Aprovecha un -${Math.trunc(offer.discount_percent)}% en todos los productos.`)}
						</p>
						<a class="fs-flash-cta" href="/productos">
							{lang === 'en' ? 'GO TO CATALOG' : 'IR AL CATÁLOGO'}
						</a>
					</div>
				</div>
			)}

			<style>{`
				.fs-flash-banner {
					border-bottom: 1px solid #e5e7eb;
					background: #111;
					color: #fff;
				}
				.fs-flash-banner-inner {
					max-width: 1200px;
					margin: 0 auto;
					padding: 10px 24px;
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 12px;
					flex-wrap: wrap;
				}
				.fs-flash-banner-left {
					display: flex;
					align-items: center;
					gap: 10px;
				}
				.fs-flash-badge {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					padding: 4px 10px;
					border: 1px solid rgba(255, 255, 255, 0.5);
					font-size: 11px;
					letter-spacing: 0.18em;
					text-transform: uppercase;
				}
				.fs-flash-text {
					font-size: 11px;
					letter-spacing: 0.22em;
					text-transform: uppercase;
					opacity: 0.95;
				}
				.fs-flash-link {
					color: #fff;
					font-size: 11px;
					letter-spacing: 0.22em;
					text-transform: uppercase;
					text-decoration: none;
					border-bottom: 1px solid rgba(255, 255, 255, 0.7);
					padding-bottom: 2px;
				}
				.fs-flash-link:hover {
					opacity: 0.75;
				}

				.fs-flash-modal {
					position: fixed;
					inset: 0;
					z-index: 60;
					display: grid;
					place-items: center;
					padding: 24px;
				}
				.fs-flash-backdrop {
					position: fixed;
					inset: 0;
					background: rgba(0, 0, 0, 0.45);
					border: 0;
					cursor: pointer;
				}
				.fs-flash-card {
					position: relative;
					width: min(520px, 92vw);
					background: #fff;
					border: 1px solid #e5e7eb;
					padding: 28px;
					z-index: 61;
				}
				.fs-flash-close {
					position: absolute;
					top: 10px;
					right: 10px;
					width: 36px;
					height: 36px;
					border: 0;
					background: transparent;
					font-size: 22px;
					cursor: pointer;
					color: #111;
				}
				.fs-flash-kicker {
					font-size: 11px;
					letter-spacing: 0.22em;
					text-transform: uppercase;
					color: #9ca3af;
					margin-bottom: 12px;
				}
				.fs-flash-title {
					margin: 0;
					font-size: 20px;
					font-weight: 400;
					letter-spacing: -0.01em;
				}
				.fs-flash-body {
					margin: 14px 0 20px;
					font-size: 14px;
					color: #4b5563;
					line-height: 1.7;
				}
				.fs-flash-cta {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					width: 100%;
					padding: 14px 18px;
					background: #111;
					color: #fff;
					text-decoration: none;
					font-size: 12px;
					letter-spacing: 0.22em;
					text-transform: uppercase;
					border: 1px solid #111;
				}
				.fs-flash-cta:hover {
					background: #333;
					border-color: #333;
				}
			`}</style>
		</div>
	);
}
