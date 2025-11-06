#!/bin/bash

echo "🔐 Victoria CRM - Verificación de Autenticación"
echo "=============================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar archivos creados
echo "📁 Verificando archivos creados..."
echo ""

files=(
  "src/components/auth/LoginForm.astro"
  "src/components/auth/SignupForm.astro"
  "src/components/auth/UserProfile.astro"
  "src/lib/services/authService.ts"
  "src/pages/api/auth/login.ts"
  "src/pages/api/auth/signup.ts"
  "src/pages/api/auth/logout.ts"
  "src/pages/api/auth/me.ts"
  "src/pages/auth/login.astro"
  "src/pages/auth/signup.astro"
  "src/middleware.ts"
  "AUTH.md"
  "AUTH_IMPLEMENTATION.md"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file"
  else
    echo -e "${RED}✗${NC} $file - NO ENCONTRADO"
  fi
done

echo ""
echo "📦 Verificando dependencias..."
echo ""

if grep -q "@supabase/supabase-js" package.json; then
  echo -e "${GREEN}✓${NC} @supabase/supabase-js instalado"
else
  echo -e "${YELLOW}⚠${NC} @supabase/supabase-js no está en package.json"
  echo "   Ejecuta: npm install @supabase/supabase-js"
fi

echo ""
echo "🔧 Verificando configuración..."
echo ""

if [ -f ".env.local" ]; then
  if grep -q "PUBLIC_SUPABASE_URL" .env.local; then
    echo -e "${GREEN}✓${NC} PUBLIC_SUPABASE_URL configurado"
  else
    echo -e "${RED}✗${NC} PUBLIC_SUPABASE_URL no encontrado en .env.local"
  fi
  
  if grep -q "PUBLIC_SUPABASE_ANON_KEY" .env.local; then
    echo -e "${GREEN}✓${NC} PUBLIC_SUPABASE_ANON_KEY configurado"
  else
    echo -e "${RED}✗${NC} PUBLIC_SUPABASE_ANON_KEY no encontrado en .env.local"
  fi
else
  echo -e "${YELLOW}⚠${NC} .env.local no encontrado"
  echo "   Ejecuta: cp .env.example .env.local"
fi

echo ""
echo "🚀 Próximos pasos:"
echo ""
echo "1. Instalar Supabase:"
echo "   npm install @supabase/supabase-js"
echo ""
echo "2. Configurar variables de entorno:"
echo "   cp .env.example .env.local"
echo "   # Edita .env.local con tus credenciales de Supabase"
echo ""
echo "3. Iniciar servidor de desarrollo:"
echo "   npm run dev"
echo ""
echo "4. Acceder a las páginas:"
echo "   - Login: http://localhost:3000/auth/login"
echo "   - Signup: http://localhost:3000/auth/signup"
echo ""
echo "📚 Documentación:"
echo "   - AUTH.md - Guía completa de uso"
echo "   - AUTH_IMPLEMENTATION.md - Resumen de implementación"
echo ""
echo "=============================================="
