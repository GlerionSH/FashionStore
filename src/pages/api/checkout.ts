import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
	const mod = await import('./stripe/checkout');
	return mod.POST(ctx as any);
};
