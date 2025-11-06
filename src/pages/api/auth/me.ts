import type { APIRoute } from 'astro';
import { getCurrentUser } from '../../../lib/services/authService';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const user = await getCurrentUser();

    if (user) {
      return new Response(
        JSON.stringify({
          success: true,
          user,
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
          error: 'No hay usuario autenticado',
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error: any) {
    console.error('Get user error:', error);
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
