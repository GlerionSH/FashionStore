import type { APIRoute } from 'astro';
import { getContactById, deleteContact, updateContact } from '../../../lib/services/contactService';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'ID de cliente requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener contacto
    const result = await getContactById(id);

    if (!result.success) {
      console.error('Error al obtener cliente:', result.error);
      
      return new Response(
        JSON.stringify({ 
          error: 'Cliente no encontrado',
          details: result.error 
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!result.data) {
      return new Response(
        JSON.stringify({ error: 'Cliente no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        data: result.data
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error en GET /api/customers/[id]:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'ID de cliente requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Eliminar el contacto
    const result = await deleteContact(id);

    if (!result.success) {
      console.error('Error al eliminar cliente:', result.error);
      return new Response(
        JSON.stringify({ 
          error: 'Error al eliminar el cliente',
          details: result.error 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cliente eliminado exitosamente'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error en DELETE /api/customers/[id]:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
