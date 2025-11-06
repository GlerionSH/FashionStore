// Tipos principales del CRM - Basados en el esquema de Supabase

/**
 * Usuario del sistema (tabla auth.users de Supabase)
 */
export interface User {
  id: string;
  email: string;
  email_confirmed_at?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Cliente (tabla public.clientes)
 */
export interface Cliente {
  id: string;
  usuario_id: string;
  nombre: string;
  correo_electronico: string;
  telefono: string | null;
  empresa: string | null;
  notas: string | null;
  estado: string; // 'activo' | 'inactivo' | 'prospecto' | 'lead'
  fecha_creacion: string;
  fecha_actualizacion: string;
}

/**
 * Tipo para crear un nuevo cliente (sin campos auto-generados)
 */
export type ClienteInsert = Omit<Cliente, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>;

/**
 * Tipo para actualizar un cliente (todos los campos opcionales excepto id)
 */
export type ClienteUpdate = Partial<Omit<Cliente, 'id' | 'usuario_id'>>;

/**
 * Interacción con cliente (tabla public.interacciones)
 */
export interface Interaccion {
  id: string;
  usuario_id: string;
  cliente_id: string;
  tipo: string; // 'llamada' | 'email' | 'reunion' | 'nota' | 'tarea'
  descripcion: string | null;
  fecha_interaccion: string | null;
  fecha_creacion: string;
}

/**
 * Tipo para crear una nueva interacción
 */
export type InteraccionInsert = Omit<Interaccion, 'id' | 'fecha_creacion'>;

/**
 * Tipo para actualizar una interacción
 */
export type InteraccionUpdate = Partial<Omit<Interaccion, 'id' | 'usuario_id' | 'cliente_id'>>;

/**
 * Transacción/Venta (tabla public.transacciones)
 */
export interface Transaccion {
  id: string;
  usuario_id: string;
  cliente_id: string;
  id_intencion_pago_stripe: string | null;
  cantidad: number; // Cantidad en centavos (ej: 10000 = €100.00)
  moneda: string; // 'eur' | 'usd' | 'mxn'
  descripcion: string | null;
  estado: string; // 'pendiente' | 'completada' | 'cancelada' | 'reembolsada'
  fecha_creacion: string;
  fecha_actualizacion: string;
}

/**
 * Tipo para crear una nueva transacción
 */
export type TransaccionInsert = Omit<Transaccion, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>;

/**
 * Tipo para actualizar una transacción
 */
export type TransaccionUpdate = Partial<Omit<Transaccion, 'id' | 'usuario_id' | 'cliente_id'>>;

/**
 * Cliente con información extendida (incluye totales calculados)
 */
export interface ClienteConStats extends Cliente {
  total_transacciones?: number;
  total_ingresos?: number;
  ultima_interaccion?: string;
  numero_interacciones?: number;
}

/**
 * Estadísticas del dashboard
 */
export interface DashboardStats {
  total_clientes: number;
  clientes_activos: number;
  clientes_nuevos_mes: number;
  total_transacciones: number;
  ingresos_totales: number;
  ingresos_mes_actual: number;
  transacciones_pendientes: number;
  interacciones_hoy: number;
}

/**
 * Filtros para consultas de clientes
 */
export interface ClientesFiltros {
  estado?: string;
  busqueda?: string; // Búsqueda en nombre, correo, empresa
  ordenar_por?: 'nombre' | 'fecha_creacion' | 'fecha_actualizacion';
  orden?: 'asc' | 'desc';
  limite?: number;
  offset?: number;
}

/**
 * Filtros para consultas de transacciones
 */
export interface TransaccionesFiltros {
  cliente_id?: string;
  estado?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  moneda?: string;
  ordenar_por?: 'fecha_creacion' | 'cantidad';
  orden?: 'asc' | 'desc';
  limite?: number;
  offset?: number;
}

/**
 * Filtros para consultas de interacciones
 */
export interface InteraccionesFiltros {
  cliente_id?: string;
  tipo?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  ordenar_por?: 'fecha_interaccion' | 'fecha_creacion';
  orden?: 'asc' | 'desc';
  limite?: number;
  offset?: number;
}

/**
 * Respuesta paginada genérica
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limite: number;
  offset: number;
  tiene_mas: boolean;
}

/**
 * Rango de fechas para reportes
 */
export interface RangoFechas {
  inicio: string;
  fin: string;
}

/**
 * Reporte de ventas
 */
export interface ReporteVentas {
  periodo: RangoFechas;
  total_transacciones: number;
  ingresos_totales: number;
  transacciones_por_estado: Record<string, number>;
  ingresos_por_moneda: Record<string, number>;
  clientes_unicos: number;
  ticket_promedio: number;
}
