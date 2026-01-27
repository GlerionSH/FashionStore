import { useEffect, useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { cartItems } from '../../stores/cart';
import type { CartItem } from '../../stores/cart';
import { getActiveFlashOffer } from '../../lib/flashOfferClient';
import { applyPercentDiscountCents } from '../../lib/flashOffer';
import { formatPriceEURFromCents } from '../../lib/price';

type FlashOfferLite = {
	id: string;
	discount_percent: number;
};

const formatCents = (cents: number) => formatPriceEURFromCents(cents);

export default function CartSummary() {
	const items = useStore(cartItems) as CartItem[];
	const [offer, setOffer] = useState<FlashOfferLite | null>(null);

	useEffect(() => {
		let mounted = true;
		getActiveFlashOffer().then((res) => {
			if (!mounted) return;
			if (!res.active) return;
			setOffer({ id: res.offer.id, discount_percent: res.offer.discount_percent });
		});
		return () => {
			mounted = false;
		};
	}, []);

	const subtotalCents = useMemo(() => items.reduce((sum, i) => sum + i.price_cents * i.qty, 0), [items]);

	const discountedSubtotalCents = useMemo(() => {
		if (!offer || offer.discount_percent <= 0) return subtotalCents;
		return items.reduce((sum, i) => {
			const discountedUnit = applyPercentDiscountCents(i.price_cents, offer.discount_percent);
			return sum + discountedUnit * i.qty;
		}, 0);
	}, [items, offer, subtotalCents]);

	const discountCents = Math.max(0, subtotalCents - discountedSubtotalCents);

	return (
		<div>
			<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
				<span style={{ color: '#6b7280' }}>Subtotal</span>
				<span style={{ fontWeight: 500, color: '#111' }}>{formatCents(subtotalCents)}</span>
			</div>
			{discountCents > 0 && (
				<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
					<span style={{ color: '#6b7280' }}>Descuento</span>
					<span style={{ fontWeight: 500, color: '#111' }}>- {formatCents(discountCents)}</span>
				</div>
			)}
			<div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
				<span style={{ color: '#6b7280' }}>Total</span>
				<span style={{ fontWeight: 600, color: '#111' }}>{formatCents(discountedSubtotalCents)}</span>
			</div>
		</div>
	);
}
