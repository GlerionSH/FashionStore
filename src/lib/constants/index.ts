// Constantes y configuración del CRM

export const APP_NAME = 'CRM Ventas';
export const APP_VERSION = '1.0.0';

// Estados de clientes
export const ESTADO_CLIENTE = {
  ACTIVO: 'activo',
  INACTIVO: 'inactivo',
  PROSPECTO: 'prospecto',
  LEAD: 'lead',
} as const;

export const ESTADO_CLIENTE_LABELS = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  prospecto: 'Prospecto',
  lead: 'Lead',
};

export const ESTADO_CLIENTE_COLORES = {
  activo: '#10b981',    // verde
  inactivo: '#6b7280',  // gris
  prospecto: '#3b82f6', // azul
  lead: '#f59e0b',      // naranja
};

// Estados de transacciones
export const ESTADO_TRANSACCION = {
  PENDIENTE: 'pendiente',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada',
  REEMBOLSADA: 'reembolsada',
} as const;

export const ESTADO_TRANSACCION_LABELS = {
  pendiente: 'Pendiente',
  completada: 'Completada',
  cancelada: 'Cancelada',
  reembolsada: 'Reembolsada',
};

export const ESTADO_TRANSACCION_COLORES = {
  pendiente: '#f59e0b',    // naranja
  completada: '#10b981',   // verde
  cancelada: '#ef4444',    // rojo
  reembolsada: '#8b5cf6',  // morado
};

// Tipos de interacciones
export const TIPO_INTERACCION = {
  LLAMADA: 'llamada',
  EMAIL: 'email',
  REUNION: 'reunion',
  NOTA: 'nota',
  TAREA: 'tarea',
} as const;

export const TIPO_INTERACCION_LABELS = {
  llamada: 'Llamada',
  email: 'Email',
  reunion: 'Reunión',
  nota: 'Nota',
  tarea: 'Tarea',
};

export const TIPO_INTERACCION_ICONOS = {
  llamada: '📞',
  email: '✉️',
  reunion: '🤝',
  nota: '📝',
  tarea: '✅',
};

// Monedas soportadas
export const MONEDAS = {
  EUR: 'eur',
  USD: 'usd',
  MXN: 'mxn',
} as const;

export const MONEDAS_INFO = {
  eur: {
    codigo: 'EUR',
    simbolo: '€',
    nombre: 'Euro',
    decimales: 2,
  },
  usd: {
    codigo: 'USD',
    simbolo: '$',
    nombre: 'Dólar estadounidense',
    decimales: 2,
  },
  mxn: {
    codigo: 'MXN',
    simbolo: '$',
    nombre: 'Peso mexicano',
    decimales: 2,
  },
};

// Configuración de paginación
export const PAGINACION = {
  LIMITE_DEFAULT: 10,
  LIMITE_OPCIONES: [10, 25, 50, 100],
  LIMITE_MAXIMO: 100,
};

// Rutas de navegación
export const RUTAS = {
  INICIO: '/',
  DASHBOARD: '/dashboard',
  CLIENTES: '/customers',
  CLIENTES_NUEVO: '/customers/new',
  CLIENTES_DETALLE: (id: string) => `/customers/${id}`,
  TRANSACCIONES: '/sales',
  TRANSACCIONES_NUEVA: '/sales/new',
  TRANSACCIONES_DETALLE: (id: string) => `/sales/${id}`,
  REPORTES: '/reports',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    RECUPERAR_PASSWORD: '/auth/forgot-password',
  },
  API: {
    CLIENTES: '/api/clientes',
    TRANSACCIONES: '/api/transacciones',
    INTERACCIONES: '/api/interacciones',
    STATS: '/api/stats',
  },
} as const;

// Configuración de fechas
export const FORMATO_FECHA = {
  CORTO: 'DD/MM/YYYY',
  LARGO: 'DD de MMMM de YYYY',
  CON_HORA: 'DD/MM/YYYY HH:mm',
  ISO: 'YYYY-MM-DD',
};

// Validaciones
export const VALIDACIONES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  TELEFONO_REGEX: /^\+?[\d\s-()]+$/,
  TELEFONO_MIN_DIGITOS: 10,
  NOMBRE_MIN_LENGTH: 2,
  NOMBRE_MAX_LENGTH: 100,
  NOTAS_MAX_LENGTH: 1000,
  DESCRIPCION_MAX_LENGTH: 500,
};

// Mensajes de error comunes
export const MENSAJES_ERROR = {
  CAMPO_REQUERIDO: 'Este campo es requerido',
  EMAIL_INVALIDO: 'El correo electrónico no es válido',
  TELEFONO_INVALIDO: 'El número de teléfono no es válido',
  CANTIDAD_MINIMA: 'La cantidad debe ser mayor a 0',
  ERROR_SERVIDOR: 'Error en el servidor. Por favor, intenta de nuevo.',
  ERROR_RED: 'Error de conexión. Verifica tu internet.',
  NO_AUTORIZADO: 'No tienes permisos para esta acción',
  SESION_EXPIRADA: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
};

// Mensajes de éxito
export const MENSAJES_EXITO = {
  CLIENTE_CREADO: 'Cliente creado exitosamente',
  CLIENTE_ACTUALIZADO: 'Cliente actualizado exitosamente',
  CLIENTE_ELIMINADO: 'Cliente eliminado exitosamente',
  TRANSACCION_CREADA: 'Transacción creada exitosamente',
  TRANSACCION_ACTUALIZADA: 'Transacción actualizada exitosamente',
  INTERACCION_CREADA: 'Interacción registrada exitosamente',
  CAMBIOS_GUARDADOS: 'Cambios guardados exitosamente',
};
