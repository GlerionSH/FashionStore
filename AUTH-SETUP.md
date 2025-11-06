# 🔐 Configuración de Autenticación - Victoria CRM

## ✅ Cambios Realizados

Se ha actualizado el sistema de autenticación para funcionar correctamente con **Astro 5** y **Supabase Authentication**.

### Archivos Modificados:

1. **`astro.config.mjs`** - Configurado en modo servidor con adaptador Node.js
2. **`src/pages/api/auth/signup.ts`** - Endpoint de registro actualizado
3. **`src/pages/api/auth/login.ts`** - Endpoint de login actualizado
4. **`src/pages/api/auth/logout.ts`** - Endpoint de logout actualizado
5. **`src/pages/api/auth/me.ts`** - Endpoint de usuario actual actualizado

## 📋 Pasos para Completar la Configuración

### 1. Configurar Variables de Entorno

Abre el archivo `.env.local` y completa tus credenciales de Supabase:

```bash
# URL de tu proyecto Supabase
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co

# Clave anon/public de Supabase
PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-aqui

# URL de tu sitio
PUBLIC_SITE_URL=http://localhost:4321
```

### 2. Obtener Credenciales de Supabase

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Ve a **Settings** → **API**
4. Copia:
   - **Project URL** → `PUBLIC_SUPABASE_URL`
   - **anon/public key** → `PUBLIC_SUPABASE_ANON_KEY`

### 3. Configurar Autenticación en Supabase

#### 3.1 Habilitar Email Authentication

1. En tu proyecto de Supabase, ve a **Authentication** → **Providers**
2. Asegúrate de que **Email** esté habilitado
3. Configura las opciones:
   - ✅ Enable email confirmations (recomendado)
   - ✅ Enable email change confirmations
   - ✅ Secure email change

#### 3.2 Configurar Site URL y Redirect URLs

1. Ve a **Authentication** → **URL Configuration**
2. Configura:
   - **Site URL**: `http://localhost:4321` (para desarrollo)
   - **Redirect URLs**: 
     - `http://localhost:4321/**`
     - `http://localhost:4321/auth/callback`

#### 3.3 Configurar Email Templates (Opcional)

Los templates HTML para emails están en `/email-templates/`:

1. **confirm-signup.html** - Email de confirmación de registro
2. **reset-password.html** - Email de recuperación de contraseña
3. **reauthenticate.html** - Email de reautenticación

Para usarlos:
1. Ve a **Authentication** → **Email Templates**
2. Selecciona el template correspondiente
3. Copia el contenido del archivo HTML
4. Pégalo en el editor de Supabase
5. Guarda los cambios

## 🚀 Probar la Autenticación

### 1. Iniciar el Servidor

```bash
npm run dev
```

El servidor estará disponible en: http://localhost:4321

### 2. Probar Registro

1. Ve a http://localhost:4321/auth/signup
2. Completa el formulario:
   - Nombre completo
   - Correo electrónico
   - Contraseña (mínimo 8 caracteres)
3. Haz clic en "Crear Cuenta"

### 3. Verificar en Supabase

1. Ve a **Authentication** → **Users** en Supabase Dashboard
2. Deberías ver el nuevo usuario creado

### 4. Probar Login

1. Si habilitaste confirmación de email, verifica tu correo
2. Ve a http://localhost:4321/auth/login
3. Ingresa tus credenciales
4. Deberás ser redirigido a `/dashboard`

## 🔍 Solución de Problemas

### Error: "Supabase not configured"

**Causa**: Las variables de entorno no están configuradas correctamente.

**Solución**:
1. Verifica que `.env.local` tenga las credenciales correctas
2. Reinicia el servidor: `Ctrl+C` y luego `npm run dev`

### Error: "Invalid API key"

**Causa**: La clave de Supabase es incorrecta.

**Solución**:
1. Ve a Supabase Dashboard → Settings → API
2. Copia la clave `anon/public` correcta
3. Actualiza `PUBLIC_SUPABASE_ANON_KEY` en `.env.local`

### Error: "Email not confirmed"

**Causa**: El usuario no ha confirmado su email.

**Solución**:
1. Verifica el correo del usuario
2. O deshabilita la confirmación de email en Supabase:
   - Authentication → Providers → Email
   - Desmarca "Enable email confirmations"

### Error en POST requests

**Causa**: El adaptador de Node.js no está instalado o configurado.

**Solución**:
```bash
npm install @astrojs/node
```

## 📦 Dependencias Requeridas

Asegúrate de tener instaladas estas dependencias:

```json
{
  "dependencies": {
    "astro": "^5.15.3",
    "@supabase/supabase-js": "^2.x.x",
    "@astrojs/node": "^8.x.x"
  }
}
```

Para instalarlas:
```bash
npm install @supabase/supabase-js @astrojs/node
```

## 🎯 Endpoints Disponibles

### API Endpoints:

- **POST** `/api/auth/signup` - Registrar nuevo usuario
- **POST** `/api/auth/login` - Iniciar sesión
- **POST** `/api/auth/logout` - Cerrar sesión
- **GET** `/api/auth/me` - Obtener usuario actual

### Páginas:

- **GET** `/` - Página de bienvenida
- **GET** `/auth/login` - Página de inicio de sesión
- **GET** `/auth/signup` - Página de registro
- **GET** `/dashboard` - Panel de control (requiere autenticación)

## 📚 Recursos Adicionales

- [Documentación de Supabase Auth](https://supabase.com/docs/guides/auth)
- [Documentación de Astro](https://docs.astro.build)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)

## ✨ Próximos Pasos

1. ✅ Configurar variables de entorno
2. ✅ Probar registro y login
3. 🔲 Implementar protección de rutas
4. 🔲 Crear página de perfil de usuario
5. 🔲 Implementar recuperación de contraseña
6. 🔲 Agregar autenticación con redes sociales (opcional)

---

**¿Necesitas ayuda?** Revisa la documentación o verifica los logs de la consola del servidor para más detalles sobre los errores.
