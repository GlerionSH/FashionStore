import { useEffect, useState } from 'preact/hooks';
import { addToCart } from '../../stores/cart';

type Props = {
  productId: string;
  name: string;
  priceCents: number;
  stock?: number;
  imageUrl?: string;
  qty?: number;
  size?: string;
  onBeforeAdd?: () => boolean;
  disabled?: boolean;
};

export default function AddToCartButton({
  productId,
  name,
  priceCents,
  stock,
  imageUrl,
  qty,
  size,
  onBeforeAdd,
  disabled: disabledProp,
}: Props) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 1200);
    return () => window.clearTimeout(t);
  }, [added]);

  const outOfStock = typeof stock === 'number' ? stock <= 0 : false;
  const disabled = disabledProp || outOfStock;
  const safeQty = typeof qty === 'number' && Number.isFinite(qty) ? Math.trunc(qty) : 1;
  const finalQty = safeQty > 0 ? safeQty : 1;

  return (
    <div class="mt-3">
      <button
        type="button"
        class={`${disabled ? 'btn-secondary' : 'btn-primary'} w-full`}
        disabled={disabled}
        onClick={() => {
          // Call onBeforeAdd hook if provided
          if (onBeforeAdd && !onBeforeAdd()) {
            return;
          }
          try {
            addToCart(
              {
                id: productId,
                name,
                price_cents: priceCents,
                stock,
                image_url: imageUrl,
                size,
              },
              finalQty,
            );
            setAdded(true);
          } catch (err) {
            console.error('[AddToCartButton] addToCart failed', err);
          }
        }}
      >
        {outOfStock ? 'SIN STOCK' : 'AÑADIR AL CARRITO'}
      </button>

      {added && (
        <div class="mt-2 text-xs tracking-[0.2em] uppercase text-neutral-500">
          Añadido{size ? ` (Talla ${size})` : ''}
        </div>
      )}
    </div>
  );
}
