import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';

export const onRequest = defineMiddleware(async (context, next) => {
  const { request } = context;

  const FORM_CONTENT_TYPES = [
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain',
  ];

  const normalizeOrigin = (value: string | null): string | null => {
    if (!value) return null;
    return value.trim().replace(/\/+$/, '');
  };

  const getForwardedFirst = (value: string | null): string | null => {
    if (!value) return null;
    const first = value.split(',')[0]?.trim();
    return first || null;
  };

  const method = request.method.toUpperCase();
  const contentType = (request.headers.get('content-type') || '').toLowerCase();
  const isFormContent = FORM_CONTENT_TYPES.some((t) => contentType.startsWith(t));
  const isUnsafeMethod =
    method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

  if (isUnsafeMethod && isFormContent) {
    const originHeader = normalizeOrigin(request.headers.get('origin'));

    const xfProto = getForwardedFirst(request.headers.get('x-forwarded-proto'));
    const xfHost = getForwardedFirst(request.headers.get('x-forwarded-host'));

    const url = new URL(request.url);
    const proto = (xfProto || url.protocol.replace(':', '')).trim();
    const hostHeader = request.headers.get('host');
    const host = (xfHost || hostHeader || url.host).trim();

    const expectedOrigin = normalizeOrigin(`${proto}://${host}`);

    let publicSiteOrigin: string | null = null;
    const rawPublicSite = (process.env.PUBLIC_SITE_URL || '').trim();
    if (rawPublicSite) {
      try {
        publicSiteOrigin = normalizeOrigin(new URL(rawPublicSite).origin);
      } catch {
        publicSiteOrigin = normalizeOrigin(rawPublicSite);
      }
    }

    const isAllowed =
      originHeader !== null &&
      (originHeader === expectedOrigin ||
        (publicSiteOrigin !== null && originHeader === publicSiteOrigin));

    if (!isAllowed) {
      console.warn('[security] blocked cross-site form submission', {
        originHeader,
        expectedOrigin,
        publicSiteOrigin,
        host,
        x_forwarded_host: xfHost,
        x_forwarded_proto: xfProto,
        url: request.url,
      });

      return new Response(`Cross-site ${method} form submissions are forbidden`, {
        status: 403,
      });
    }
  }

  const currentPath = new URL(context.request.url).pathname;

  if (currentPath.startsWith('/api/auth/')) {
    return next();
  }

  if (currentPath === '/admin-fs/login' || currentPath === '/admin-fs/login/') {
    return next();
  }

  if (
    currentPath === '/' ||
    currentPath.startsWith('/productos') ||
    currentPath.startsWith('/categoria') ||
    currentPath === '/carrito' ||
    currentPath === '/carrito/'
  ) {
    return next();
  }

  // Store auth routes are public
  if (currentPath.startsWith('/auth/')) {
    return next();
  }

  
	// CRM landing and CRM auth routes are public
	if (currentPath === '/crm' || currentPath === '/crm/' || currentPath.startsWith('/crm/auth/')) {
		return next();
	}

	if (currentPath.startsWith('/admin-fs')) {
		const token = context.cookies.get('sb-access-token')?.value;
		if (!token) {
			return context.redirect('/admin-fs/login');
		}

		const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
		const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
		if (!supabaseUrl || !anonKey) {
			return new Response('Supabase no está configurado', { status: 500 });
		}

		const sb = createClient(supabaseUrl, anonKey, {
			auth: { persistSession: false, autoRefreshToken: false },
			global: { headers: { Authorization: `Bearer ${token}` } },
		});

		const { data, error } = await sb.auth.getUser();
		if (error || !data.user) {
			context.cookies.delete('sb-access-token', { path: '/' });
			context.cookies.delete('sb-refresh-token', { path: '/' });
			context.cookies.delete('sb-user-id', { path: '/' });
			return context.redirect('/admin-fs/login');
		}

		const { data: profile, error: profileError } = await (sb as any)
			.from('fs_profiles')
			.select('role')
			.eq('id', data.user.id)
			.maybeSingle();

		if (profileError || !profile || profile.role !== 'admin') {
			context.cookies.delete('sb-access-token', { path: '/' });
			context.cookies.delete('sb-refresh-token', { path: '/' });
			context.cookies.delete('sb-user-id', { path: '/' });
			return context.redirect('/admin-fs/login');
		}

		return next();
	}

	// Store protected routes
	const isStoreProtected = currentPath === '/cuenta' || currentPath === '/cuenta/' || currentPath.startsWith('/cuenta/');
	if (isStoreProtected) {
		const token = context.cookies.get('sb-access-token')?.value;
		if (!token) {
			return context.redirect('/auth/login');
		}

		const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
		const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
		if (!supabaseUrl || !anonKey) {
			return new Response('Supabase no está configurado', { status: 500 });
		}

		const sb = createClient(supabaseUrl, anonKey, {
			auth: { persistSession: false, autoRefreshToken: false },
			global: { headers: { Authorization: `Bearer ${token}` } },
		});

		const { data, error } = await sb.auth.getUser();
		if (error || !data.user) {
			context.cookies.delete('sb-access-token', { path: '/' });
			context.cookies.delete('sb-refresh-token', { path: '/' });
			context.cookies.delete('sb-user-id', { path: '/' });
			return context.redirect('/auth/login');
		}

		return next();
	}

  const protectedRoutes = ['/admin', '/dashboard', '/customers', '/products', '/sales', '/reports'];
  const isProtectedRoute = protectedRoutes.some((route) => currentPath.startsWith(route));

  if (!isProtectedRoute) {
    return next();
  }

  const token = context.cookies.get('sb-access-token')?.value;
  if (!token) {
    return context.redirect('/crm/auth/login');
  }

  return next();
});
