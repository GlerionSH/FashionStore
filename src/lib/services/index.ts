// Exportación centralizada de todos los servicios

// Servicios CRM principales
export * from './authService';
export * from './contactService';
export * from './tagService';
export * from './opportunityService';
export * from './taskService';

// Servicios legacy
export { clienteService } from './customerService';
export { transaccionService } from './transaccionService';
export { interaccionService } from './interaccionService';
export { dashboardService } from './dashboardService';
