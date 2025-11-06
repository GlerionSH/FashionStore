// Funciones utilitarias comunes

import { MONEDAS_INFO } from '../constants';

/**
 * Formatea una cantidad en centavos como moneda
 * @param cantidad - Cantidad en centavos (ej: 10000 = €100.00)
 * @param moneda - Código de moneda ('eur', 'usd', 'mxn')
 */
export function formatearMoneda(cantidad: number, moneda: string = 'eur'): string {
  const info = MONEDAS_INFO[moneda as keyof typeof MONEDAS_INFO];
  if (!info) return `${cantidad / 100}`;

  const cantidadDecimal = cantidad / 100;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: info.codigo,
    minimumFractionDigits: info.decimales,
    maximumFractionDigits: info.decimales,
  }).format(cantidadDecimal);
}

/**
 * Convierte una cantidad en unidades a centavos
 * @param cantidad - Cantidad en unidades (ej: 100.50)
 * @returns Cantidad en centavos (ej: 10050)
 */
export function aCentavos(cantidad: number): number {
  return Math.round(cantidad * 100);
}

/**
 * Convierte una cantidad en centavos a unidades
 * @param centavos - Cantidad en centavos (ej: 10050)
 * @returns Cantidad en unidades (ej: 100.50)
 */
export function aUnidades(centavos: number): number {
  return centavos / 100;
}

/**
 * Formatea una fecha ISO a formato legible
 * @param fecha - Fecha en formato ISO string
 * @param formato - 'corto' | 'largo' | 'con-hora'
 */
export function formatearFecha(
  fecha: string | Date,
  formato: 'corto' | 'largo' | 'con-hora' = 'corto'
): string {
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;

  if (formato === 'corto') {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(fechaObj);
  }

  if (formato === 'largo') {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(fechaObj);
  }

  // con-hora
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(fechaObj);
}

/**
 * Formatea un número de teléfono
 */
export function formatearTelefono(telefono: string): string {
  const limpio = telefono.replace(/\D/g, '');
  
  // Formato para México (10 dígitos): (123) 456-7890
  if (limpio.length === 10) {
    return `(${limpio.slice(0, 3)}) ${limpio.slice(3, 6)}-${limpio.slice(6)}`;
  }
  
  // Formato internacional
  if (limpio.startsWith('52') && limpio.length === 12) {
    return `+52 (${limpio.slice(2, 5)}) ${limpio.slice(5, 8)}-${limpio.slice(8)}`;
  }
  
  return telefono;
}

/**
 * Calcula el porcentaje de crecimiento
 */
export function calcularCrecimiento(actual: number, anterior: number): number {
  if (anterior === 0) return actual > 0 ? 100 : 0;
  return ((actual - anterior) / anterior) * 100;
}

/**
 * Trunca un texto a una longitud específica
 */
export function truncar(texto: string, longitud: number): string {
  if (texto.length <= longitud) return texto;
  return texto.substring(0, longitud) + '...';
}

/**
 * Valida un email
 */
export function esEmailValido(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida un teléfono
 */
export function esTelefonoValido(telefono: string): boolean {
  const telefonoRegex = /^\+?[\d\s-()]+$/;
  const digitos = telefono.replace(/\D/g, '');
  return telefonoRegex.test(telefono) && digitos.length >= 10;
}

/**
 * Capitaliza la primera letra de cada palabra
 */
export function capitalizar(texto: string): string {
  return texto
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Genera un slug a partir de un texto
 */
export function generarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/[^\w\s-]/g, '') // Elimina caracteres especiales
    .replace(/\s+/g, '-') // Reemplaza espacios con guiones
    .replace(/-+/g, '-') // Elimina guiones múltiples
    .trim();
}

/**
 * Debounce function para optimizar búsquedas
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Formatea un número con separadores de miles
 */
export function formatearNumero(numero: number): string {
  return new Intl.NumberFormat('es-ES').format(numero);
}

/**
 * Calcula los días entre dos fechas
 */
export function diasEntre(fecha1: string | Date, fecha2: string | Date): number {
  const date1 = typeof fecha1 === 'string' ? new Date(fecha1) : fecha1;
  const date2 = typeof fecha2 === 'string' ? new Date(fecha2) : fecha2;
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Obtiene el inicio y fin del mes actual
 */
export function rangoMesActual(): { inicio: string; fin: string } {
  const ahora = new Date();
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
  
  return {
    inicio: inicio.toISOString(),
    fin: fin.toISOString(),
  };
}

/**
 * Obtiene el inicio y fin del año actual
 */
export function rangoAñoActual(): { inicio: string; fin: string } {
  const ahora = new Date();
  const inicio = new Date(ahora.getFullYear(), 0, 1);
  const fin = new Date(ahora.getFullYear(), 11, 31, 23, 59, 59);
  
  return {
    inicio: inicio.toISOString(),
    fin: fin.toISOString(),
  };
}

/**
 * Formatea un tiempo relativo (ej: "hace 2 horas")
 */
export function tiempoRelativo(fecha: string | Date): string {
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const ahora = new Date();
  const diffMs = ahora.getTime() - fechaObj.getTime();
  const diffSegundos = Math.floor(diffMs / 1000);
  const diffMinutos = Math.floor(diffSegundos / 60);
  const diffHoras = Math.floor(diffMinutos / 60);
  const diffDias = Math.floor(diffHoras / 24);

  if (diffSegundos < 60) return 'hace unos segundos';
  if (diffMinutos < 60) return `hace ${diffMinutos} minuto${diffMinutos !== 1 ? 's' : ''}`;
  if (diffHoras < 24) return `hace ${diffHoras} hora${diffHoras !== 1 ? 's' : ''}`;
  if (diffDias < 7) return `hace ${diffDias} día${diffDias !== 1 ? 's' : ''}`;
  if (diffDias < 30) {
    const semanas = Math.floor(diffDias / 7);
    return `hace ${semanas} semana${semanas !== 1 ? 's' : ''}`;
  }
  if (diffDias < 365) {
    const meses = Math.floor(diffDias / 30);
    return `hace ${meses} mes${meses !== 1 ? 'es' : ''}`;
  }
  
  const años = Math.floor(diffDias / 365);
  return `hace ${años} año${años !== 1 ? 's' : ''}`;
}
