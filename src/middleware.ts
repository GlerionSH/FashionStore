import { getCurrentSession } from './lib/services/authService';

export async function onRequest(context: any, next: any) {
  // Rutas públicas que no requieren autenticación
  const publicRoutes = [
    '/auth/login',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
  ];

  const currentPath = new URL(context.request.url).pathname;

  // Permitir rutas públicas
  if (publicRoutes.some((route) => currentPath.startsWith(route))) {
    return next();
  }

  // Verificar si es una ruta protegida
  const protectedRoutes = ['/dashboard', '/customers', '/products', '/sales', '/reports'];
  const isProtectedRoute = protectedRoutes.some((route) => currentPath.startsWith(route));

  if (isProtectedRoute) {
    try {
      const session = await getCurrentSession();

      if (!session) {
        // Redirigir a login si no hay sesión
        return context.redirect('/auth/login');
      }
    } catch (error) {
      console.error('Middleware error:', error);
      return context.redirect('/auth/login');
    }
  }

  return next();
}
