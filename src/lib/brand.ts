import { getEnv } from './env';
import { createRequire } from 'module';

export type BrandConfig = {
	name: string;
	logoUrl?: string;
};

const safeTrim = (v: string | undefined | null) => {
	const s = (v ?? '').trim();
	return s.length ? s : undefined;
};

const isRemoteUrl = (url: string) => /^https?:\/\//i.test(url);

const publicFileExists = (publicPath: string) => {
	try {
		const require = createRequire(import.meta.url);
		const path = require('path');
		const fs = require('fs');
		const normalized = publicPath.startsWith('/') ? publicPath.slice(1) : publicPath;
		const abs = path.resolve(process.cwd(), 'public', normalized);
		return fs.existsSync(abs);
	} catch {
		return false;
	}
};

export const getBrand = (): BrandConfig => {
	const name = safeTrim(getEnv('PUBLIC_BRAND_NAME')) ?? 'FASHION STORE';

	const envLogo = safeTrim(getEnv('PUBLIC_BRAND_LOGO_URL'));
	if (envLogo) {
		return { name, logoUrl: envLogo };
	}

	const fallbackLogo = '/logo.png';
	if (publicFileExists(fallbackLogo)) {
		return { name, logoUrl: fallbackLogo };
	}

	return { name };
};

export const resolveHomeImage = (envName: string, fallbackPublicPath: string): string | null => {
	const envUrl = safeTrim(getEnv(envName));
	if (envUrl) return envUrl;

	const fallback = safeTrim(fallbackPublicPath);
	if (!fallback) return null;
	if (isRemoteUrl(fallback)) return fallback;
	return publicFileExists(fallback) ? fallback : null;
};
