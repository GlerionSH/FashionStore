import { supabase } from '../database/supabase';
import type { Tag } from '../../types/crm';

/**
 * Obtener todos los tags del usuario
 */
export async function getTags() {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true });

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
 * Crear un nuevo tag
 */
export async function createTag(name: string, color: string = '#6366f1') {
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

    const { data, error } = await supabase
      .from('tags')
      .insert([
        {
          user_id: user.id,
          name,
          color,
        },
      ])
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
      message: 'Tag creado exitosamente',
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
 * Actualizar un tag
 */
export async function updateTag(id: string, name: string, color: string) {
  try {
    const { data, error } = await supabase
      .from('tags')
      .update({ name, color })
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
      message: 'Tag actualizado exitosamente',
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
 * Eliminar un tag
 */
export async function deleteTag(id: string) {
  try {
    const { error } = await supabase.from('tags').delete().eq('id', id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Tag eliminado exitosamente',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
    };
  }
}

/**
 * Asignar un tag a un contacto
 */
export async function addTagToContact(contactId: string, tagId: string) {
  try {
    const { data, error } = await supabase
      .from('contact_tags')
      .insert([
        {
          contact_id: contactId,
          tag_id: tagId,
        },
      ])
      .select();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Tag asignado al contacto',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
    };
  }
}

/**
 * Remover un tag de un contacto
 */
export async function removeTagFromContact(contactId: string, tagId: string) {
  try {
    const { error } = await supabase
      .from('contact_tags')
      .delete()
      .eq('contact_id', contactId)
      .eq('tag_id', tagId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Tag removido del contacto',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
    };
  }
}

/**
 * Obtener todos los tags de un contacto
 */
export async function getContactTags(contactId: string) {
  try {
    const { data, error } = await supabase
      .from('contact_tags')
      .select(
        `
        tag_id,
        tags (
          id,
          name,
          color
        )
      `
      )
      .eq('contact_id', contactId);

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
 * Obtener contactos por tag
 */
export async function getContactsByTag(tagId: string) {
  try {
    const { data, error } = await supabase
      .from('contact_tags')
      .select(
        `
        contact_id,
        contacts (
          *
        )
      `
      )
      .eq('tag_id', tagId);

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
