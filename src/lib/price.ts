export const formatPriceEURFromCents = (cents: number): string => {
	const value = Number.isFinite(cents) ? cents : 0;
	const formatted = new Intl.NumberFormat('es-ES', {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value / 100);
	return formatted.replace(/\u00A0/g, ' ');
};
