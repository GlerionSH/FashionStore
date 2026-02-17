# CRM de Ventas - Nasty Neptune# Astro Starter Kit: Basics



## 📋 Descripción```sh

Sistema CRM (Customer Relationship Management) completo para gestión de ventas, diseñado para empresas que necesitan organizar sus clientes, productos y operaciones comerciales.npm create astro@latest -- --template basics

```

## 🎯 Características Principales

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

### Gestión de Clientes

- CRUD completo de clientes## 🚀 Project Structure

- Clasificación por estado (Lead, Prospecto, Activo, Inactivo)

- Asignación de clientes a vendedoresInside of your Astro project, you'll see the following folders and files:

- Historial de actividades por cliente

- Etiquetas y notas personalizadas```text

/

### Gestión de Ventas├── public/

- Creación y seguimiento de ventas│   └── favicon.svg

- Control de estados (Borrador, Pendiente, Completada, Cancelada)├── src

- Gestión de pagos (Sin pagar, Parcial, Pagado, Reembolsado)│   ├── assets

- Cálculo automático de subtotales, impuestos y descuentos│   │   └── astro.svg

- Múltiples métodos de pago│   ├── components

│   │   └── Welcome.astro

### Gestión de Productos│   ├── layouts

- Catálogo de productos│   │   └── Layout.astro

- Control de inventario│   └── pages

- Precios y costos│       └── index.astro

- Categorización de productos└── package.json

- Alertas de stock bajo```



### Dashboard y ReportesTo learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

- Estadísticas en tiempo real

- Gráficas de ventas y rendimiento## 🧞 Commands

- Productos más vendidos

- Actividades recientesAll commands are run from the root of the project, from a terminal:

- Reportes personalizables

| Command                   | Action                                           |

### Sistema de Usuarios| :------------------------ | :----------------------------------------------- |

- Roles: Administrador, Gerente, Vendedor| `npm install`             | Installs dependencies                            |

- Autenticación segura| `npm run dev`             | Starts local dev server at `localhost:4321`      |

- Permisos por rol| `npm run build`           | Build your production site to `./dist/`          |

| `npm run preview`         | Preview your build locally, before deploying     |

## 🛠️ Tecnologías| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |

| `npm run astro -- --help` | Get help using the Astro CLI                     |

- **Frontend:** Astro 5.14.8

- **Lenguaje:** TypeScript## 👀 Want to learn more?

- **Base de Datos:** Supabase (PostgreSQL)

- **Autenticación:** Supabase AuthFeel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).


## 📁 Estructura del Proyecto

Ver `ESTRUCTURA.md` para documentación detallada de la estructura de carpetas.

```
src/
├── components/     # Componentes reutilizables por módulo
│   ├── ui/        # Botones, inputs, modales, tablas
│   ├── dashboard/ # Gráficas, estadísticas
│   ├── customers/ # Componentes de clientes
│   ├── sales/     # Componentes de ventas
│   ├── products/  # Componentes de productos
│   ├── reports/   # Componentes de reportes
│   └── auth/      # Componentes de autenticación
├── layouts/       # Layouts de página
├── pages/         # Páginas y rutas
│   ├── dashboard/ # Panel principal
│   ├── customers/ # Gestión de clientes
│   ├── sales/     # Gestión de ventas
│   ├── products/  # Gestión de productos
│   ├── reports/   # Reportes
│   ├── auth/      # Autenticación
│   └── api/       # API endpoints
├── lib/           # Lógica de negocio
│   ├── services/  # Services (customerService, saleService, etc.)
│   ├── utils/     # Funciones utilitarias
│   ├── api/       # Configuración de API
│   ├── database/  # Configuración de base de datos
│   └── constants/ # Constantes globales
├── types/         # Tipos TypeScript
├── stores/        # Estado global
├── middleware/    # Middleware de Astro
└── styles/        # Estilos globales
```

## 🚀 Instalación y Configuración

### 1. Instalar dependencias
```bash
npm install
```

### 2. Instalar Supabase
```bash
npm install @supabase/supabase-js
```

### 3. Configurar variables de entorno
Crear archivo `.env` en la raíz del proyecto:
```env
PUBLIC_SUPABASE_URL=tu_supabase_url
PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

### 4. Ejecutar el servidor de desarrollo
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:4321`

## 🧞 Comandos Disponibles

| Comando | Acción |
|---------|--------|
| `npm install` | Instala las dependencias |
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Construye el proyecto para producción |
| `npm run preview` | Previsualiza el build de producción |
| `npm run astro ...` | Ejecuta comandos de Astro CLI |

## 📊 Módulos del Sistema

### Dashboard
Panel principal con vista general del negocio:
- Estadísticas de ventas
- Ingresos totales
- Clientes activos
- Actividades recientes
- Productos más vendidos

### Clientes
Gestión completa de la base de clientes:
- Lista de clientes con filtros
- Crear/editar clientes
- Estados y clasificación
- Asignación a vendedores
- Historial de interacciones

### Ventas
Control total del proceso de ventas:
- Crear nuevas ventas
- Gestionar items de venta
- Calcular totales automáticamente
- Seguimiento de pagos
- Estados de venta

### Productos
Administración del catálogo:
- CRUD de productos
- Control de inventario
- Precios y costos
- Categorización
- Imágenes de productos

### Reportes
Análisis y métricas del negocio:
- Reportes de ventas
- Análisis de rendimiento
- Productos top
- Métricas por período

## 📝 Archivos Importantes

- **`src/types/index.ts`** - Definiciones de tipos TypeScript para todo el sistema
- **`src/lib/constants/index.ts`** - Constantes, estados, roles y configuración
- **`src/lib/utils/index.ts`** - Funciones utilitarias (formateo, validaciones, cálculos)
- **`src/lib/services/`** - Servicios para interactuar con la base de datos
- **`ESTRUCTURA.md`** - Documentación detallada de la arquitectura

## 🔐 Seguridad

- Variables de entorno para credenciales sensibles
- Autenticación con Supabase Auth
- Sistema de roles y permisos
- Validación de datos en cliente y servidor
- Sanitización de inputs

## 📈 Próximos Pasos

1. **Configurar Supabase:**
   - Crear proyecto en Supabase
   - Configurar tablas de base de datos
   - Obtener credenciales

2. **Implementar Componentes UI:**
   - Botones, inputs, modales
   - Tablas con paginación
   - Formularios reutilizables

3. **Conectar Servicios:**
   - Implementar CRUD en services
   - Conectar con Supabase
   - Manejo de errores

4. **Desarrollar Páginas:**
   - Dashboard funcional
   - Páginas de gestión
   - Sistema de reportes

## 💳 Pagos con Stripe en producción

Esta app está pensada para funcionar 100% en producción (por ejemplo en Coolify) sin depender de `localhost`, `npm run dev` ni `stripe listen`.

### Webhook en Stripe Dashboard

- **URL del webhook (producción):**
  - `https://<TU_DOMINIO_PRODUCCION>/api/stripe/webhook`
- **Eventos a habilitar:**
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
- Copia el **Signing secret** que te da Stripe y configúralo como `STRIPE_WEBHOOK_SECRET` en el entorno de producción.

El webhook verifica la firma sobre el **cuerpo raw**, marca pedidos como `paid`, descuenta stock por talla de forma atómica vía RPC, genera factura y envía emails.

### Variables de entorno necesarias

Configura estas variables (sin valores de ejemplo) en Coolify / producción:

- **Stripe**
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`

- **Supabase**
  - `SUPABASE_URL` (o `PUBLIC_SUPABASE_URL` como fallback)
  - `PUBLIC_SUPABASE_ANON_KEY` (o `SUPABASE_ANON_KEY`)
  - `SUPABASE_SERVICE_ROLE_KEY`

- **Emails (Brevo)**
  - `BREVO_API_KEY`
  - `EMAIL_FROM_EMAIL`
  - `EMAIL_FROM_NAME`
  - `EMAIL_ADMIN_TO`

- **App / sitio**
  - `PUBLIC_SITE_URL` (por ejemplo `https://tienda.midominio.com`)

### Stripe CLI (opcional solo para testing local)

En desarrollo puedes usar Stripe CLI para simular eventos contra tu servidor local:

```bash
stripe listen --forward-to http://localhost:4321/api/stripe/webhook
```

Esto es **opcional** y solo para pruebas. En producción Stripe enviará los eventos directamente a la URL pública de Coolify.

### Checklist de pruebas en Coolify

1. **Deploy** en Coolify con `output: server` y adapter Node ya configurado.
2. Configurar todas las **variables de entorno** anteriores.
3. En Stripe Dashboard, crear el **endpoint de webhook** apuntando a:
   - `https://<TU_DOMINIO_PRODUCCION>/api/stripe/webhook`
   - Activar los eventos: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`.
4. Crear un pedido real de prueba usando tarjeta de test (`4242 4242 4242 4242`).
5. Verificar en la base de datos:
   - Pedido pasa de `pending` a `paid`.
   - Se asignan `paid_at`, `stripe_payment_intent_id` y datos de factura (`invoice_token`, `invoice_number`, `invoice_issued_at`).
   - El stock (y `size_stock` si aplica) se ha decrementado correctamente.
6. Verificar en la UI y email:
   - Llega el email de confirmación al comprador y al admin.
   - En "Mis pedidos" aparece el botón de descarga de factura y el PDF se genera bien.
7. Repetir manualmente el evento desde Stripe (reintento de webhook) y comprobar que:
   - No se duplica el email.
   - No se vuelve a descontar stock.
   - El webhook responde siempre 200 (idempotente).

## 🤝 Contribución

Este es un proyecto privado para tu empresa. Para colaborar, contacta al administrador del sistema.

## 📄 Licencia

Propietario: Tu Empresa de Ventas  
Todos los derechos reservados.

---

**Versión:** 1.0.0  
**Última actualización:** Octubre 2025  
**Framework:** Astro 5.14.8
