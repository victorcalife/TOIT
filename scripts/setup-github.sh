#!/bin/bash
# Setup Script - GitHub Repository + Railway Integration
# TOIT Enterprise Platform

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'  
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variáveis
REPO_URL="https://github.com/victorcalife/TOIT.git"
REPO_NAME="TOIT"

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

# Setup do repositório Git
setup_git_repo() {
    log "Configurando repositório GitHub..."
    
    # Verificar se já é um repositório git
    if [ -d ".git" ]; then
        warning "Já é um repositório Git"
        
        # Verificar se origin está configurado
        if git remote get-url origin &> /dev/null; then
            CURRENT_ORIGIN=$(git remote get-url origin)
            if [ "$CURRENT_ORIGIN" != "$REPO_URL" ]; then
                warning "Origin atual: $CURRENT_ORIGIN"
                read -p "Deseja alterar para $REPO_URL? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    git remote set-url origin "$REPO_URL"
                    success "Origin atualizado"
                fi
            else
                success "Origin já configurado corretamente"
            fi
        else
            git remote add origin "$REPO_URL"
            success "Origin adicionado"
        fi
    else
        # Inicializar repositório
        git init
        git remote add origin "$REPO_URL"
        success "Repositório inicializado"
    fi
}

# Criar e configurar branches
setup_branches() {
    log "Configurando branches..."
    
    # Verificar branch atual
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
    
    # Criar branches se não existirem
    branches=("main" "test" "dev")
    
    for branch in "${branches[@]}"; do
        if git show-ref --verify --quiet refs/heads/$branch; then
            success "Branch $branch já existe"
        else
            log "Criando branch $branch..."
            git checkout -b $branch
            success "Branch $branch criada"
        fi
    done
    
    # Voltar para dev (branch de trabalho)
    git checkout dev
    success "Switched to dev branch"
}

# Configurar arquivos específicos por ambiente
setup_environment_configs() {
    log "Criando configurações por ambiente..."
    
    # Railway config para DEV
    cat > .railway-dev.toml << 'EOF'
[build]
builder = "NIXPACKS"

[deploy]
numReplicas = 1
restartPolicyType = "ON_FAILURE"

[[services]]
name = "toit-portal-dev"
source = "SISTEMAS/portal-toit"

[services.build]
buildCommand = "cd backend && npm ci && npm run build"

[services.deploy]
startCommand = "cd backend && npm start"
healthcheckPath = "/health"

[[services.domains]]
name = "portal-dev"
EOF

    # Railway config para TEST
    cat > .railway-test.toml << 'EOF'
[build]
builder = "NIXPACKS"

[deploy]
numReplicas = 2
restartPolicyType = "ON_FAILURE"

[[services]]
name = "toit-portal-test"
source = "SISTEMAS/portal-toit"

[services.build]
buildCommand = "cd backend && npm ci && npm run build"

[services.deploy]
startCommand = "cd backend && npm start"
healthcheckPath = "/health"

[[services.domains]]
name = "portal-test"
EOF

    # Railway config para PROD
    cat > .railway-prod.toml << 'EOF'
[build]
builder = "NIXPACKS"

[deploy]
numReplicas = 3
restartPolicyType = "ON_FAILURE"

[[services]]
name = "toit-portal-prod"
source = "SISTEMAS/portal-toit"

[services.build]
buildCommand = "cd backend && npm ci && npm run build"

[services.deploy]
startCommand = "cd backend && npm start"
healthcheckPath = "/health"

[[services.domains]]
name = "portal"
EOF

    success "Configurações de ambiente criadas"
}

# Atualizar workflow do GitHub Actions
update_github_workflows() {
    log "Atualizando GitHub Actions workflows..."
    
    # Workflow para DEV
    cat > .github/workflows/deploy-dev.yml << 'EOF'
name: 🚀 Deploy to DEV

on:
  push:
    branches: [ dev ]
  pull_request:
    branches: [ dev ]

env:
  NODE_VERSION: '18'
  RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_DEV }}

jobs:
  deploy-dev:
    name: 🚀 Deploy to Development
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/dev'
    environment:
      name: development
      url: https://portal-dev.up.railway.app
    
    steps:
      - name: 📥 Checkout
        uses: actions/checkout@v4
        
      - name: 🔧 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: 📦 Install Dependencies
        run: npm ci
        
      - name: 🏗️ Build
        run: npm run build --filter=portal-toit
        
      - name: 🧪 Test
        run: npm run test --filter=portal-toit
        env:
          NODE_ENV: test
          
      - name: 🚀 Deploy to Railway
        uses: railwayapp/railway-deploy@v3
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN_DEV }}
          service: toit-portal-dev
          
      - name: ✅ Health Check
        run: |
          sleep 30
          curl -f https://portal-dev.up.railway.app/health || exit 1
EOF

    # Workflow para TEST
    cat > .github/workflows/deploy-test.yml << 'EOF'
name: 🧪 Deploy to TEST

on:
  push:
    branches: [ test ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'
  RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_TEST }}

jobs:
  deploy-test:
    name: 🧪 Deploy to Test Environment
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/test'
    environment:
      name: test
      url: https://portal-test.up.railway.app
    
    steps:
      - name: 📥 Checkout
        uses: actions/checkout@v4
        
      - name: 🔧 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: 📦 Install Dependencies
        run: npm ci
        
      - name: 🏗️ Build
        run: npm run build --filter=portal-toit
        
      - name: 🧪 Run All Tests
        run: npm run test
        env:
          NODE_ENV: test
          
      - name: 🔍 Lint & Type Check
        run: |
          npm run lint
          npm run build --filter=portal-toit
          
      - name: 🚀 Deploy to Railway
        uses: railwayapp/railway-deploy@v3
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN_TEST }}
          service: toit-portal-test
          
      - name: ✅ Health Check
        run: |
          sleep 30
          curl -f https://portal-test.up.railway.app/health || exit 1
          
      - name: 🧪 Integration Tests
        run: |
          # Teste de integração completo
          npm run test:integration
EOF

    # Workflow para PRODUCTION
    cat > .github/workflows/deploy-prod.yml << 'EOF'
name: 🚀 Deploy to PRODUCTION

on:
  push:
    branches: [ main ]
    
  # Deploy manual apenas
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Digite "DEPLOY" para confirmar deploy em produção'
        required: true
        default: 'CANCEL'

env:
  NODE_VERSION: '18'
  RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_PROD }}

jobs:
  deploy-prod:
    name: 🚀 Deploy to Production
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event.inputs.confirm == 'DEPLOY')
    environment:
      name: production
      url: https://portal.toit.com
    
    steps:
      - name: 📥 Checkout
        uses: actions/checkout@v4
        
      - name: 🔧 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: 📦 Install Dependencies
        run: npm ci
        
      - name: 🏗️ Build
        run: npm run build
        env:
          NODE_ENV: production
        
      - name: 🧪 Full Test Suite
        run: npm run test
        env:
          NODE_ENV: test
          
      - name: 🔍 Security Audit
        run: npm audit --audit-level high
        
      - name: 🚀 Deploy to Railway
        uses: railwayapp/railway-deploy@v3
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN_PROD }}
          service: toit-portal-prod
          
      - name: ✅ Health Check
        run: |
          sleep 60
          curl -f https://portal.toit.com/health || exit 1
          
      - name: 📊 Post-Deploy Tests
        run: |
          # Testes de fumaça em produção
          npm run test:smoke
EOF

    success "GitHub Actions workflows atualizados"
}

# Criar README específico
create_readme() {
    log "Criando README..."
    
    cat > README.md << 'EOF'
# 🚀 TOIT - The One in Tech

Enterprise Technology Ecosystem - Plataforma multi-tenant com SSO unificado

## 🏗️ Arquitetura

- **Portal TOIT**: Gateway SSO centralizado
- **OMS Blue World**: Sistema de gestão de ordens  
- **Trad.ia**: Trading system com IA
- **Easis ERP**: Sistema ERP empresarial

## 🌿 Branches & Ambientes

- `dev` → Development (auto-deploy)
- `test` → Quality Assurance (auto-deploy) 
- `main` → Production (manual deploy)

## 🚀 Deploy

### Development
```bash
git push origin dev
```

### Test
```bash
git checkout test
git merge dev
git push origin test
```

### Production  
```bash
git checkout main
git merge test
git push origin main
# OU deploy manual via GitHub Actions
```

## 🔑 URLs

- **DEV**: https://portal-dev.up.railway.app
- **TEST**: https://portal-test.up.railway.app  
- **PROD**: https://portal.toit.com

## 🛠️ Desenvolvimento

```bash
# Install
npm install

# Dev local
npm run dev

# Build
npm run build

# Test
npm run test
```

## 📊 Monitoramento

- Railway Dashboard
- GitHub Actions
- Health endpoints: `/health`

---

**TOIT - Transformando tecnologia em resultados**
EOF

    success "README criado"
}

# Configurar secrets no GitHub (instruções)
show_secrets_instructions() {
    log "Instruções para configurar GitHub Secrets..."
    
    cat << 'EOF'

=== 🔐 CONFIGURAR GITHUB SECRETS ===

Acesse: https://github.com/victorcalife/TOIT/settings/secrets/actions

Adicione os seguintes secrets:

1. RAILWAY_TOKEN_DEV
   - Obter em: https://railway.app/account/tokens
   - Para ambiente development

2. RAILWAY_TOKEN_TEST  
   - Obter em: https://railway.app/account/tokens
   - Para ambiente test

3. RAILWAY_TOKEN_PROD
   - Obter em: https://railway.app/account/tokens  
   - Para ambiente production

=== 🚂 RAILWAY SETUP ===

Para cada ambiente, execute:

1. railway login
2. railway link (selecionar projeto correto)
3. railway add postgresql
4. railway add redis
5. railway variables set JWT_SECRET="[secret-muito-longo]"

EOF

    success "Instruções mostradas"
}

# Fazer commit inicial
initial_commit() {
    log "Fazendo commit inicial..."
    
    # Adicionar todos os arquivos
    git add .
    
    # Verificar se há mudanças
    if git diff --cached --quiet; then
        warning "Nenhuma mudança para commit"
        return
    fi
    
    # Commit
    git commit -m "🚀 Initial commit: TOIT Enterprise Platform

- Sistema SSO multi-tenant implementado
- Portal TOIT como gateway de autenticação  
- Arquitetura multi-sistema (OMS, Tradia, Easis)
- CI/CD configurado para dev/test/prod
- Railway deploy automation
- JWT tokens com tenant context
- Database schema padronizado

Ready for development! 🎉"
    
    success "Commit inicial realizado"
}

# Push para GitHub
push_to_github() {
    log "Enviando para GitHub..."
    
    # Push da branch dev
    git push -u origin dev
    
    # Push das outras branches
    git checkout test
    git push -u origin test
    
    git checkout main  
    git push -u origin main
    
    # Voltar para dev
    git checkout dev
    
    success "Código enviado para GitHub"
}

# Menu principal
main() {
    echo ""
    echo "🚀 TOIT GitHub Setup"
    echo "===================="
    echo "Repositório: $REPO_URL"
    echo ""
    
    case "${1:-all}" in
        "git")
            setup_git_repo
            setup_branches
            ;;
        "config")
            setup_environment_configs
            update_github_workflows
            create_readme
            ;;
        "commit")
            initial_commit
            ;;
        "push")
            push_to_github
            ;;
        "secrets")
            show_secrets_instructions
            ;;
        "all")
            setup_git_repo
            setup_branches
            setup_environment_configs  
            update_github_workflows
            create_readme
            initial_commit
            push_to_github
            show_secrets_instructions
            
            echo ""
            success "🎉 Setup completo!"
            echo ""
            echo "Próximos passos:"
            echo "1. Configure os secrets no GitHub"
            echo "2. Setup Railway projects" 
            echo "3. Faça um push para dev para testar CI/CD"
            ;;
        *)
            echo "Uso: $0 [git|config|commit|push|secrets|all]"
            echo ""
            echo "Opções:"
            echo "  git     - Setup repositório e branches"
            echo "  config  - Criar configurações de ambiente"
            echo "  commit  - Commit inicial"
            echo "  push    - Push para GitHub"
            echo "  secrets - Mostrar instruções de secrets"
            echo "  all     - Executar tudo"
            exit 1
            ;;
    esac
}

# Executar
main "$@"