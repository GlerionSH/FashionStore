import type { 
  Cliente, 
  ClienteInsert, 
  ClienteUpdate, 
  ClientesFiltros,
  ClienteConStats,
  PaginatedResponse 
} from '../../types';
import { supabase } from '../database/supabase';

/**
 * Servicio para gestión de clientes
 */
class ClienteService {
  private tabla = 'clientes';

  /**
   * Obtiene todos los clientes con filtros opcionales
   */
  async obtenerTodos(filtros?: ClientesFiltros): Promise<PaginatedResponse<Cliente>> {
    try {
      let query = supabase
        .from(this.tabla)
        .select('*', { count: 'exact' });

      // Aplicar filtros
      if (filtros?.estado) {
        query = query.eq('estado', filtros.estado);
      }

      if (filtros?.busqueda) {
        query = query.or(
          `nombre.ilike.%${filtros.busqueda}%,` +
          `correo_electronico.ilike.%${filtros.busqueda}%,` +
          `empresa.ilike.%${filtros.busqueda}%`
        );
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
      console.error('Error al obtener clientes:', error);
      throw error;
    }
  }

  /**
   * Obtiene un cliente por ID con estadísticas
   */
  async obtenerPorId(id: string): Promise<ClienteConStats | null> {
    try {
      const { data: cliente, error } = await supabase
        .from(this.tabla)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!cliente) return null;

      // Obtener estadísticas adicionales
      const [transacciones, interacciones] = await Promise.all([
        this.obtenerEstadisticasTransacciones(id),
        this.obtenerUltimaInteraccion(id),
      ]);

      return {
        ...cliente,
        ...transacciones,
        ...interacciones,
      };
    } catch (error) {
      console.error('Error al obtener cliente:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo cliente
   */
  async crear(cliente: ClienteInsert): Promise<Cliente> {
    try {
      const { data, error } = await supabase
        .from(this.tabla)
        .insert(cliente)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al crear cliente:', error);
      throw error;
    }
  }

  /**
   * Actualiza un cliente existente
   */
  async actualizar(id: string, cliente: ClienteUpdate): Promise<Cliente> {
    try {
      const { data, error } = await supabase
        .from(this.tabla)
        .update({
          ...cliente,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      throw error;
    }
  }

  /**
   * Elimina un cliente
   */
  async eliminar(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.tabla)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      throw error;
    }
  }

  /**
   * Busca clientes por término
   */
  async buscar(termino: string): Promise<Cliente[]> {
    try {
      const { data, error } = await supabase
        .from(this.tabla)
        .select('*')
        .or(
          `nombre.ilike.%${termino}%,` +
          `correo_electronico.ilike.%${termino}%,` +
          `empresa.ilike.%${termino}%,` +
          `telefono.ilike.%${termino}%`
        )
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al buscar clientes:', error);
      throw error;
    }
  }

  /**
   * Obtiene clientes por estado
   */
  async obtenerPorEstado(estado: string): Promise<Cliente[]> {
    try {
      const { data, error } = await supabase
        .from(this.tabla)
        .select('*')
        .eq('estado', estado)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener clientes por estado:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de transacciones de un cliente
   */
  private async obtenerEstadisticasTransacciones(clienteId: string): Promise<{
    total_transacciones: number;
    total_ingresos: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('transacciones')
        .select('cantidad')
        .eq('cliente_id', clienteId)
        .eq('estado', 'completada');

      if (error) throw error;

      const total_transacciones = data?.length || 0;
      const total_ingresos = data?.reduce((sum: number, t: any) => sum + t.cantidad, 0) || 0;

      return { total_transacciones, total_ingresos };
    } catch (error) {
      console.error('Error al obtener estadísticas de transacciones:', error);
      return { total_transacciones: 0, total_ingresos: 0 };
    }
  }

  /**
   * Obtiene la última interacción de un cliente
   */
  private async obtenerUltimaInteraccion(clienteId: string): Promise<{
    ultima_interaccion?: string;
    numero_interacciones: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('interacciones')
        .select('fecha_creacion')
        .eq('cliente_id', clienteId)
        .order('fecha_creacion', { ascending: false })
        .limit(1);

      if (error) throw error;

      const { count } = await supabase
        .from('interacciones')
        .select('*', { count: 'exact', head: true })
        .eq('cliente_id', clienteId);

      return {
        ultima_interaccion: data?.[0]?.fecha_creacion,
        numero_interacciones: count || 0,
      };
    } catch (error) {
      console.error('Error al obtener última interacción:', error);
      return { numero_interacciones: 0 };
    }
  }
}

export const clienteService = new ClienteService();
