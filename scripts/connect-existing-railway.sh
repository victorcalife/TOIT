#!/bin/bash
# Connect to Existing Railway Project - TOIT
# Repository: https://github.com/victorcalife/TOIT
# Railway Project: TOIT (3 environments already configured)

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_URL="https://github.com/victorcalife/TOIT.git"
RAILWAY_PROJECT="TOIT"

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
    
    if ! command -v git &> /dev/null; then
        error "Git não encontrado"
    fi
    
    if ! command -v railway &> /dev/null; then
        error "Railway CLI não encontrada. Instale: npm install -g @railway/cli"
    fi
    
    if ! railway whoami &> /dev/null; then
        error "Não está logado na Railway. Execute: railway login"
    fi
    
    success "Dependências OK"
}

# Setup Git
setup_git() {
    log "Configurando Git..."
    
    if [ -d ".git" ]; then
        warning "Já é um repositório Git"
        
        # Verificar remote origin
        if git remote get-url origin &> /dev/null; then
            CURRENT_ORIGIN=$(git remote get-url origin)
            if [ "$CURRENT_ORIGIN" != "$REPO_URL" ]; then
                log "Atualizando origin de $CURRENT_ORIGIN para $REPO_URL"
                git remote set-url origin "$REPO_URL"
            fi
        else
            git remote add origin "$REPO_URL"
        fi
    else
        git init
        git remote add origin "$REPO_URL"
    fi
    
    success "Git configurado"
}

# Configurar branches
setup_branches() {
    log "Configurando branches..."
    
    # Fetch do repositório remoto
    if git ls-remote origin &> /dev/null; then
        git fetch origin
        
        # Verificar se branches remotas existem e criar locais
        for branch in main test dev; do
            if git ls-remote --heads origin $branch | grep -q $branch; then
                if ! git show-ref --verify --quiet refs/heads/$branch; then
                    log "Criando branch local $branch"
                    git checkout -b $branch origin/$branch
                else
                    success "Branch $branch já existe localmente"
                fi
            else
                log "Criando branch $branch (não existe no remoto)"
                git checkout -b $branch
            fi
        done
    else
        warning "Repositório remoto vazio, criando branches localmente"
        for branch in main test dev; do
            if ! git show-ref --verify --quiet refs/heads/$branch; then
                git checkout -b $branch
            fi
        done
    fi
    
    # Trabalhar na branch dev
    git checkout dev
    success "Branches configuradas, trabalhando em dev"
}

# Conectar ao projeto Railway
connect_railway() {
    log "Conectando ao projeto Railway $RAILWAY_PROJECT..."
    
    # Listar projetos para verificar se TOIT existe
    if railway project list | grep -q "$RAILWAY_PROJECT"; then
        success "Projeto $RAILWAY_PROJECT encontrado na Railway"
    else
        error "Projeto $RAILWAY_PROJECT não encontrado. Verifique o nome."
    fi
    
    # Conectar ao projeto
    railway link $RAILWAY_PROJECT
    success "Conectado ao projeto Railway"
}

# Verificar ambientes Railway
check_railway_environments() {
    log "Verificando ambientes Railway..."
    
    # Listar ambientes
    ENVIRONMENTS=$(railway environment list --json 2>/dev/null || echo "[]")
    
    if [ "$ENVIRONMENTS" = "[]" ]; then
        warning "Não foi possível listar ambientes"
        return
    fi
    
    echo "Ambientes encontrados:"
    echo "$ENVIRONMENTS" | jq -r '.[] | "- \(.name): \(.branch)"'
    
    success "Ambientes verificados"
}

# Configurar variáveis de ambiente essenciais
setup_essential_vars() {
    log "Configurando variáveis de ambiente essenciais..."
    
    # Perguntar se deve configurar
    read -p "Configurar variáveis de ambiente? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warning "Pulando configuração de variáveis"
        return
    fi
    
    # Para ambiente dev
    railway environment use dev
    
    log "Configurando ambiente DEV..."
    
    # Verificar se JWT_SECRET já existe
    if railway variables list | grep -q "JWT_SECRET"; then
        success "JWT_SECRET já configurado"
    else
        JWT_SECRET=$(openssl rand -base64 64)
        railway variables set JWT_SECRET="$JWT_SECRET"
        success "JWT_SECRET configurado"
    fi
    
    if railway variables list | grep -q "JWT_REFRESH_SECRET"; then
        success "JWT_REFRESH_SECRET já configurado"
    else
        JWT_REFRESH_SECRET=$(openssl rand -base64 64)
        railway variables set JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
        success "JWT_REFRESH_SECRET configurado"
    fi
    
    # Variáveis básicas
    railway variables set NODE_ENV="development"
    railway variables set DEFAULT_TENANT="blueworld"
    railway variables set ENABLE_LOGGING="true"
    railway variables set LOG_LEVEL="debug"
    
    success "Variáveis DEV configuradas"
}

# Fazer commit inicial
initial_commit() {
    log "Preparando commit inicial..."
    
    # Verificar se há arquivos para commit
    git add .
    
    if git diff --cached --quiet; then
        warning "Nenhuma mudança para commit"
        return
    fi
    
    # Status do que será commitado
    echo "Arquivos que serão commitados:"
    git diff --cached --name-only
    
    read -p "Fazer commit? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warning "Commit cancelado"
        return
    fi
    
    git commit -m "🚀 TOIT Enterprise Platform - Initial Implementation

✨ Features:
- Sistema SSO multi-tenant implementado
- Portal TOIT como gateway de autenticação
- JWT tokens com contexto de tenant/sistema
- Arquitetura escalável para múltiplos clientes
- Schema de banco padronizado

🏗️ Arquitetura:
- Portal TOIT: SSO Gateway
- OMS Blue World: Sistema existente integrado
- Tradia: Trading system preparado
- Easis ERP: ERP empresarial preparado

🚀 Deploy:
- Railway configurado para 3 ambientes
- CI/CD com GitHub Actions
- Auto-deploy por branch

📊 Próximos passos:
- Testar login SSO
- Integrar OMS existente
- Deploy em desenvolvimento

#TOIT #SSO #MultiTenant #Enterprise"
    
    success "Commit realizado"
}

# Push para GitHub
push_to_github() {
    log "Enviando código para GitHub..."
    
    read -p "Fazer push para GitHub? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warning "Push cancelado"
        return
    fi
    
    # Push da branch atual (dev)
    git push -u origin dev
    
    success "Push realizado - deploy automático iniciará"
}

# Monitorar deploy
monitor_deploy() {
    log "Monitorando deploy..."
    
    echo ""
    echo "🔍 Para acompanhar o deploy:"
    echo "- Railway Dashboard: https://railway.app/project/$RAILWAY_PROJECT"
    echo "- GitHub Actions: https://github.com/victorcalife/TOIT/actions"
    echo "- Logs: railway logs"
    
    read -p "Abrir logs do Railway? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        railway logs --follow
    fi
}

# Mostrar próximos passos
show_next_steps() {
    echo ""
    echo "🎯 PRÓXIMOS PASSOS"
    echo "=================="
    echo ""
    echo "1. 🔍 Monitorar Deploy:"
    echo "   railway logs"
    echo "   railway status"
    echo ""
    echo "2. ✅ Testar Sistema:"
    echo "   - Aguardar deploy completar"
    echo "   - Acessar URL do ambiente dev"
    echo "   - Testar login: CPF 123.456.789-00 / Senha: 123456"
    echo ""
    echo "3. 🔧 Configurar Outros Ambientes:"
    echo "   railway environment use test"
    echo "   railway variables set JWT_SECRET=\"[secret-test]\""
    echo "   # Repetir para production"
    echo ""
    echo "4. 🚀 Deploy em Outros Ambientes:"
    echo "   git checkout test"
    echo "   git merge dev"
    echo "   git push origin test"
    echo ""
    echo "5. 🔗 Integrar OMS Existente:"
    echo "   - Configurar middleware SSO no OMS"
    echo "   - Testar fluxo completo"
    echo ""
    success "Setup completo! Sistema pronto para desenvolvimento 🚀"
}

# Menu principal
main() {
    echo ""
    echo "🚀 TOIT - Connect to Existing Railway Project"
    echo "============================================="
    echo "Repository: $REPO_URL"
    echo "Railway Project: $RAILWAY_PROJECT"
    echo ""
    
    case "${1:-all}" in
        "check")
            check_dependencies
            ;;
        "git")
            setup_git
            setup_branches
            ;;
        "railway")
            connect_railway
            check_railway_environments
            ;;
        "vars")
            setup_essential_vars
            ;;
        "commit")
            initial_commit
            ;;
        "push")
            push_to_github
            ;;
        "monitor")
            monitor_deploy
            ;;
        "all")
            check_dependencies
            setup_git
            setup_branches
            connect_railway
            check_railway_environments
            setup_essential_vars
            initial_commit
            push_to_github
            monitor_deploy
            show_next_steps
            ;;
        *)
            echo "Uso: $0 [check|git|railway|vars|commit|push|monitor|all]"
            echo ""
            echo "Opções:"
            echo "  check   - Verificar dependências"
            echo "  git     - Configurar Git e branches"
            echo "  railway - Conectar ao projeto Railway"
            echo "  vars    - Configurar variáveis de ambiente"
            echo "  commit  - Fazer commit inicial"
            echo "  push    - Push para GitHub (trigger deploy)"
            echo "  monitor - Monitorar deploy"
            echo "  all     - Executar tudo"
            exit 1
            ;;
    esac
}

# Executar
main "$@"