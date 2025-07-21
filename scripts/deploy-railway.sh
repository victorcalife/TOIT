#!/bin/bash
# Deploy Script para Railway - TOIT Enterprise Platform

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Verificar dependências
check_dependencies() {
    log "Verificando dependências..."
    
    # Verificar Railway CLI
    if ! command -v railway &> /dev/null; then
        error "Railway CLI não encontrada. Instale com: npm install -g @railway/cli"
    fi
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js não encontrado"
    fi
    
    # Verificar se está logado na Railway
    if ! railway whoami &> /dev/null; then
        error "Não está logado na Railway. Execute: railway login"
    fi
    
    success "Dependências verificadas"
}

# Setup de variáveis de ambiente
setup_env_vars() {
    log "Configurando variáveis de ambiente..."
    
    # Verificar se já existem
    if railway variables list | grep -q "JWT_SECRET"; then
        warning "Variáveis já configuradas"
        return
    fi
    
    # Gerar secrets seguros
    JWT_SECRET=$(openssl rand -base64 64)
    JWT_REFRESH_SECRET=$(openssl rand -base64 64)
    
    # Configurar variáveis na Railway
    railway variables set JWT_SECRET="$JWT_SECRET"
    railway variables set JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
    railway variables set NODE_ENV="development"
    railway variables set DEFAULT_TENANT="blueworld"
    railway variables set ENABLE_LOGGING="true"
    railway variables set LOG_LEVEL="debug"
    
    success "Variáveis de ambiente configuradas"
}

# Setup do banco de dados
setup_database() {
    log "Configurando banco de dados..."
    
    # Verificar se PostgreSQL já existe
    if railway service list | grep -q "postgresql"; then
        warning "PostgreSQL já configurado"
    else
        # Adicionar PostgreSQL
        railway add postgresql
        success "PostgreSQL adicionado"
    fi
    
    # Verificar se Redis já existe
    if railway service list | grep -q "redis"; then
        warning "Redis já configurado"
    else
        # Adicionar Redis
        railway add redis
        success "Redis adicionado"
    fi
    
    # Aguardar serviços ficarem prontos
    log "Aguardando serviços ficarem prontos..."
    sleep 30
}

# Executar migrations
run_migrations() {
    log "Executando migrations..."
    
    # Aguardar DATABASE_URL estar disponível
    timeout=60
    counter=0
    
    while [ $counter -lt $timeout ]; do
        if railway variables list | grep -q "DATABASE_URL"; then
            break
        fi
        sleep 1
        counter=$((counter + 1))
    done
    
    if [ $counter -eq $timeout ]; then
        error "DATABASE_URL não disponível após $timeout segundos"
    fi
    
    # Executar schema
    DATABASE_URL=$(railway variables get DATABASE_URL)
    if [ -n "$DATABASE_URL" ]; then
        log "Executando schema do banco..."
        # Note: isso será executado no deploy, não localmente
        success "Schema será executado no deploy"
    fi
}

# Deploy dos serviços
deploy_services() {
    log "Iniciando deploy dos serviços..."
    
    # Deploy Portal TOIT (SSO Gateway) - PRIMEIRO
    log "Deploying Portal TOIT..."
    cd SISTEMAS/portal-toit
    railway up --service portal-toit
    cd ../..
    success "Portal TOIT deployado"
    
    # Aguardar Portal ficar disponível
    log "Aguardando Portal TOIT ficar disponível..."
    sleep 60
    
    # Deploy OMS Blue World
    log "Deploying OMS Blue World..."
    cd SISTEMAS/oms-blueworld  
    railway up --service oms-blueworld
    cd ../..
    success "OMS Blue World deployado"
    
    # Deploy Tradia (se existir)
    if [ -d "SISTEMAS/tradia" ]; then
        log "Deploying Tradia..."
        cd SISTEMAS/tradia
        railway up --service tradia
        cd ../..
        success "Tradia deployado"
    fi
}

# Health checks
run_health_checks() {
    log "Executando health checks..."
    
    # Obter URLs dos serviços
    PORTAL_URL=$(railway service url portal-toit)
    OMS_URL=$(railway service url oms-blueworld)
    
    # Health check Portal
    log "Verificando Portal TOIT..."
    if curl -f "$PORTAL_URL/health" > /dev/null 2>&1; then
        success "Portal TOIT saudável: $PORTAL_URL"
    else
        warning "Portal TOIT não respondendo"
    fi
    
    # Health check OMS
    log "Verificando OMS Blue World..."
    if curl -f "$OMS_URL/api/health" > /dev/null 2>&1; then
        success "OMS Blue World saudável: $OMS_URL"
    else
        warning "OMS não respondendo"
    fi
    
    # Teste SSO
    log "Testando fluxo SSO..."
    SSO_TEST=$(curl -s -X POST "$PORTAL_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -H "X-Tenant-Slug: blueworld" \
        -d '{"cpf":"12345678900","password":"123456"}')
    
    if echo "$SSO_TEST" | grep -q "success"; then
        success "SSO funcionando"
    else
        warning "SSO pode ter problemas: $SSO_TEST"
    fi
}

# Mostrar informações finais
show_final_info() {
    log "Deploy finalizado! 🎉"
    
    echo ""
    echo "=== 🔗 URLs dos Serviços ==="
    railway service list --json | jq -r '.[] | "- \(.name): \(.url)"'
    
    echo ""
    echo "=== 🔑 Como Testar ==="
    echo "1. Acesse: $(railway service url portal-toit)/login"
    echo "2. Use CPF: 123.456.789-00 | Senha: 123456"
    echo "3. Teste SSO nos outros sistemas"
    
    echo ""
    echo "=== 📊 Monitoramento ==="
    echo "- Logs: railway logs"
    echo "- Variáveis: railway variables list"
    echo "- Status: railway status"
    
    echo ""
    success "TOIT Enterprise Platform deployado com sucesso na Railway!"
}

# Menu principal
main() {
    echo ""
    echo "🚀 TOIT Railway Deploy Script"
    echo "=============================="
    
    case "${1:-all}" in
        "check")
            check_dependencies
            ;;
        "env")
            check_dependencies
            setup_env_vars
            ;;
        "db")
            check_dependencies
            setup_database
            run_migrations
            ;;
        "deploy")
            check_dependencies
            deploy_services
            ;;
        "test")
            run_health_checks
            ;;
        "all")
            check_dependencies
            setup_env_vars
            setup_database
            run_migrations
            deploy_services
            run_health_checks
            show_final_info
            ;;
        *)
            echo "Uso: $0 [check|env|db|deploy|test|all]"
            echo ""
            echo "Opções:"
            echo "  check  - Verificar dependências"
            echo "  env    - Configurar variáveis de ambiente"
            echo "  db     - Configurar banco de dados"
            echo "  deploy - Deploy dos serviços"
            echo "  test   - Health checks"
            echo "  all    - Executar tudo (padrão)"
            exit 1
            ;;
    esac
}

# Executar
main "$@"