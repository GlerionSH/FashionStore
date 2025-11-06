import type { DashboardStats } from '../../types';
import { clienteService } from './customerService';
import { transaccionService } from './transaccionService';
import { interaccionService } from './interaccionService';
import { rangoMesActual } from '../utils';

/**
 * Servicio para obtener estadísticas del dashboard
 */
class DashboardService {
  /**
   * Obtiene todas las estadísticas del dashboard
   */
  async obtenerEstadisticas(): Promise<DashboardStats> {
    try {
      const [
        statsClientes,
        statsTransacciones,
        interaccionesHoy,
      ] = await Promise.all([
        this.obtenerStatsClientes(),
        transaccionService.obtenerEstadisticas(),
        this.contarInteraccionesHoy(),
      ]);

      return {
        total_clientes: statsClientes.total,
        clientes_activos: statsClientes.activos,
        clientes_nuevos_mes: statsClientes.nuevos_mes,
        total_transacciones: statsTransacciones.total_transacciones,
        ingresos_totales: statsTransacciones.ingresos_totales,
        ingresos_mes_actual: await this.obtenerIngresosMesActual(),
        transacciones_pendientes: statsTransacciones.transacciones_pendientes,
        interacciones_hoy: interaccionesHoy,
      };
    } catch (error) {
      console.error('Error al obtener estadísticas del dashboard:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de clientes
   */
  private async obtenerStatsClientes(): Promise<{
    total: number;
    activos: number;
    nuevos_mes: number;
  }> {
    try {
      const { inicio } = rangoMesActual();

      const [todos, activos, nuevosMes] = await Promise.all([
        clienteService.obtenerTodos({ limite: 1 }),
        clienteService.obtenerPorEstado('activo'),
        clienteService.obtenerTodos({
          limite: 1000,
          ordenar_por: 'fecha_creacion',
          orden: 'desc',
        }),
      ]);

      const nuevosDelMes = nuevosMes.data.filter(
        c => new Date(c.fecha_creacion) >= new Date(inicio)
      );

      return {
        total: todos.total,
        activos: activos.length,
        nuevos_mes: nuevosDelMes.length,
      };
    } catch (error) {
      console.error('Error al obtener stats de clientes:', error);
      return { total: 0, activos: 0, nuevos_mes: 0 };
    }
  }

  /**
   * Obtiene los ingresos del mes actual
   */
  private async obtenerIngresosMesActual(): Promise<number> {
    try {
      const { inicio, fin } = rangoMesActual();
      const resultado = await transaccionService.obtenerIngresosPorPeriodo(
        inicio,
        fin,
        'completada'
      );
      return resultado.total;
    } catch (error) {
      console.error('Error al obtener ingresos del mes:', error);
      return 0;
    }
  }

  /**
   * Cuenta las interacciones de hoy
   */
  private async contarInteraccionesHoy(): Promise<number> {
    try {
      const interacciones = await interaccionService.obtenerDeHoy();
      return interacciones.length;
    } catch (error) {
      console.error('Error al contar interacciones de hoy:', error);
      return 0;
    }
  }

  /**
   * Obtiene el crecimiento de ventas comparado con el mes anterior
   */
  async obtenerCrecimientoVentas(): Promise<number> {
    try {
      const ahora = new Date();
      
      // Mes actual
      const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const finMesActual = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
      
      // Mes anterior
      const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
      const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);

      const [ventasMesActual, ventasMesAnterior] = await Promise.all([
        transaccionService.obtenerIngresosPorPeriodo(
          inicioMesActual.toISOString(),
          finMesActual.toISOString()
        ),
        transaccionService.obtenerIngresosPorPeriodo(
          inicioMesAnterior.toISOString(),
          finMesAnterior.toISOString()
        ),
      ]);

      if (ventasMesAnterior.total === 0) {
        return ventasMesActual.total > 0 ? 100 : 0;
      }

      return ((ventasMesActual.total - ventasMesAnterior.total) / ventasMesAnterior.total) * 100;
    } catch (error) {
      console.error('Error al calcular crecimiento de ventas:', error);
      return 0;
    }
  }
}

export const dashboardService = new DashboardService();
