import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database/types';

declare global {
	// eslint-disable-next-line no-var
	var __supabaseBrowserClient: SupabaseClient<Database> | undefined;
}

export const getSupabaseBrowser = () => {
	if (typeof window === 'undefined') {
		throw new Error('getSupabaseBrowser must be called in the browser');
	}

	if (globalThis.__supabaseBrowserClient) {
		return globalThis.__supabaseBrowserClient;
	}

	const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
	const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
	if (!supabaseUrl || !anonKey) {
		throw new Error('Supabase no está configurado');
	}

	globalThis.__supabaseBrowserClient = createClient<Database>(supabaseUrl, anonKey, {
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: false,
		},
	});

	return globalThis.__supabaseBrowserClient;
};
