import { supabase } from '../database/supabase';
import type { Opportunity, CreateOpportunityDTO } from '../../types/crm';

/**
 * Obtener todas las oportunidades
 */
export async function getOpportunities(filters?: {
  status?: string;
  stage_id?: string;
  pipeline_id?: string;
  assigned_to?: string;
  contact_id?: string;
}) {
  try {
    let query = supabase
      .from('opportunities')
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
        pipeline_stages (
          id,
          name,
          color,
          probability
        )
      `
      )
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (filters) {
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.stage_id) query = query.eq('stage_id', filters.stage_id);
      if (filters.pipeline_id) query = query.eq('pipeline_id', filters.pipeline_id);
      if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
      if (filters.contact_id) query = query.eq('contact_id', filters.contact_id);
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
 * Obtener una oportunidad por ID
 */
export async function getOpportunityById(id: string) {
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select(
        `
        *,
        contacts (
          id,
          first_name,
          last_name,
          email,
          company_name,
          phone
        ),
        pipeline_stages (
          id,
          name,
          color,
          probability,
          pipelines (
            id,
            name
          )
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
 * Crear una nueva oportunidad
 */
export async function createOpportunity(opportunityData: CreateOpportunityDTO) {
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

    const newOpportunity = {
      ...opportunityData,
      user_id: user.id,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('opportunities')
      .insert([newOpportunity])
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
      message: 'Oportunidad creada exitosamente',
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
 * Actualizar una oportunidad
 */
export async function updateOpportunity(
  id: string,
  opportunityData: Partial<CreateOpportunityDTO>
) {
  try {
    const updateData = {
      ...opportunityData,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('opportunities')
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
      message: 'Oportunidad actualizada exitosamente',
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
 * Cambiar la etapa de una oportunidad
 */
export async function moveOpportunityToStage(opportunityId: string, stageId: string) {
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .update({
        stage_id: stageId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', opportunityId)
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
      message: 'Oportunidad movida a nueva etapa',
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
 * Marcar oportunidad como ganada
 */
export async function markOpportunityAsWon(opportunityId: string) {
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .update({
        status: 'won',
        actual_close_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', opportunityId)
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
      message: 'Oportunidad marcada como ganada',
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
 * Marcar oportunidad como perdida
 */
export async function markOpportunityAsLost(opportunityId: string, reason?: string) {
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .update({
        status: 'lost',
        lost_reason: reason,
        actual_close_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', opportunityId)
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
      message: 'Oportunidad marcada como perdida',
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
 * Eliminar una oportunidad
 */
export async function deleteOpportunity(id: string) {
  try {
    const { error } = await supabase.from('opportunities').delete().eq('id', id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Oportunidad eliminada exitosamente',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
    };
  }
}

/**
 * Obtener métricas de oportunidades
 */
export async function getOpportunityMetrics() {
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

    // Total de oportunidades abiertas
    const { data: openOpportunities } = await supabase
      .from('opportunities')
      .select('value')
      .eq('user_id', user.id)
      .eq('status', 'open');

    // Oportunidades ganadas
    const { data: wonOpportunities } = await supabase
      .from('opportunities')
      .select('value')
      .eq('user_id', user.id)
      .eq('status', 'won');

    // Oportunidades perdidas
    const { data: lostOpportunities } = await supabase
      .from('opportunities')
      .select('value')
      .eq('user_id', user.id)
      .eq('status', 'lost');

    const totalOpen = openOpportunities?.reduce((sum, opp) => sum + Number(opp.value), 0) || 0;
    const totalWon = wonOpportunities?.reduce((sum, opp) => sum + Number(opp.value), 0) || 0;
    const totalLost = lostOpportunities?.reduce((sum, opp) => sum + Number(opp.value), 0) || 0;

    const wonCount = wonOpportunities?.length || 0;
    const lostCount = lostOpportunities?.length || 0;
    const winRate = wonCount + lostCount > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;

    return {
      success: true,
      data: {
        totalOpenValue: totalOpen,
        totalWonValue: totalWon,
        totalLostValue: totalLost,
        openCount: openOpportunities?.length || 0,
        wonCount,
        lostCount,
        winRate: Math.round(winRate * 100) / 100,
        averageDealSize: wonCount > 0 ? totalWon / wonCount : 0,
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

/**
 * Obtener oportunidades por etapa (para el board Kanban)
 */
export async function getOpportunitiesByStage(pipelineId: string) {
  try {
    // Primero obtener las etapas del pipeline
    const { data: stages, error: stagesError } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('order_index', { ascending: true });

    if (stagesError) {
      return {
        success: false,
        error: stagesError.message,
        data: [],
      };
    }

    // Luego obtener las oportunidades para cada etapa
    const stagesWithOpportunities = await Promise.all(
      (stages || []).map(async (stage) => {
        const { data: opportunities } = await supabase
          .from('opportunities')
          .select(
            `
            *,
            contacts (
              id,
              first_name,
              last_name,
              company_name
            )
          `
          )
          .eq('stage_id', stage.id)
          .eq('status', 'open')
          .order('created_at', { ascending: false });

        return {
          ...stage,
          opportunities: opportunities || [],
          totalValue: opportunities?.reduce((sum, opp) => sum + Number(opp.value), 0) || 0,
        };
      })
    );

    return {
      success: true,
      data: stagesWithOpportunities,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado',
      data: [],
    };
  }
}
