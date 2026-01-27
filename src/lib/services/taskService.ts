import { supabase } from '../database/supabase';
import type { Task, CreateTaskDTO } from '../../types/crm';

/**
 * Obtener todas las tareas
 */
export async function getTasks(filters?: {
  status?: string;
  priority?: string;
  assigned_to?: string;
  contact_id?: string;
  opportunity_id?: string;
  due_date_from?: string;
  due_date_to?: string;
}) {
  try {
    let query = supabase
      .from('tasks')
      .select(
        `
        *,
        contacts (
          id,
          first_name,
          last_name,
          company_name
        ),
        opportunities (
          id,
          title
        )
      `
      )
      .order('due_date', { ascending: true });

    // Aplicar filtros
    if (filters) {
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.priority) query = query.eq('priority', filters.priority);
      if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
      if (filters.contact_id) query = query.eq('contact_id', filters.contact_id);
      if (filters.opportunity_id) query = query.eq('opportunity_id', filters.opportunity_id);
      if (filters.due_date_from) query = query.gte('due_date', filters.due_date_from);
      if (filters.due_date_to) query = query.lte('due_date', filters.due_date_to);
    }

    const { data, error } = await query;

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
 * Obtener una tarea por ID
 */
export async function getTaskById(id: string) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        contacts (
          id,
          first_name,
          last_name,
          email,
          company_name
        ),
        opportunities (
          id,
          title,
          value
        )
      `
      )
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
 * Crear una nueva tarea
 */
export async function createTask(taskData: CreateTaskDTO) {
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

    const newTask = {
      ...taskData,
      user_id: user.id,
      status: 'pending',
      assigned_to: taskData.assigned_to || user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([newTask])
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
      message: 'Tarea creada exitosamente',
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
 * Actualizar una tarea
 */
export async function updateTask(id: string, taskData: Partial<CreateTaskDTO>) {
  try {
    const updateData = {
      ...taskData,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('tasks')
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
      message: 'Tarea actualizada exitosamente',
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
 * Marcar tarea como completada
 */
export async function completeTask(id: string) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
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
      message: 'Tarea completada',
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
 * Eliminar una tarea
 */
export async function deleteTask(id: string) {
  try {
    const { error } = await supabase.from('tasks').delete().eq('id', id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Tarea eliminada exitosamente',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
    };
  }
}

/**
 * Obtener tareas pendientes
 */
export async function getPendingTasks() {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        contacts (
          first_name,
          last_name,
          company_name
        )
      `
      )
      .eq('status', 'pending')
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
 * Obtener tareas vencidas
 */
export async function getOverdueTasks() {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        contacts (
          first_name,
          last_name,
          company_name
        )
      `
      )
      .eq('status', 'pending')
      .lt('due_date', now)
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
 * Obtener tareas de hoy
 */
export async function getTodayTasks() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        contacts (
          first_name,
          last_name,
          company_name
        )
      `
      )
      .eq('status', 'pending')
      .gte('due_date', today.toISOString())
      .lt('due_date', tomorrow.toISOString())
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
 * Obtener estadísticas de tareas
 */
export async function getTaskStats() {
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

    // Total de tareas
    const { count: totalTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Tareas pendientes
    const { count: pendingTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending');

    // Tareas completadas
    const { count: completedTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed');

    // Tareas vencidas
    const now = new Date().toISOString();
    const { count: overdueTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .lt('due_date', now);

    return {
      success: true,
      data: {
        total: totalTasks || 0,
        pending: pendingTasks || 0,
        completed: completedTasks || 0,
        overdue: overdueTasks || 0,
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
