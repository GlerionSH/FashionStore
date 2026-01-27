import { supabase } from '../database/supabase';
import type { Contact, CreateContactDTO, UpdateContactDTO } from '../../types/crm';

/**
 * Obtener todos los contactos del usuario actual
 */
export async function getContacts(filters?: {
  contact_type?: string;
  status?: string;
  assigned_to?: string;
  tag_id?: string;
  search?: string;
  page?: number;
  per_page?: number;
}) {
  try {
    const {
      contact_type,
      status,
      assigned_to,
      tag_id,
      search,
      page = 1,
      per_page = 50,
    } = filters || {};

    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (contact_type) {
      query = query.eq('contact_type', contact_type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to);
    }

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`
      );
    }

    // Paginación
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching contacts:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        pagination: null,
      };
    }

    return {
      success: true,
      data: data || [],
      pagination: {
        total: count || 0,
        page,
        per_page,
        total_pages: Math.ceil((count || 0) / per_page),
      },
    };
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return {
      success: false,
      error: err.message || 'Error inesperado',
      data: [],
      pagination: null,
    };
  }
}

/**
 * Obtener un contacto por ID
 */
export async function getContactById(id: string) {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
      data: null,
    };
  }
}

/**
 * Crear un nuevo contacto
 */
export async function createContact(contactData: CreateContactDTO) {
  try {
    // Obtener el usuario actual
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
        data: null,
      };
    }

    const newContact = {
      ...contactData,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('contacts')
      .insert([newContact])
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }

    return {
      success: true,
      message: 'Contacto creado exitosamente',
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
      data: null,
    };
  }
}

/**
 * Actualizar un contacto existente
 */
export async function updateContact(id: string, contactData: Partial<CreateContactDTO>) {
  try {
    const updateData = {
      ...contactData,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }

    return {
      success: true,
      message: 'Contacto actualizado exitosamente',
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
      data: null,
    };
  }
}

/**
 * Eliminar un contacto
 */
export async function deleteContact(id: string) {
  try {
    const { error } = await supabase.from('contacts').delete().eq('id', id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Contacto eliminado exitosamente',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
    };
  }
}

/**
 * Buscar contactos
 */
export async function searchContacts(query: string) {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .or(
        `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,company_name.ilike.%${query}%,phone.ilike.%${query}%`
      )
      .limit(20);

    if (error) {
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
      data: [],
    };
  }
}

/**
 * Obtener contactos con sus tags
 */
export async function getContactsWithTags() {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select(
        `
        *,
        contact_tags (
          tag_id,
          tags (
            id,
            name,
            color
          )
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
      data: [],
    };
  }
}

/**
 * Obtener el historial de interacciones de un contacto
 */
export async function getContactInteractions(contactId: string) {
  try {
    const { data, error } = await supabase
      .from('interactions')
      .select('*')
      .eq('contact_id', contactId)
      .order('interaction_date', { ascending: false });

    if (error) {
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
      data: [],
    };
  }
}

/**
 * Obtener las oportunidades de un contacto
 */
export async function getContactOpportunities(contactId: string) {
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
      data: [],
    };
  }
}

/**
 * Obtener las tareas de un contacto
 */
export async function getContactTasks(contactId: string) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('contact_id', contactId)
      .order('due_date', { ascending: true });

    if (error) {
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
      data: [],
    };
  }
}

/**
 * Actualizar el score de un contacto
 */
export async function updateContactScore(contactId: string, score: number) {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .update({ score, updated_at: new Date().toISOString() })
      .eq('id', contactId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }

    return {
      success: true,
      message: 'Score actualizado',
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
      data: null,
    };
  }
}

/**
 * Actualizar la fecha de último contacto
 */
export async function updateLastContactDate(contactId: string) {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .update({
        last_contact_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
      data: null,
    };
  }
}

/**
 * Importar contactos desde CSV
 */
export async function importContacts(contacts: CreateContactDTO[]) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
        imported: 0,
      };
    }

    const contactsWithUserId = contacts.map((contact) => ({
      ...contact,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('contacts')
      .insert(contactsWithUserId)
      .select();

    if (error) {
      return {
        success: false,
        error: error.message,
        imported: 0,
      };
    }

    return {
      success: true,
      message: `${data.length} contactos importados exitosamente`,
      imported: data.length,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
      imported: 0,
    };
  }
}

/**
 * Obtener estadísticas de contactos
 */
export async function getContactStats() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
        data: null,
      };
    }

    // Total de contactos
    const { count: totalContacts } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Contactos por tipo
    const { data: byType } = await supabase
      .from('contacts')
      .select('contact_type')
      .eq('user_id', user.id);

    // Contactos por estado
    const { data: byStatus } = await supabase
      .from('contacts')
      .select('status')
      .eq('user_id', user.id);

    // Contactos nuevos este mes
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: newThisMonth } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString());

    return {
      success: true,
      data: {
        total: totalContacts || 0,
        newThisMonth: newThisMonth || 0,
        byType: byType || [],
        byStatus: byStatus || [],
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
      data: null,
    };
  }
}
