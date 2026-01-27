/**
 * Helper robusto para leer variables de entorno en Astro (SSR/Node).
 * 1. Intenta import.meta.env[name]
 * 2. Fallback a process.env[name]
 * 3. En desarrollo, carga .env.local con dotenv si no existe la variable
 */

import { createRequire } from 'module';

let dotenvLoaded = false;

function loadDotenvOnce() {
	if (dotenvLoaded) return;
	dotenvLoaded = true;

	const isDev =
		typeof process !== 'undefined' &&
		process.env.NODE_ENV !== 'production';

	if (!isDev) return;

	try {
		// Dynamic import para no romper en edge/browser
		const require = createRequire(import.meta.url);
		const dotenv = require('dotenv');
		const path = require('path');
		const fs = require('fs');

		const envPath = path.resolve(process.cwd(), '.env.local');
		if (fs.existsSync(envPath)) {
			dotenv.config({ path: envPath });
			console.info('[env] loaded .env.local');
		}
	} catch {
		// dotenv no disponible o error de carga - ignorar
	}
}

loadDotenvOnce();

console.info('[env] has BREVO_API_KEY:', Boolean(process.env?.BREVO_API_KEY));

export function getEnv(name: string): string | undefined {
	loadDotenvOnce();
	return (
		(process.env?.[name] as string | undefined) ??
		((import.meta.env as any)?.[name] as string | undefined)
	);
}

export function getEnvRequired(name: string): string {
	const val = getEnv(name);
	if (!val) {
		throw new Error(`Missing required env: ${name}`);
	}
	return val;
}

export function logEnvStatus(names: string[]): Record<string, boolean> {
	const status: Record<string, boolean> = {};
	for (const name of names) {
		status[name] = Boolean(getEnv(name));
	}
	return status;
}
