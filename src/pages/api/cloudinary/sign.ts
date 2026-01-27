import type { APIRoute } from 'astro';
import crypto from 'crypto';
import { getEnv } from '../../../lib/env';

export const prerender = false;

const json = (status: number, data: unknown) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

export const POST: APIRoute = async ({ request }) => {
	const cloudName = getEnv('CLOUDINARY_CLOUD_NAME');
	const apiKey = getEnv('CLOUDINARY_API_KEY');
	const apiSecret = getEnv('CLOUDINARY_API_SECRET');

	if (!cloudName || !apiKey || !apiSecret) {
		console.info('[cloudinary/sign] missing env vars');
		return json(500, { error: 'cloudinary_not_configured' });
	}

	let folder = 'fashionstore/products';
	try {
		const body = await request.json();
		if (body?.folder && typeof body.folder === 'string') {
			folder = body.folder;
		}
	} catch {
		// Use default folder
	}

	const timestamp = Math.floor(Date.now() / 1000);

	// Build the string to sign (params in alphabetical order)
	const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
	const signature = crypto
		.createHash('sha1')
		.update(paramsToSign + apiSecret)
		.digest('hex');

	return json(200, {
		timestamp,
		signature,
		apiKey,
		cloudName,
		folder,
	});
};
