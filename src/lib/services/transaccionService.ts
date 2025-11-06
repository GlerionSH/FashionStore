import type { 
  Transaccion, 
  TransaccionInsert, 
  TransaccionUpdate,
  TransaccionesFiltros,
  PaginatedResponse 
} from '../../types';
import { supabase } from '../database/supabase';

/**
 * Servicio para gestión de transacciones/ventas
 */
class TransaccionService {
  private tabla = 'transacciones';

  /**
   * Obtiene todas las transacciones con filtros opcionales
   */
  async obtenerTodas(filtros?: TransaccionesFiltros): Promise<PaginatedResponse<Transaccion>> {
    try {
      let query = supabase
        .from(this.tabla)
        .select('*', { count: 'exact' });

      // Aplicar filtros
      if (filtros?.cliente_id) {
        query = query.eq('cliente_id', filtros.cliente_id);
      }

      if (filtros?.estado) {
        query = query.eq('estado', filtros.estado);
      }

      if (filtros?.moneda) {
        query = query.eq('moneda', filtros.moneda);
      }

      if (filtros?.fecha_desde) {
        query = query.gte('fecha_creacion', filtros.fecha_desde);
      }

      if (filtros?.fecha_hasta) {
        query = query.lte('fecha_creacion', filtros.fecha_hasta);
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
      console.error('Error al obtener transacciones:', error);
      throw error;
    }
  }

  /**
   * Obtiene una transacción por ID
   */
  async obtenerPorId(id: string): Promise<Transaccion | null> {
    try {
      const { data, error } = await supabase
        .from(this.tabla)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener transacción:', error);
      throw error;
    }
  }

  /**
   * Crea una nueva transacción
   */
  async crear(transaccion: TransaccionInsert): Promise<Transaccion> {
    try {
      const { data, error } = await supabase
        .from(this.tabla)
        .insert(transaccion)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al crear transacción:', error);
      throw error;
    }
  }

  /**
   * Actualiza una transacción existente
   */
  async actualizar(id: string, transaccion: TransaccionUpdate): Promise<Transaccion> {
    try {
      const { data, error } = await supabase
        .from(this.tabla)
        .update({
          ...transaccion,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al actualizar transacción:', error);
      throw error;
    }
  }

  /**
   * Elimina una transacción
   */
  async eliminar(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.tabla)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error al eliminar transacción:', error);
      throw error;
    }
  }

  /**
   * Obtiene transacciones de un cliente
   */
  async obtenerPorCliente(clienteId: string): Promise<Transaccion[]> {
    try {
      const { data, error } = await supabase
        .from(this.tabla)
        .select('*')
        .eq('cliente_id', clienteId)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener transacciones del cliente:', error);
      throw error;
    }
  }

  /**
   * Obtiene el total de ingresos en un rango de fechas
   */
  async obtenerIngresosPorPeriodo(
    fechaDesde: string, 
    fechaHasta: string,
    estado: string = 'completada'
  ): Promise<{ total: number; por_moneda: Record<string, number> }> {
    try {
      const { data, error } = await supabase
        .from(this.tabla)
        .select('cantidad, moneda')
        .eq('estado', estado)
        .gte('fecha_creacion', fechaDesde)
        .lte('fecha_creacion', fechaHasta);

      if (error) throw error;

      const total = data?.reduce((sum: number, t: any) => sum + t.cantidad, 0) || 0;
      const porMoneda: Record<string, number> = {};

      data?.forEach((t: any) => {
        porMoneda[t.moneda] = (porMoneda[t.moneda] || 0) + t.cantidad;
      });

      return { total, por_moneda: porMoneda };
    } catch (error) {
      console.error('Error al obtener ingresos por período:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de transacciones
   */
  async obtenerEstadisticas(): Promise<{
    total_transacciones: number;
    transacciones_completadas: number;
    transacciones_pendientes: number;
    ingresos_totales: number;
    ticket_promedio: number;
  }> {
    try {
      const { data, error } = await supabase
        .from(this.tabla)
        .select('cantidad, estado');

      if (error) throw error;

      const total_transacciones = data?.length || 0;
      const transacciones_completadas = data?.filter((t: any) => t.estado === 'completada').length || 0;
      const transacciones_pendientes = data?.filter((t: any) => t.estado === 'pendiente').length || 0;
      const ingresos_totales = data
        ?.filter((t: any) => t.estado === 'completada')
        .reduce((sum: number, t: any) => sum + t.cantidad, 0) || 0;
      const ticket_promedio = transacciones_completadas > 0 
        ? ingresos_totales / transacciones_completadas 
        : 0;

      return {
        total_transacciones,
        transacciones_completadas,
        transacciones_pendientes,
        ingresos_totales,
        ticket_promedio,
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  }

  /**
   * Obtiene transacciones recientes
   */
  async obtenerRecientes(limite: number = 5): Promise<Transaccion[]> {
    try {
      const { data, error } = await supabase
        .from(this.tabla)
        .select('*')
        .order('fecha_creacion', { ascending: false })
        .limit(limite);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener transacciones recientes:', error);
      throw error;
    }
  }
}

export const transaccionService = new TransaccionService();
