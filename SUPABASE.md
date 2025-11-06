# Configuración de Supabase para el CRM

Este documento detalla cómo configurar Supabase para trabajar con tu CRM.

## 📋 Esquema de Base de Datos

Tu base de datos ya está configurada con las siguientes tablas:

### Tabla: `clientes`
Almacena la información de los clientes.

```sql
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id),
  nombre text NOT NULL,
  correo_electronico text NOT NULL,
  telefono text,
  empresa text,
  notas text,
  estado text DEFAULT 'activo',
  fecha_creacion timestamp DEFAULT now(),
  fecha_actualizacion timestamp DEFAULT now()
);
```

**Estados permitidos:** `activo`, `inactivo`, `prospecto`, `lead`

### Tabla: `interacciones`
Registra todas las interacciones con los clientes.

```sql
CREATE TABLE public.interacciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  tipo text NOT NULL,
  descripcion text,
  fecha_interaccion timestamp,
  fecha_creacion timestamp DEFAULT now()
);
```

**Tipos permitidos:** `llamada`, `email`, `reunion`, `nota`, `tarea`

### Tabla: `transacciones`
Gestiona las ventas y transacciones.

```sql
CREATE TABLE public.transacciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  id_intencion_pago_stripe text UNIQUE,
  cantidad bigint NOT NULL,
  moneda text DEFAULT 'eur',
  descripcion text,
  estado text DEFAULT 'pendiente',
  fecha_creacion timestamp DEFAULT now(),
  fecha_actualizacion timestamp DEFAULT now()
);
```

**Estados permitidos:** `pendiente`, `completada`, `cancelada`, `reembolsada`  
**Monedas soportadas:** `eur`, `usd`, `mxn`

**IMPORTANTE:** La cantidad se almacena en **centavos** (ej: 10000 = €100.00)

## 🔐 Políticas de Seguridad (RLS)

Se recomienda habilitar Row Level Security (RLS) en todas las tablas:

### Para `clientes`:
```sql
-- Los usuarios solo pueden ver sus propios clientes
CREATE POLICY "usuarios_ven_sus_clientes" ON public.clientes
  FOR SELECT USING (auth.uid() = usuario_id);

-- Los usuarios solo pueden insertar sus propios clientes
CREATE POLICY "usuarios_insertan_sus_clientes" ON public.clientes
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Los usuarios solo pueden actualizar sus propios clientes
CREATE POLICY "usuarios_actualizan_sus_clientes" ON public.clientes
  FOR UPDATE USING (auth.uid() = usuario_id);

-- Los usuarios solo pueden eliminar sus propios clientes
CREATE POLICY "usuarios_eliminan_sus_clientes" ON public.clientes
  FOR DELETE USING (auth.uid() = usuario_id);
```

### Para `interacciones`:
```sql
CREATE POLICY "usuarios_ven_sus_interacciones" ON public.interacciones
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "usuarios_insertan_sus_interacciones" ON public.interacciones
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);
```

### Para `transacciones`:
```sql
CREATE POLICY "usuarios_ven_sus_transacciones" ON public.transacciones
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "usuarios_insertan_sus_transacciones" ON public.transacciones
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);
```

## ⚙️ Configuración del Proyecto

### 1. Instalar Supabase
```bash
npm install @supabase/supabase-js
```

### 2. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto:

```env
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
```

Obtén estas credenciales desde:
- Dashboard de Supabase → Settings → API

### 3. Activar el Cliente de Supabase
En `src/lib/database/supabase.ts`, descomenta estas líneas:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

Y elimina el cliente temporal.

## 🧪 Probar la Conexión

### Ejemplo 1: Crear un cliente
```typescript
import { clienteService } from '@/lib/services';

const nuevoCliente = await clienteService.crear({
  usuario_id: 'uuid-del-usuario',
  nombre: 'Juan Pérez',
  correo_electronico: 'juan@ejemplo.com',
  telefono: '555-1234',
  empresa: 'Empresa XYZ',
  estado: 'activo',
  notas: 'Cliente potencial',
});
```

### Ejemplo 2: Obtener clientes
```typescript
const { data: clientes } = await clienteService.obtenerTodos({
  estado: 'activo',
  limite: 10,
  offset: 0,
});
```

### Ejemplo 3: Crear una transacción
```typescript
import { transaccionService } from '@/lib/services';
import { aCentavos } from '@/lib/utils';

const nuevaTransaccion = await transaccionService.crear({
  usuario_id: 'uuid-del-usuario',
  cliente_id: 'uuid-del-cliente',
  cantidad: aCentavos(150.50), // €150.50 -> 15050 centavos
  moneda: 'eur',
  descripcion: 'Venta de producto',
  estado: 'completada',
});
```

## 📊 Índices Recomendados

Para mejorar el rendimiento:

```sql
-- Índices en clientes
CREATE INDEX idx_clientes_usuario_id ON public.clientes(usuario_id);
CREATE INDEX idx_clientes_estado ON public.clientes(estado);
CREATE INDEX idx_clientes_fecha_creacion ON public.clientes(fecha_creacion DESC);

-- Índices en interacciones
CREATE INDEX idx_interacciones_cliente_id ON public.interacciones(cliente_id);
CREATE INDEX idx_interacciones_usuario_id ON public.interacciones(usuario_id);
CREATE INDEX idx_interacciones_fecha ON public.interacciones(fecha_interaccion DESC);

-- Índices en transacciones
CREATE INDEX idx_transacciones_cliente_id ON public.transacciones(cliente_id);
CREATE INDEX idx_transacciones_usuario_id ON public.transacciones(usuario_id);
CREATE INDEX idx_transacciones_estado ON public.transacciones(estado);
CREATE INDEX idx_transacciones_fecha ON public.transacciones(fecha_creacion DESC);
```

## 🔄 Triggers para fecha_actualizacion

Crea un trigger para actualizar automáticamente `fecha_actualizacion`:

```sql
-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para clientes
CREATE TRIGGER trigger_clientes_fecha_actualizacion
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_fecha_actualizacion();

-- Trigger para transacciones
CREATE TRIGGER trigger_transacciones_fecha_actualizacion
  BEFORE UPDATE ON public.transacciones
  FOR EACH ROW
  EXECUTE FUNCTION update_fecha_actualizacion();
```

## 🚀 Recursos

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Cliente JavaScript](https://supabase.com/docs/reference/javascript/introduction)

---

**Nota:** Todos los servicios (`clienteService`, `transaccionService`, `interaccionService`) están listos para usar una vez que configures Supabase correctamente.
