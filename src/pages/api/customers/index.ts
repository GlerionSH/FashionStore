import type { APIRoute } from 'astro';
import { getContacts, searchContacts } from '../../../lib/services/contactService';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    // Obtener parámetros de la query
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const per_page = parseInt(url.searchParams.get('limite') || '50');
    const busqueda = url.searchParams.get('busqueda');
    const estado = url.searchParams.get('estado');
    const contact_type = url.searchParams.get('tipo');

    // Si hay búsqueda, usar searchContacts
    if (busqueda) {
      const result = await searchContacts(busqueda);
      
      if (!result.success) {
        return new Response(
          JSON.stringify({ 
            error: 'Error al buscar clientes',
            details: result.error 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: result.data,
          total: result.data.length,
          page: 1,
          per_page: result.data.length,
          tiene_mas: false,
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Obtener contactos con filtros
    const filters: any = { page, per_page };
    
    // Mapear estados de español a inglés
    if (estado) {
      filters.status = estado === 'activo' ? 'active' : 
                       estado === 'inactivo' ? 'inactive' :
                       estado === 'prospecto' ? 'qualified' :
                       estado === 'lead' ? 'new' : estado;
    }

    if (contact_type) {
      filters.contact_type = contact_type;
    }

    const result = await getContacts(filters);

    if (!result.success) {
      console.error('Error al obtener clientes:', result.error);
      return new Response(
        JSON.stringify({ 
          error: 'Error al obtener clientes',
          details: result.error 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        data: result.data || [],
        total: result.pagination?.total || 0,
        page: result.pagination?.page || 1,
        limite: result.pagination?.per_page || per_page,
        tiene_mas: result.pagination ? result.pagination.page < result.pagination.total_pages : false,
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error en GET /api/customers:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
