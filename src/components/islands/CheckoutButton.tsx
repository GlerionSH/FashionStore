import { useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { cartItems } from '../../stores/cart';
import type { CartItem } from '../../stores/cart';
import { getLang } from '../../lib/i18n';

type ApiResponseOk = {
	url: string;
	session_id: string;
	order_id: string;
};

type ApiResponseErr = {
	error: string;
};

type ApiResponse = ApiResponseOk | ApiResponseErr;

export default function CheckoutButton() {
	const items = useStore(cartItems) as CartItem[];
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<ApiResponseOk | null>(null);
	const lang = getLang();

	const payloadItems = useMemo(
		() =>
			items
				.filter((i) => i.qty > 0)
				.map((i) => ({ product_id: i.id, qty: i.qty, size: i.size })),
		[items],
	);

	const canSubmit = payloadItems.length > 0 && !loading;

	return (
		<div>
			{!result && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					<input
						type="email"
						placeholder={lang === 'en' ? 'Email (optional)' : 'Email (opcional)'}
						value={email}
						onInput={(e: Event) => setEmail((e.currentTarget as HTMLInputElement).value)}
						class="form-input"
						style={{ fontSize: 14 }}
					/>
					<button
						type="button"
						class="btn-primary"
						disabled={!canSubmit}
						style={{ width: '100%' }}
						onClick={async () => {
							setError(null);
							setResult(null);
							if (!canSubmit) return;

							setLoading(true);
							try {
								const res = await fetch('/api/stripe/checkout', {
									method: 'POST',
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify({
										email: email.trim() ? email.trim() : undefined,
										items: payloadItems,
									}),
								});

								const data = (await res.json()) as ApiResponse;
								if (!res.ok) {
									setError((data as ApiResponseErr)?.error || (lang === 'en' ? 'Unknown error' : 'Error desconocido'));
									return;
								}

								setResult(data as ApiResponseOk);
								const url = (data as ApiResponseOk).url;
								if (typeof url === 'string' && url) {
									window.location.href = url;
									return;
								}
								setError(lang === 'en' ? 'Stripe did not return a checkout URL' : 'Stripe no devolvió una URL de checkout');
							} catch (err: any) {
								setError(err?.message || (lang === 'en' ? 'Unexpected error' : 'Error inesperado'));
							} finally {
								setLoading(false);
							}
						}}
					>
						{loading ? (lang === 'en' ? 'Processing...' : 'Procesando...') : (lang === 'en' ? 'Checkout' : 'Finalizar compra')}
					</button>
				</div>
			)}

			{error && (
				<div class="alert alert-error" style={{ marginTop: 16 }}>
					{error}
				</div>
			)}

			{result && (
				<div style={{ border: '1px solid #e5e7eb', padding: 24 }}>
					<p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#111', margin: '0 0 12px' }}>
						{lang === 'en' ? 'Redirecting to Stripe...' : 'Redirigiendo a Stripe...'}
					</p>
					<p style={{ fontSize: 14, margin: 0, color: '#6b7280' }}>
						{lang === 'en' ? 'If nothing happens, check that Stripe is configured.' : 'Si no ocurre nada, revisa que Stripe esté configurado.'}
					</p>
				</div>
			)}
		</div>
	);
}
