import type { APIRoute } from 'astro';
import { createContact, searchContacts } from '../../../lib/services/contactService';
import type { CreateContactDTO } from '../../../types/crm';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Validar Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({ error: 'Content-Type debe ser application/json' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener datos del cuerpo de la petición
    const body = await request.json();
    const { nombre, correo_electronico, telefono, empresa, estado, notas } = body;

    // Validaciones básicas
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'El nombre es requerido y debe tener al menos 2 caracteres' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validar email si se proporciona
    if (correo_electronico) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo_electronico)) {
        return new Response(
          JSON.stringify({ error: 'El correo electrónico no es válido' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Verificar si ya existe un contacto con ese email
      const searchResult = await searchContacts(correo_electronico.trim());
      if (searchResult.success && searchResult.data.length > 0) {
        const emailExists = searchResult.data.some(
          (c: any) => c.email?.toLowerCase() === correo_electronico.trim().toLowerCase()
        );
        if (emailExists) {
          return new Response(
            JSON.stringify({ error: 'Ya existe un contacto con este correo electrónico' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Mapear campos del formulario español al schema inglés
    const contactData: CreateContactDTO = {
      first_name: nombre.trim(),
      email: correo_electronico?.trim().toLowerCase() || undefined,
      phone: telefono?.trim() || undefined,
      company_name: empresa?.trim() || undefined,
      notes: notas?.trim() || undefined,
      contact_type: 'customer', // Por defecto es cliente
      status: estado === 'activo' ? 'active' : 
              estado === 'inactivo' ? 'inactive' :
              estado === 'prospecto' ? 'qualified' :
              estado === 'lead' ? 'new' : 'active',
      source: 'manual', // Agregado manualmente
    };

    // Crear el contacto usando el servicio
    const result = await createContact(contactData);

    if (!result.success) {
      console.error('Error al crear contacto:', result.error);
      return new Response(
        JSON.stringify({ 
          error: 'Error al crear el cliente en la base de datos',
          details: result.error 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cliente creado exitosamente',
        data: result.data
      }),
      { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error en POST /api/customers/crear:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
