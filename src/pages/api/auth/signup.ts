import type { APIRoute } from 'astro';
import { signup } from '../../../lib/services/authService';

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
    const { email, password, fullName } = body;

    // Validaciones
    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'El correo, contraseña y nombre son requeridos',
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'La contraseña debe tener al menos 8 caracteres',
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Llamar al servicio de signup
    const result = await signup({ email, password, fullName });

    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: result.message,
          user: result.user,
        }),
        { 
          status: 201,
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
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error: any) {
    console.error('Signup error:', error);
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
