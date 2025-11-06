import type { APIRoute } from 'astro';
import { logout } from '../../../lib/services/authService';

export const prerender = false;

export const POST: APIRoute = async () => {
  try {
    const result = await logout();

    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: result.message,
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
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error: any) {
    console.error('Logout error:', error);
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
