import { atom, computed } from 'nanostores';
import { formatPriceEURFromCents } from '../lib/price';

export type CartItem = {
	id: string;
	name: string;
	price_cents: number;
	qty: number;
	stock?: number;
	image_url?: string;
	size?: string;
};

// Generate unique cart key for item (product_id + size)
const getCartKey = (id: string, size?: string): string => {
	return size ? `${id}__${size}` : id;
};

const STORAGE_KEY = 'fashionstore_cart_v1';

export const cartItems = atom<CartItem[]>([]);

export const cartCount = computed(cartItems, (items: CartItem[]) =>
	items.reduce((sum: number, item: CartItem) => sum + item.qty, 0),
);

export const cartSubtotalCents = computed(cartItems, (items: CartItem[]) =>
	items.reduce((sum: number, item: CartItem) => sum + item.price_cents * item.qty, 0),
);

export const cartSubtotalFormatted = computed(cartSubtotalCents, (cents: number) =>
	formatPriceEURFromCents(cents),
);

const clampQty = (qty: number, stock?: number) => {
	const minQty = Math.max(1, qty);
	if (typeof stock === 'number') {
		if (stock <= 0) return 0;
		return Math.min(minQty, stock);
	}
	return minQty;
};

export const addToCart = (item: Omit<CartItem, 'qty'>, qty = 1) => {
	const current = cartItems.get();
	const cartKey = getCartKey(item.id, item.size);
	const existing = current.find((x: CartItem) => getCartKey(x.id, x.size) === cartKey);

	if (typeof item.stock === 'number' && item.stock <= 0) {
		return;
	}

	if (!existing) {
		const nextQty = clampQty(qty, item.stock);
		if (nextQty <= 0) return;
		cartItems.set([...current, { ...item, qty: nextQty }]);
		return;
	}

	const nextQty = clampQty(existing.qty + qty, existing.stock ?? item.stock);
	cartItems.set(
		current.map((x: CartItem) => (getCartKey(x.id, x.size) === cartKey ? { ...x, ...item, qty: nextQty } : x)),
	);
};

// Remove item by cart key (id + size)
export const removeFromCart = (id: string, size?: string) => {
	const cartKey = getCartKey(id, size);
	cartItems.set(cartItems.get().filter((x: CartItem) => getCartKey(x.id, x.size) !== cartKey));
};

export const setQty = (id: string, qty: number, size?: string) => {
	const current = cartItems.get();
	const cartKey = getCartKey(id, size);
	const existing = current.find((x: CartItem) => getCartKey(x.id, x.size) === cartKey);
	if (!existing) return;
	const nextQty = clampQty(qty, existing.stock);
	if (nextQty <= 0) {
		removeFromCart(id, size);
		return;
	}
	cartItems.set(current.map((x: CartItem) => (getCartKey(x.id, x.size) === cartKey ? { ...x, qty: nextQty } : x)));
};

export const increment = (id: string, size?: string) => {
	const current = cartItems.get();
	const cartKey = getCartKey(id, size);
	const existing = current.find((x: CartItem) => getCartKey(x.id, x.size) === cartKey);
	if (!existing) return;
	setQty(id, existing.qty + 1, size);
};

export const decrement = (id: string, size?: string) => {
	const current = cartItems.get();
	const cartKey = getCartKey(id, size);
	const existing = current.find((x: CartItem) => getCartKey(x.id, x.size) === cartKey);
	if (!existing) return;
	const next = existing.qty - 1;
	if (next <= 0) {
		removeFromCart(id, size);
		return;
	}
	setQty(id, next, size);
};

export const clearCart = () => {
	cartItems.set([]);
};

if (typeof window !== 'undefined') {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				cartItems.set(parsed as CartItem[]);
			}
		}
	} catch (err) {
		console.error('[cart] failed to read localStorage', err);
	}

	cartItems.subscribe((items: readonly CartItem[]) => {
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
		} catch (err) {
			console.error('[cart] failed to write localStorage', err);
		}
	});
}
