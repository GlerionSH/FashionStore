import { useStore } from '@nanostores/preact';
import { cartCount } from '../../stores/cart';

export default function CartBadge() {
	const count = useStore(cartCount);
	if (!count || count <= 0) return null;
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				minWidth: 16,
				height: 16,
				padding: '0 6px',
				borderRadius: 999,
				background: '#111',
				color: '#fff',
				fontSize: 10,
				fontWeight: 600,
				lineHeight: 1,
			}}
		>
			{count}
		</span>
	);
}
