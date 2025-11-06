# Estructura del Proyecto CRM

Este documento describe la organización de carpetas y archivos del proyecto CRM.

## 📁 Estructura de Carpetas

### `/src/components`
Componentes reutilizables de la aplicación organizados por módulo:

- **`/ui`** - Componentes de interfaz genéricos (botones, inputs, modales, tablas)
- **`/dashboard`** - Componentes específicos del dashboard (gráficas, tarjetas de estadísticas)
- **`/customers`** - Componentes para gestión de clientes (lista, formulario, tarjeta)
- **`/sales`** - Componentes para gestión de ventas (lista, formulario, items)
- **`/products`** - Componentes para gestión de productos (catálogo, tarjeta, formulario)
- **`/reports`** - Componentes para reportes (gráficas, tablas, filtros)
- **`/auth`** - Componentes de autenticación (login, registro, recuperación)

### `/src/layouts`
Plantillas de diseño para diferentes páginas:
- `Layout.astro` - Layout principal de la aplicación
- `DashboardLayout.astro` - Layout específico para el dashboard
- `AuthLayout.astro` - Layout para páginas de autenticación

### `/src/pages`
Páginas de la aplicación (routing automático de Astro):

- **`/dashboard`** - Panel principal con estadísticas y resúmenes
- **`/customers`** - Gestión de clientes (lista, detalle, crear/editar)
- **`/sales`** - Gestión de ventas (lista, detalle, crear/editar)
- **`/products`** - Gestión de productos (catálogo, detalle, inventario)
- **`/reports`** - Reportes y analíticas
- **`/auth`** - Autenticación (login, registro, recuperación de contraseña)
- **`/api`** - API endpoints para operaciones del backend

### `/src/lib`
Lógica de negocio y utilidades:

- **`/services`** - Servicios para interactuar con Supabase
  - `customerService.ts` - CRUD de clientes (tabla: clientes)
  - `transaccionService.ts` - CRUD de transacciones/ventas (tabla: transacciones)
  - `interaccionService.ts` - CRUD de interacciones (tabla: interacciones)
  - `dashboardService.ts` - Estadísticas y métricas del dashboard

- **`/utils`** - Funciones utilitarias
  - Formateo de moneda (centavos a unidades)
  - Formateo de fechas y tiempos relativos
  - Validaciones (email, teléfono)
  - Cálculos (crecimiento, rangos de fechas)
  - Helpers generales

- **`/api`** - Configuración de clientes API y endpoints

- **`/database`** - Configuración de base de datos
  - `supabase.ts` - Cliente de Supabase
  - `types.ts` - Tipos generados del esquema de Supabase

- **`/constants`** - Constantes y configuraciones globales
  - Estados de clientes, transacciones
  - Tipos de interacciones
  - Monedas soportadas (EUR, USD, MXN)
  - Rutas de navegación
  - Mensajes de error y éxito

### `/src/types`
Definiciones de tipos TypeScript:
- Interfaces para modelos (Cliente, Transaccion, Interaccion, User)
- Tipos Insert y Update para cada entidad
- Tipos de filtros para consultas
- Tipos de respuesta paginada
- Tipos de estadísticas y reportes

### `/src/stores`
Estado global de la aplicación (usando Nanostores o similar):
- `authStore.ts` - Estado de autenticación
- `cartStore.ts` - Carrito de ventas
- `filtersStore.ts` - Filtros de búsqueda

### `/src/middleware`
Middleware de Astro:
- Autenticación
- Autorización por roles
- Validación de sesiones

### `/src/styles`
Estilos globales:
- Variables CSS
- Temas
- Estilos base

## 🚀 Próximos Pasos

1. **Instalar dependencias necesarias:**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Configurar variables de entorno:**
   Copiar `.env.example` a `.env` y agregar:
   ```
   PUBLIC_SUPABASE_URL=tu_url
   PUBLIC_SUPABASE_ANON_KEY=tu_key
   ```

3. **Actualizar el cliente de Supabase:**
   En `src/lib/database/supabase.ts`, descomentar las líneas de importación
   y creación del cliente real.

4. **Probar la conexión:**
   - Ejecutar `npm run dev`
   - Los servicios están listos para usar

5. **Crear componentes UI:**
   - Botones, inputs, modales
   - Tablas con paginación
   - Formularios reutilizables

6. **Implementar páginas:**
   - Dashboard con estadísticas reales
   - CRUD de clientes
   - Gestión de transacciones
   - Historial de interacciones

## 📝 Convenciones de Código

- **Nombres de archivos:** camelCase para services/utils, PascalCase para componentes
- **Imports:** Usar imports absolutos desde `src/`
- **TypeScript:** Todos los archivos deben tener tipado estricto
- **Comentarios:** Documentar funciones y componentes complejos
- **Git:** Commits descriptivos siguiendo conventional commits

## 🔒 Seguridad

- Nunca exponer credenciales en el código
- Usar variables de entorno para datos sensibles
- Validar datos en cliente y servidor
- Implementar autenticación y autorización
- Sanitizar inputs de usuario
