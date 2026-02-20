import { useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import AddToCartButton from './AddToCartButton';
import { getLang } from '../../lib/i18n';
import { cartItems } from '../../stores/cart';

type Props = {
	productId: string;
	name: string;
	priceCents: number;
	stock?: number;
	imageUrl?: string;
	sizes?: string[];
	sizeStock?: Record<string, number>;
};

export default function ProductPurchase({ productId, name, priceCents, stock, imageUrl, sizes = [], sizeStock = {} }: Props) {
	const hasSizes = sizes.length > 0;
	const lang = getLang();
	const [selectedSize, setSelectedSize] = useState<string | null>(null);
	const [sizeError, setSizeError] = useState(false);

	const items = useStore(cartItems);

	// How many units of this product (+ size) are already in the cart
	const cartQty = useMemo(() => {
		return items.reduce((sum, item) => {
			if (item.id !== productId) return sum;
			if (selectedSize !== null) return item.size === selectedSize ? sum + item.qty : sum;
			return !item.size ? sum + item.qty : sum;
		}, 0);
	}, [items, productId, selectedSize]);

	// Raw DB stock for selected size / general
	const effectiveStock = useMemo(() => {
		if (!hasSizes) return stock;
		if (!selectedSize) return 0;
		return sizeStock[selectedSize] ?? 0;
	}, [hasSizes, selectedSize, sizeStock, stock]);

	// Available = DB stock minus what's already in cart
	const maxStock = useMemo(() => {
		if (typeof effectiveStock !== 'number' || !Number.isFinite(effectiveStock)) return null;
		return Math.max(0, Math.trunc(effectiveStock) - cartQty);
	}, [effectiveStock, cartQty]);

	const cartFull = useMemo(() => {
		if (hasSizes && !selectedSize) return false;
		return maxStock !== null && maxStock <= 0 && cartQty > 0;
	}, [hasSizes, selectedSize, maxStock, cartQty]);

	const canBuy = hasSizes ? (selectedSize !== null && maxStock !== null && maxStock > 0) : (maxStock === null ? true : maxStock > 0);

	const [qty, setQty] = useState(1);

	const clampedQty = useMemo(() => {
		const raw = Number.isFinite(qty) ? Math.trunc(qty) : 1;
		const base = raw > 0 ? raw : 1;
		if (maxStock === null) return base;
		return Math.min(base, Math.max(1, maxStock));
	}, [qty, maxStock]);

	const decrement = () => setQty((q) => Math.max(1, Math.trunc(q) - 1));
	const increment = () => {
		if (maxStock !== null) {
			setQty((q) => Math.min(maxStock, Math.trunc(q) + 1));
			return;
		}
		setQty((q) => Math.trunc(q) + 1);
	};

	const atMax = maxStock !== null ? clampedQty >= maxStock : false;

	const handleAddToCart = () => {
		if (hasSizes && !selectedSize) {
			setSizeError(true);
			return false;
		}
		setSizeError(false);
		return true;
	};

	return (
		<div class="pdp-purchase">
			{/* Size selector */}
			{hasSizes && (
				<div class="pdp-block">
					<div class="pdp-label">{lang === 'en' ? 'Size' : 'Talla'}</div>
					<div class="pdp-sizes">
						{sizes.map((size) => {
							const sizeAvailable = (sizeStock[size] ?? 0) > 0;
							const isSelected = selectedSize === size;
							const baseClass = 'pdp-size';
							const selectedClass = isSelected ? 'pdp-size--active' : '';
							const disabledClass = !sizeAvailable ? 'pdp-size--disabled' : '';
							return (
								<button
									key={size}
									type="button"
									disabled={!sizeAvailable}
									onClick={() => {
										setSelectedSize(size);
										setSizeError(false);
										setQty(1);
									}}
									class={`${baseClass} ${selectedClass} ${disabledClass}`}
								>
									{size}
								</button>
							);
						})}
					</div>
					{sizeError && (
						<p class="pdp-error">
							{lang === 'en' ? 'Select a size' : 'Selecciona una talla'}
						</p>
					)}
					{selectedSize && (
						<p class="pdp-hint">
							{lang === 'en'
								? `Size ${selectedSize} stock: ${sizeStock[selectedSize] ?? 0}`
								: `Stock talla ${selectedSize}: ${sizeStock[selectedSize] ?? 0}`}
						</p>
					)}
				</div>
			)}

			{/* Quantity selector */}
			<div class="pdp-qty">
				<div class="pdp-label">{lang === 'en' ? 'Quantity' : 'Cantidad'}</div>
				<div class="pdp-stepper">
					<button
						type="button"
						onClick={decrement}
						disabled={!canBuy || clampedQty <= 1}
						class={`pdp-stepper-btn ${!canBuy || clampedQty <= 1 ? 'pdp-stepper-btn--disabled' : ''}`}
					>
						-
					</button>
					<input
						type="number"
						min={1}
						max={maxStock ?? undefined}
						value={clampedQty}
						disabled={!canBuy}
						onInput={(e: Event) => {
							const next = Number((e.currentTarget as HTMLInputElement).value);
							if (!Number.isFinite(next)) return;
							setQty(next);
						}}
						class={`pdp-stepper-input ${!canBuy ? 'pdp-stepper-input--disabled' : ''}`}
					/>
					<button
						type="button"
						onClick={increment}
						disabled={!canBuy || atMax}
						class={`pdp-stepper-btn ${!canBuy || atMax ? 'pdp-stepper-btn--disabled' : ''}`}
					>
						+
					</button>
				</div>
			</div>

			<AddToCartButton
				productId={productId}
				name={name}
				priceCents={priceCents}
				stock={effectiveStock}
				imageUrl={imageUrl}
				qty={clampedQty}
				size={selectedSize ?? undefined}
				onBeforeAdd={handleAddToCart}
				disabled={(hasSizes && !selectedSize) || cartFull || maxStock === 0}
			/>

			{cartFull && (
				<p class="pdp-cart-full">
					{lang === 'en'
						? 'You already have the maximum available in your cart.'
						: 'Ya tienes el máximo disponible en tu carrito.'}
				</p>
			)}

			<style>{`
				.pdp-purchase {
					margin-top: 1.5rem;
					display: grid;
					gap: 1.5rem;
				}

				.pdp-purchase .w-full {
					width: 100%;
				}

				.pdp-block {
					display: grid;
					gap: 0.75rem;
				}

				.pdp-label {
					font-size: 0.75rem;
					letter-spacing: 0.25em;
					text-transform: uppercase;
					color: #9ca3af;
				}

				.pdp-sizes {
					display: flex;
					flex-wrap: wrap;
					gap: 10px;
				}

				.pdp-size {
					min-width: 44px;
					height: 36px;
					padding: 0 12px;
					border: 1px solid #e5e7eb;
					background: #fff;
					color: #111;
					font-size: 0.75rem;
					letter-spacing: 0.18em;
					text-transform: uppercase;
					cursor: pointer;
					transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
				}

				.pdp-size:hover {
					border-color: #111;
				}

				.pdp-size--active {
					border-color: #111;
					background: #111;
					color: #fff;
				}

				.pdp-size--disabled {
					opacity: 0.45;
					cursor: not-allowed;
					text-decoration: line-through;
					text-decoration-thickness: 1px;
					text-decoration-color: rgba(17, 17, 17, 0.45);
				}

				.pdp-error {
					margin: 0;
					font-size: 0.75rem;
					letter-spacing: 0.2em;
					text-transform: uppercase;
					color: #991b1b;
				}

				.pdp-hint {
					margin: 0;
					font-size: 0.75rem;
					color: #9ca3af;
				}

				.pdp-qty {
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 1rem;
					flex-wrap: wrap;
				}

				.pdp-stepper {
					display: flex;
					align-items: center;
					border: 1px solid #e5e7eb;
					background: #fff;
				}

				.pdp-stepper-btn {
					width: 36px;
					height: 36px;
					display: grid;
					place-items: center;
					background: transparent;
					border: 0;
					color: #111;
					font-size: 14px;
					cursor: pointer;
					user-select: none;
				}

				.pdp-stepper-btn:focus {
					outline: none;
				}

				.pdp-stepper-btn--disabled {
					color: #d1d5db;
					cursor: not-allowed;
				}

				.pdp-stepper-input {
					width: 56px;
					height: 36px;
					text-align: center;
					border: 0;
					border-left: 1px solid #e5e7eb;
					border-right: 1px solid #e5e7eb;
					background: transparent;
					font-size: 14px;
					color: #111;
					appearance: textfield;
				}

				.pdp-stepper-input:focus {
					outline: none;
				}

				.pdp-stepper-input--disabled {
					color: #d1d5db;
				}

				.pdp-stepper-input::-webkit-outer-spin-button,
				.pdp-stepper-input::-webkit-inner-spin-button {
					-webkit-appearance: none;
					margin: 0;
				}

				.pdp-cart-full {
					margin: 0;
					font-size: 0.75rem;
					letter-spacing: 0.15em;
					text-transform: uppercase;
					color: #6b7280;
				}
			`}</style>
		</div>
	);
}
