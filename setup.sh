#!/bin/bash

# 🚀 GUÍA DE INICIO RÁPIDO - Sistema de Notificaciones de Suscripción

echo "╔════════════════════════════════════════════════════════╗"
echo "║  Sistema de Notificaciones de Suscripción - Inicio    ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Detectar sistema operativo
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OPEN_CMD="xdg-open"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OPEN_CMD="open"
else
    OPEN_CMD="echo"
fi

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones
print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Menú principal
show_menu() {
    echo ""
    echo "┌─ OPCIONES ─────────────────────────────────────────┐"
    echo "│                                                     │"
    echo "│ 1. Configuración Inicial (Primera vez)             │"
    echo "│ 2. Ejecutar en Desarrollo                          │"
    echo "│ 3. Testing - Verificar Sistema                     │"
    echo "│ 4. Ver Documentación                               │"
    echo "│ 5. Configurar Email (Resend)                       │"
    echo "│ 6. Configurar Cron Job                             │"
    echo "│ 7. Ver Logs y Estado                               │"
    echo "│ 8. Salir                                           │"
    echo "│                                                     │"
    echo "└─────────────────────────────────────────────────────┘"
    echo ""
    read -p "Selecciona una opción (1-8): " choice
}

# 1. Configuración Inicial
setup_initial() {
    print_step "Configuración Inicial"
    echo ""
    
    # Verificar .env
    if [ ! -f .env ]; then
        print_warning ".env no encontrado"
        if [ -f .env.example ]; then
            print_step "Copiando .env.example a .env..."
            cp .env.example .env
            print_success ".env creado"
            echo ""
            print_warning "⚠️  Ahora edita .env con tus credenciales de Supabase:"
            echo "   - PUBLIC_SUPABASE_URL"
            echo "   - PUBLIC_SUPABASE_ANON_KEY"
            echo ""
            read -p "¿Abrimos .env para editar? (s/n): " edit_env
            if [ "$edit_env" = "s" ] || [ "$edit_env" = "S" ]; then
                if command -v code &> /dev/null; then
                    code .env
                elif command -v nano &> /dev/null; then
                    nano .env
                fi
            fi
        fi
    else
        print_success ".env encontrado"
    fi
    
    echo ""
    print_step "Migraciones de Base de Datos"
    echo ""
    echo "Debes ejecutar estas migraciones en Supabase SQL Editor:"
    echo ""
    echo "1. migrations/001_add_fecha_suscripcion_to_clientes.sql"
    echo "2. migrations/002_subscription_notifications_table.sql"
    echo ""
    read -p "¿Abrimos Supabase en navegador? (s/n): " open_supabase
    if [ "$open_supabase" = "s" ] || [ "$open_supabase" = "S" ]; then
        $OPEN_CMD "https://supabase.com/dashboard"
    fi
    
    print_success "Configuración inicial completada"
}

# 2. Ejecutar en Desarrollo
run_dev() {
    print_step "Ejecutando en Desarrollo..."
    echo ""
    echo "📍 La app estará disponible en: http://localhost:3000"
    echo ""
    npm run dev
}

# 3. Testing
run_tests() {
    echo ""
    print_step "Testing del Sistema"
    echo ""
    echo "┌─ TESTS DISPONIBLES ─────────────────────────────────┐"
    echo "│                                                      │"
    echo "│ 1. Test de Alerta Visual                            │"
    echo "│ 2. Test de Email                                    │"
    echo "│ 3. Test de Cron Job                                 │"
    echo "│ 4. Test Completo                                    │"
    echo "│ 5. Volver al menú                                   │"
    echo "│                                                      │"
    echo "└──────────────────────────────────────────────────────┘"
    echo ""
    read -p "Selecciona test (1-5): " test_choice
    
    case $test_choice in
        1)
            echo ""
            print_step "Test de Alerta Visual"
            echo ""
            echo "Pasos:"
            echo "1. Abre http://localhost:3000/customers"
            echo "2. Crea un cliente con fecha_suscripcion = hace 360 días"
            echo "3. Entra al detalle del cliente"
            echo "4. Debería aparecer una alerta roja"
            echo ""
            read -p "¿Abrimos navegador? (s/n): " open_browser
            if [ "$open_browser" = "s" ] || [ "$open_browser" = "S" ]; then
                $OPEN_CMD "http://localhost:3000/customers"
            fi
            ;;
        2)
            echo ""
            print_step "Test de Email"
            echo ""
            echo "Pasos:"
            echo "1. Ve a un cliente con < 7 días para vencer"
            echo "2. Abre consola del navegador (F12)"
            echo "3. Busca console.log de notificación"
            echo "4. Si tienes RESEND_API_KEY, revisa dashboard de Resend"
            echo ""
            echo "URL Resend: https://resend.com/dashboard"
            read -p "¿Abrimos dashboard de Resend? (s/n): " open_resend
            if [ "$open_resend" = "s" ] || [ "$open_resend" = "S" ]; then
                $OPEN_CMD "https://resend.com/dashboard"
            fi
            ;;
        3)
            echo ""
            print_step "Test de Cron Job"
            echo ""
            echo "Ejecutando cron job..."
            echo ""
            curl -X GET http://localhost:3000/api/cron/check-subscriptions \
              -H "Authorization: Bearer desarrollo" -s | jq . 2>/dev/null || \
            curl -X GET http://localhost:3000/api/cron/check-subscriptions \
              -H "Authorization: Bearer desarrollo"
            echo ""
            ;;
        4)
            echo ""
            print_step "Test Completo"
            echo ""
            echo "1. Verificando servidor..."
            if curl -s http://localhost:3000 > /dev/null; then
                print_success "Servidor está activo"
            else
                print_error "Servidor no está activo"
                print_step "Inicia con: npm run dev"
                return
            fi
            
            echo ""
            echo "2. Probando cron job..."
            curl -X GET http://localhost:3000/api/cron/check-subscriptions \
              -H "Authorization: Bearer desarrollo" -s | jq . 2>/dev/null || echo "Cron respondió"
            
            echo ""
            print_success "Tests completados"
            ;;
        5)
            return
            ;;
    esac
}

# 4. Ver Documentación
show_docs() {
    echo ""
    print_step "Documentación Disponible"
    echo ""
    echo "┌─ DOCUMENTOS ────────────────────────────────────────┐"
    echo "│                                                      │"
    echo "│ 1. DOCUMENTATION_INDEX.md      - Índice Central      │"
    echo "│ 2. IMPLEMENTATION_SUMMARY.md   - Resumen             │"
    echo "│ 3. CUSTOMERS_MODULE.md         - Gestión Clientes    │"
    echo "│ 4. SUBSCRIPTION_NOTIFICATIONS.md - Sistema Alert    │"
    echo "│ 5. SUBSCRIPTION_SYSTEM.md      - Guía Completa       │"
    echo "│ 6. CRON_SETUP.md               - Cron Jobs           │"
    echo "│ 7. Volver                                            │"
    echo "│                                                      │"
    echo "└──────────────────────────────────────────────────────┘"
    echo ""
    read -p "Selecciona (1-7): " doc_choice
    
    case $doc_choice in
        1) open_file "DOCUMENTATION_INDEX.md" ;;
        2) open_file "IMPLEMENTATION_SUMMARY.md" ;;
        3) open_file "CUSTOMERS_MODULE.md" ;;
        4) open_file "SUBSCRIPTION_NOTIFICATIONS.md" ;;
        5) open_file "SUBSCRIPTION_SYSTEM.md" ;;
        6) open_file "CRON_SETUP.md" ;;
        7) return ;;
    esac
}

open_file() {
    if [ -f "$1" ]; then
        if command -v code &> /dev/null; then
            code "$1"
        elif command -v less &> /dev/null; then
            less "$1"
        else
            cat "$1"
        fi
    else
        print_error "Archivo no encontrado: $1"
    fi
}

# 5. Configurar Email
setup_email() {
    echo ""
    print_step "Configurar Email con Resend"
    echo ""
    echo "Pasos:"
    echo "1. Ve a https://resend.com"
    echo "2. Crea una cuenta"
    echo "3. Ve a Settings → API Keys"
    echo "4. Copia tu API key"
    echo "5. Pega en .env como: RESEND_API_KEY=re_..."
    echo ""
    read -p "¿Abrir Resend en navegador? (s/n): " open_resend_setup
    if [ "$open_resend_setup" = "s" ] || [ "$open_resend_setup" = "S" ]; then
        $OPEN_CMD "https://resend.com/dashboard"
    fi
    
    echo ""
    read -p "¿Editar .env? (s/n): " edit_env_email
    if [ "$edit_env_email" = "s" ] || [ "$edit_env_email" = "S" ]; then
        if command -v code &> /dev/null; then
            code .env
        elif command -v nano &> /dev/null; then
            nano .env
        fi
    fi
    
    print_success "Email configurado"
}

# 6. Configurar Cron Job
setup_cron() {
    echo ""
    print_step "Configurar Cron Job"
    echo ""
    echo "Opciones:"
    echo ""
    echo "1. Vercel (Recomendado si usas Vercel)"
    echo "2. AWS Lambda + EventBridge"
    echo "3. Google Cloud Scheduler"
    echo "4. Heroku"
    echo "5. n8n.io"
    echo "6. Volver"
    echo ""
    read -p "Selecciona plataforma (1-6): " cron_choice
    
    case $cron_choice in
        1)
            echo ""
            print_step "Configurar en Vercel"
            echo ""
            echo "1. Crea vercel.json en raíz del proyecto"
            echo "2. Añade:"
            echo '{
  "crons": [{
    "path": "/api/cron/check-subscriptions",
    "schedule": "0 8 * * *"
  }]
}'
            echo ""
            echo "3. Deploy a Vercel"
            echo ""
            echo "Ver detalles en CRON_SETUP.md"
            ;;
        2)
            echo ""
            echo "Ver instrucciones en CRON_SETUP.md - Opción 2"
            open_file "CRON_SETUP.md"
            ;;
        3)
            echo ""
            echo "Ver instrucciones en CRON_SETUP.md - Opción 3"
            open_file "CRON_SETUP.md"
            ;;
        4)
            echo ""
            echo "Ver instrucciones en CRON_SETUP.md - Opción 4"
            open_file "CRON_SETUP.md"
            ;;
        5)
            echo ""
            echo "Ver instrucciones en CRON_SETUP.md - Opción 5"
            open_file "CRON_SETUP.md"
            ;;
        6)
            return
            ;;
    esac
}

# 7. Ver Logs
show_logs() {
    echo ""
    print_step "Logs y Estado"
    echo ""
    echo "Dónde ver información:"
    echo ""
    echo "📍 Logs de desarrollo:"
    echo "   - Consola del navegador (F12)"
    echo "   - Terminal donde ejecutas 'npm run dev'"
    echo ""
    echo "📊 BD y notificaciones:"
    echo "   - Supabase Dashboard: https://supabase.com/dashboard"
    echo "   - Table: subscription_notifications"
    echo ""
    echo "📧 Emails enviados:"
    echo "   - Resend Dashboard: https://resend.com/dashboard"
    echo "   - Tab: Emails"
    echo ""
    echo "⏱️  Cron job:"
    echo "   - Vercel: https://vercel.com"
    echo "   - AWS: CloudWatch Logs"
    echo "   - Google Cloud: Cloud Logging"
    echo ""
    read -p "¿Abrir Supabase? (s/n): " open_supabase_logs
    if [ "$open_supabase_logs" = "s" ] || [ "$open_supabase_logs" = "S" ]; then
        $OPEN_CMD "https://supabase.com/dashboard"
    fi
}

# Loop principal
while true; do
    show_menu
    
    case $choice in
        1) setup_initial ;;
        2) run_dev ;;
        3) run_tests ;;
        4) show_docs ;;
        5) setup_email ;;
        6) setup_cron ;;
        7) show_logs ;;
        8)
            echo ""
            print_success "¡Hasta pronto!"
            exit 0
            ;;
        *)
            print_error "Opción no válida"
            ;;
    esac
done
