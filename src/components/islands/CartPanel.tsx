import { useEffect, useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { getActiveFlashOffer } from '../../lib/flashOfferClient';
import { applyPercentDiscountCents } from '../../lib/flashOffer';
import { formatPriceEURFromCents } from '../../lib/price';
import { getLang } from '../../lib/i18n';
import {
  cartCount,
  cartItems,
  cartSubtotalFormatted,
  clearCart,
  decrement,
  increment,
  removeFromCart,
  setQty,
} from '../../stores/cart';
import type { CartItem } from '../../stores/cart';

type Props = {
  variant?: 'slideover' | 'page';
};

export default function CartPanel({ variant = 'slideover' }: Props) {
  const items = useStore(cartItems) as CartItem[];
  const count = useStore(cartCount);
  const subtotal = useStore(cartSubtotalFormatted);
  const [open, setOpen] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const lang = getLang();

  const isEmpty = items.length === 0;
  const showOverlay = variant === 'slideover' && open;

  useEffect(() => {
    if (variant !== 'slideover') return;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, variant]);

  useEffect(() => {
    let mounted = true;
    getActiveFlashOffer().then((res) => {
      if (!mounted) return;
      if (!res.active) {
        setDiscountPercent(0);
        return;
      }
      const p = Number.isFinite(res.offer.discount_percent) ? Math.trunc(res.offer.discount_percent) : 0;
      setDiscountPercent(p > 0 ? p : 0);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const canCheckout = useMemo(() => {
    if (isEmpty) return false;
    for (const item of items) {
      if (typeof item.stock === 'number' && item.stock <= 0) return false;
      if (item.qty <= 0) return false;
    }
    return true;
  }, [isEmpty, items]);

  const subtotalCents = useMemo(() => items.reduce((sum, i) => sum + i.price_cents * i.qty, 0), [items]);

  const discountedSubtotalCents = useMemo(() => {
    if (discountPercent <= 0) return subtotalCents;
    return items.reduce((sum, i) => {
      const discountedUnit = applyPercentDiscountCents(i.price_cents, discountPercent);
      return sum + discountedUnit * i.qty;
    }, 0);
  }, [items, discountPercent, subtotalCents]);

  const footerHasDiscount = discountPercent > 0 && discountedSubtotalCents < subtotalCents;
  const footerSubtotal = footerHasDiscount ? formatPriceEURFromCents(discountedSubtotalCents) : subtotal;
  const footerSubtotalOriginal = formatPriceEURFromCents(subtotalCents);

  const panelContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af' }}>
            {count}{' '}
            {lang === 'en'
              ? count === 1 ? 'item' : 'items'
              : count === 1 ? 'artículo' : 'artículos'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => { if (!isEmpty) clearCart(); }}
            disabled={isEmpty}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 12,
              color: isEmpty ? '#d1d5db' : '#6b7280',
              cursor: isEmpty ? 'not-allowed' : 'pointer',
              textDecoration: 'underline',
            }}
          >
            {lang === 'en' ? 'Empty' : 'Vaciar'}
          </button>
          {variant === 'slideover' && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#111' }}
              aria-label={lang === 'en' ? 'Close' : 'Cerrar'}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 16 }}>
        {isEmpty && (
          <p style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', padding: '2rem 0' }}>
            {lang === 'en' ? 'Your cart is empty' : 'Tu carrito está vacío'}
          </p>
        )}

        {items.map((item: CartItem) => {
          const atMax = typeof item.stock === 'number' ? item.qty >= item.stock : false;
          const outOfStock = typeof item.stock === 'number' ? item.stock <= 0 : false;
          const cartKey = item.size ? `${item.id}__${item.size}` : item.id;

          const discountedUnit = discountPercent > 0 ? applyPercentDiscountCents(item.price_cents, discountPercent) : item.price_cents;
          const hasDiscount = discountPercent > 0 && discountedUnit < item.price_cents;
          const lineTotal = discountedUnit * item.qty;

          return (
            <div
              key={cartKey}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr auto',
                gap: 16,
                paddingBottom: 16,
                marginBottom: 16,
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              {/* Image placeholder */}
              <div style={{ aspectRatio: '1', background: '#f5f5f5' }}>
                {item.image_url && (
                  <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>

              {/* Details */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 400, marginBottom: 4 }}>{item.name}</div>
                {item.size && (
                  <div style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
                    {lang === 'en' ? 'Size' : 'Talla'}: {item.size}
                  </div>
                )}
                <div style={{ fontSize: 13, color: '#111', marginBottom: 8 }}>
                  {hasDiscount ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: '#9ca3af', textDecoration: 'line-through' }}>
                        {formatPriceEURFromCents(item.price_cents)}
                      </span>
                      <span style={{ color: '#111', fontWeight: 500 }}>
                        {formatPriceEURFromCents(discountedUnit)}
                      </span>
                      <span style={{ fontSize: 11, color: '#111', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        -{discountPercent}%
                      </span>
                    </div>
                  ) : (
                    <>{formatPriceEURFromCents(item.price_cents)}</>
                  )}
                </div>

                {outOfStock && (
                  <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 8 }}>
                    {lang === 'en' ? 'Out of stock' : 'Sin stock'}
                  </div>
                )}

                {/* Quantity controls */}
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', width: 'fit-content' }}>
                  <button
                    type="button"
                    onClick={() => decrement(item.id, item.size)}
                    style={{ width: 32, height: 32, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={item.qty}
                    onInput={(e: Event) => {
                      const next = Number((e.currentTarget as HTMLInputElement).value);
                      if (Number.isFinite(next)) setQty(item.id, next, item.size);
                    }}
                    style={{
                      width: 40,
                      textAlign: 'center',
                      border: 'none',
                      borderLeft: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      fontSize: 13,
                      padding: '6px 0',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => increment(item.id, item.size)}
                    disabled={atMax || outOfStock}
                    style={{
                      width: 32,
                      height: 32,
                      background: 'none',
                      border: 'none',
                      cursor: atMax || outOfStock ? 'not-allowed' : 'pointer',
                      fontSize: 14,
                      color: atMax || outOfStock ? '#d1d5db' : '#111',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Price & Remove */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                  {formatPriceEURFromCents(lineTotal)}
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.id, item.size)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 12,
                    color: '#6b7280',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {lang === 'en' ? 'Remove' : 'Eliminar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {lang === 'en' ? 'Subtotal' : 'Subtotal'}
          </span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {footerHasDiscount ? (
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <span style={{ color: '#9ca3af', fontWeight: 400, textDecoration: 'line-through' }}>{footerSubtotalOriginal}</span>
                <span style={{ color: '#111' }}>{footerSubtotal}</span>
              </span>
            ) : (
              <>{subtotal}</>
            )}
          </span>
        </div>

        {variant === 'slideover' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a
              href="/carrito"
              class="btn-primary"
              style={{ width: '100%', textAlign: 'center' }}
            >
              {lang === 'en' ? 'Checkout' : 'Finalizar compra'}
            </a>
            <a
              href="/carrito"
              style={{
                display: 'block',
                textAlign: 'center',
                fontSize: 12,
                color: '#6b7280',
                textDecoration: 'underline',
                padding: '8px 0',
              }}
            >
              {lang === 'en' ? 'View cart' : 'Ver carrito'}
            </a>
          </div>
        )}
      </div>
    </div>
  );

  if (variant === 'page') {
    return <div>{panelContent}</div>;
  }

  return (
    <div>
      {/* Floating cart button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        class={open ? 'fx-hover' : 'fx-hover fx-pop'}
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          zIndex: 40,
          background: '#111',
          color: '#fff',
          border: '1px solid #111',
          padding: '12px 20px',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.18)',
          borderRadius: 999,
        }}
      >
        <span>{lang === 'en' ? 'Cart' : 'Carrito'}</span>
        <span style={{
          background: '#fff',
          color: '#111',
          fontSize: 11,
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 999,
        }}>
          {count}
        </span>
      </button>

      {/* Overlay */}
      {showOverlay && (
        <div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={lang === 'en' ? 'Close cart' : 'Cerrar carrito'}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 49,
              background: 'rgba(0, 0, 0, 0.3)',
              border: 0,
              cursor: 'pointer',
            }}
          />
          <aside
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              height: '100vh',
              width: 'min(400px, 90vw)',
              background: '#fff',
              zIndex: 50,
              borderLeft: '1px solid #e5e7eb',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {panelContent}
          </aside>
        </div>
      )}
    </div>
  );
}
