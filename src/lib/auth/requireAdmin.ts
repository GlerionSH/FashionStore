import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../env';

export const requireAdmin = async (cookies: any) => {
	const token = cookies?.get?.('sb-access-token')?.value;
	if (!token) {
		return { ok: false as const, status: 401 as const, error: 'unauthorized' as const };
	}

	const supabaseUrl = getEnv('PUBLIC_SUPABASE_URL');
	const anonKey = getEnv('PUBLIC_SUPABASE_ANON_KEY');
	if (!supabaseUrl || !anonKey) {
		return { ok: false as const, status: 500 as const, error: 'supabase_not_configured' as const };
	}

	const sb = createClient(supabaseUrl, anonKey, {
		auth: { persistSession: false, autoRefreshToken: false },
		global: { headers: { Authorization: `Bearer ${token}` } },
	});

	const { data: userData, error: userError } = await sb.auth.getUser();
	if (userError || !userData?.user?.id) {
		return { ok: false as const, status: 401 as const, error: 'unauthorized' as const };
	}

	const userId = userData.user.id;
	const { data: profile, error: profileError } = await (sb as any)
		.from('fs_profiles')
		.select('role')
		.eq('id', userId)
		.maybeSingle();

	if (profileError || !profile || profile.role !== 'admin') {
		return { ok: false as const, status: 403 as const, error: 'forbidden' as const };
	}

	return { ok: true as const, userId };
};
