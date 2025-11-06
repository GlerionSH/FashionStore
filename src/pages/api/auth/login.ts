import type { APIRoute } from 'astro';
import { login } from '../../../lib/services/authService';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Leer el body del request
    const contentType = request.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Content-Type debe ser application/json',
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'El correo y la contraseña son requeridos',
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const result = await login({ email, password });

    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: result.message,
          user: result.user,
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || result.message,
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error: any) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Error interno del servidor',
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
