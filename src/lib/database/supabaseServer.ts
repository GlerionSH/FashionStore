import { createClient } from '@supabase/supabase-js';

export const getSupabasePublic = () => {
	const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
	const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
	if (!supabaseUrl || !anonKey) {
		throw new Error('Supabase no está configurado');
	}
	return createClient(supabaseUrl, anonKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
};

export const getSupabaseAdmin = () => {
	const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
	const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!supabaseUrl) {
		throw new Error('Supabase no está configurado');
	}
	if (!serviceRoleKey) {
		throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY');
	}
	return createClient(supabaseUrl, serviceRoleKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
};
