// Tipos generados automáticamente desde el esquema de Supabase
// Estos tipos coinciden con las tablas de tu base de datos

export interface Database {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string;
          usuario_id: string;
          nombre: string;
          correo_electronico: string;
          telefono: string | null;
          empresa: string | null;
          notas: string | null;
          estado: string;
          fecha_creacion: string;
          fecha_actualizacion: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          nombre: string;
          correo_electronico: string;
          telefono?: string | null;
          empresa?: string | null;
          notas?: string | null;
          estado?: string;
          fecha_creacion?: string;
          fecha_actualizacion?: string;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          nombre?: string;
          correo_electronico?: string;
          telefono?: string | null;
          empresa?: string | null;
          notas?: string | null;
          estado?: string;
          fecha_creacion?: string;
          fecha_actualizacion?: string;
        };
      };
      interacciones: {
        Row: {
          id: string;
          usuario_id: string;
          cliente_id: string;
          tipo: string;
          descripcion: string | null;
          fecha_interaccion: string | null;
          fecha_creacion: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          cliente_id: string;
          tipo: string;
          descripcion?: string | null;
          fecha_interaccion?: string | null;
          fecha_creacion?: string;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          cliente_id?: string;
          tipo?: string;
          descripcion?: string | null;
          fecha_interaccion?: string | null;
          fecha_creacion?: string;
        };
      };
      transacciones: {
        Row: {
          id: string;
          usuario_id: string;
          cliente_id: string;
          id_intencion_pago_stripe: string | null;
          cantidad: number;
          moneda: string;
          descripcion: string | null;
          estado: string;
          fecha_creacion: string;
          fecha_actualizacion: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          cliente_id: string;
          id_intencion_pago_stripe?: string | null;
          cantidad: number;
          moneda?: string;
          descripcion?: string | null;
          estado?: string;
          fecha_creacion?: string;
          fecha_actualizacion?: string;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          cliente_id?: string;
          id_intencion_pago_stripe?: string | null;
          cantidad?: number;
          moneda?: string;
          descripcion?: string | null;
          estado?: string;
          fecha_creacion?: string;
          fecha_actualizacion?: string;
        };
      };
    };
  };
}
