# Sistema de Autenticación - Victoria CRM

## Descripción

Se ha implementado un sistema completo de autenticación usando **Supabase Auth** con las siguientes características:

- ✅ Registro de nuevos usuarios
- ✅ Inicio de sesión con email y contraseña
- ✅ Validación de contraseña fuerte
- ✅ Medidor de fortaleza de contraseña
- ✅ Restablecimiento de contraseña
- ✅ Cierre de sesión
- ✅ Protección de rutas autenticadas
- ✅ Interfaz moderna y responsiva

## Instalación y Configuración

### 1. Instalar @supabase/supabase-js

```bash
npm install @supabase/supabase-js
```

### 2. Configurar variables de entorno

Copia el archivo `.env.example` a `.env.local` y completa las variables:

```bash
cp .env.example .env.local
```

Luego edita `.env.local` con tus credenciales de Supabase:

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Obtener credenciales de Supabase

1. Ve a [Supabase Console](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Copia:
   - **Project URL** → `PUBLIC_SUPABASE_URL`
   - **Anon Key** → `PUBLIC_SUPABASE_ANON_KEY`

## Estructura de Archivos

```
src/
├── components/auth/
│   ├── LoginForm.astro      # Formulario de inicio de sesión
│   └── SignupForm.astro     # Formulario de registro
├── lib/
│   ├── database/
│   │   └── supabase.ts      # Cliente de Supabase
│   └── services/
│       └── authService.ts   # Servicio de autenticación
├── pages/
│   ├── api/auth/
│   │   ├── login.ts         # Endpoint POST /api/auth/login
│   │   ├── signup.ts        # Endpoint POST /api/auth/signup
│   │   ├── logout.ts        # Endpoint POST /api/auth/logout
│   │   └── me.ts            # Endpoint GET /api/auth/me
│   └── auth/
│       ├── login.astro      # Página de inicio de sesión
│       └── signup.astro     # Página de registro
├── middleware.ts            # Middleware para proteger rutas
└── ...
```

## Rutas de Autenticación

### Páginas Públicas
- `GET /auth/login` - Página de inicio de sesión
- `GET /auth/signup` - Página de registro

### Endpoints de API
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/signup` - Registrar usuario
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener usuario actual

## Uso

### Inicio de Sesión

```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});

const data = await response.json();
if (data.success) {
  window.location.href = '/dashboard';
}
```

### Registro

```javascript
const response = await fetch('/api/auth/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fullName: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
  }),
});

const data = await response.json();
if (data.success) {
  window.location.href = '/dashboard';
}
```

### Cerrar Sesión

```javascript
const response = await fetch('/api/auth/logout', {
  method: 'POST',
});

const data = await response.json();
if (data.success) {
  window.location.href = '/auth/login';
}
```

### Obtener Usuario Actual

```javascript
const response = await fetch('/api/auth/me');
const data = await response.json();

if (data.success) {
  console.log('Usuario autenticado:', data.user);
} else {
  console.log('No hay usuario autenticado');
}
```

## Validaciones

### Signup (Registro)
- Nombre: mínimo 3 caracteres
- Email: formato válido
- Contraseña: mínimo 8 caracteres
- Confirmación: debe coincidir con la contraseña
- Términos: debe estar marcado

### Login (Inicio de Sesión)
- Email: formato válido
- Contraseña: mínimo 6 caracteres

## Medidor de Fortaleza de Contraseña

El formulario de registro incluye un medidor visual de fortaleza que evalúa:

- ✓ Longitud (≥8 caracteres)
- ✓ Longitud adicional (≥12 caracteres)
- ✓ Letras mayúsculas y minúsculas
- ✓ Números
- ✓ Caracteres especiales (!@#$%^&*)

## Rutas Protegidas

El middleware protege automáticamente estas rutas, requiriendo autenticación:

- `/dashboard`
- `/customers`
- `/products`
- `/sales`
- `/reports`

Si un usuario no autenticado intenta acceder, será redirigido a `/auth/login`.

## Tabla de Supabase Auth

El sistema usa la tabla de autenticación nativa de Supabase (`auth.users`), que incluye:

- `id` - UUID único del usuario
- `email` - Correo electrónico
- `encrypted_password` - Contraseña encriptada
- `email_confirmed_at` - Confirmación de email
- `raw_user_meta_data` - Metadatos del usuario (incluye full_name)
- `created_at` - Fecha de creación
- `updated_at` - Fecha de última actualización

## Métodos del Servicio de Autenticación

### `authService.ts`

- `signup(credentials)` - Registrar nuevo usuario
- `login(credentials)` - Iniciar sesión
- `logout()` - Cerrar sesión
- `getCurrentUser()` - Obtener usuario actual
- `getCurrentSession()` - Obtener sesión actual
- `resetPassword(email)` - Enviar enlace de restablecimiento
- `updatePassword(newPassword)` - Actualizar contraseña

## Próximos Pasos

1. **Confirmar Email**: Implementar verificación de email
2. **2FA**: Agregar autenticación de dos factores
3. **OAuth**: Integrar Google, GitHub, etc.
4. **Recuperación de Cuenta**: Página de "¿Olvidó su contraseña?"
5. **Perfil de Usuario**: Página para editar perfil
6. **Sesiones**: Gestión de múltiples sesiones

## Troubleshooting

### Error: "Faltan variables de entorno SUPABASE_URL y SUPABASE_ANON_KEY"

Asegúrate de:
1. Tener el archivo `.env.local` en la raíz del proyecto
2. Que las variables estén correctamente configuradas
3. Reiniciar el servidor de desarrollo

### Error: "Invalid JWT"

Posibles causas:
1. Token expirado
2. Anon key incorrecta
3. Proyecto de Supabase incorrecto

### Usuarios no se guardan

Verifica que:
1. La tabla `auth.users` existe en Supabase
2. La configuración de autenticación esté habilitada
3. Los triggers de Supabase estén activados

## Seguridad

⚠️ **Consideraciones de seguridad:**

- Las contraseñas se envían por HTTPS (producción)
- Las contraseñas se encriptan en la base de datos
- Los tokens JWT tienen expiración
- Los endpoints están protegidos contra CSRF
- Las sesiones se validan en el servidor

## Soporte

Para más información sobre Supabase Auth, consulta:
- [Documentación oficial](https://supabase.com/docs/guides/auth)
- [Ejemplos de código](https://github.com/supabase/supabase)
