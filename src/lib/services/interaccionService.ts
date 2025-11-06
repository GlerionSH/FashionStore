import type { 
  Interaccion, 
  InteraccionInsert, 
  InteraccionUpdate,
  InteraccionesFiltros,
  PaginatedResponse 
} from '../../types';
import { supabase } from '../database/supabase';

/**
 * Servicio para gestión de interacciones con clientes
 */
class InteraccionService {
  private tabla = 'interacciones';

  /**
   * Obtiene todas las interacciones con filtros opcionales
   */
  async obtenerTodas(filtros?: InteraccionesFiltros): Promise<PaginatedResponse<Interaccion>> {
    try {
      let query = supabase
        .from(this.tabla)
        .select('*', { count: 'exact' });

      // Aplicar filtros
      if (filtros?.cliente_id) {
        query = query.eq('cliente_id', filtros.cliente_id);
      }

      if (filtros?.tipo) {
        query = query.eq('tipo', filtros.tipo);
      }

      if (filtros?.fecha_desde) {
        query = query.gte('fecha_interaccion', filtros.fecha_desde);
      }

      if (filtros?.fecha_hasta) {
        query = query.lte('fecha_interaccion', filtros.fecha_hasta);
      }

      // Ordenamiento
      const ordenarPor = filtros?.ordenar_por || 'fecha_creacion';
      const orden = filtros?.orden || 'desc';
      query = query.order(ordenarPor, { ascending: orden === 'asc' });

      // Paginación
      const limite = filtros?.limite || 10;
      const offset = filtros?.offset || 0;
      query = query.range(offset, offset + limite - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        limite,
        offset,
        tiene_mas: count ? offset + limite < count : false,
      };
    } catch (error) {
      console.error('Error al obtener interacciones:', error);
      throw error;
    }
  }

  /**
   * Obtiene una interacción por ID
   */
  async obtenerPorId(id: string): Promise<Interaccion | null> {
    try {
      const { data, error } = await supabase
        .from(this.tabla)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener interacción:', error);
      throw error;
    }
  }

  /**
   * Crea una nueva interacción
   */
  async crear(interaccion: InteraccionInsert): Promise<Interaccion> {
    try {
      const { data, error } = await supabase
        .from(this.tabla)
        .insert(interaccion)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al crear interacción:', error);
      throw error;
    }
  }

  /**
   * Actualiza una interacción existente
   */
  async actualizar(id: string, interaccion: InteraccionUpdate): Promise<Interaccion> {
    try {
      const { data, error } = await supabase
        .from(this.tabla)
        .update(interaccion)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al actualizar interacción:', error);
      throw error;
    }
  }

  /**
   * Elimina una interacción
   */
  async eliminar(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.tabla)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error al eliminar interacción:', error);
      throw error;
    }
  }

  /**
   * Obtiene interacciones de un cliente
   */
  async obtenerPorCliente(clienteId: string, limite?: number): Promise<Interaccion[]> {
    try {
      let query = supabase
        .from(this.tabla)
        .select('*')
        .eq('cliente_id', clienteId)
        .order('fecha_interaccion', { ascending: false });

      if (limite) {
        query = query.limit(limite);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener interacciones del cliente:', error);
      throw error;
    }
  }

  /**
   * Obtiene interacciones recientes
   */
  async obtenerRecientes(limite: number = 10): Promise<Interaccion[]> {
    try {
      const { data, error } = await supabase
        .from(this.tabla)
        .select('*')
        .order('fecha_creacion', { ascending: false })
        .limit(limite);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener interacciones recientes:', error);
      throw error;
    }
  }

  /**
   * Obtiene interacciones de hoy
   */
  async obtenerDeHoy(): Promise<Interaccion[]> {
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const mañana = new Date(hoy);
      mañana.setDate(mañana.getDate() + 1);

      const { data, error } = await supabase
        .from(this.tabla)
        .select('*')
        .gte('fecha_creacion', hoy.toISOString())
        .lt('fecha_creacion', mañana.toISOString())
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener interacciones de hoy:', error);
      throw error;
    }
  }

  /**
   * Obtiene el número de interacciones por tipo
   */
  async contarPorTipo(): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from(this.tabla)
        .select('tipo');

      if (error) throw error;

      const conteo: Record<string, number> = {};
      data?.forEach((interaccion: any) => {
        conteo[interaccion.tipo] = (conteo[interaccion.tipo] || 0) + 1;
      });

      return conteo;
    } catch (error) {
      console.error('Error al contar interacciones por tipo:', error);
      throw error;
    }
  }
}

export const interaccionService = new InteraccionService();
