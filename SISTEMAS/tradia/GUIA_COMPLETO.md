# 🎯 TRADia Platform - Guia Completo de Setup

## 📋 **O que foi criado para você:**

### ✅ **Estrutura Completa do Projeto**
- 📁 **TRADia/** como diretório principal
- 🗄️ **Schema de banco** seguindo padrão TOIT 
- ⚙️ **CI/CD** com GitHub Actions (3 ambientes)
- 🐳 **Docker Compose** para desenvolvimento
- ☁️ **Railway.toml** configurado para deploy
- 🔧 **Scripts automatizados** de setup

### ✅ **Configurações de Ambiente**
- 🔐 **3 ambientes:** dev, test, main
- 🚀 **Deploy automático:** push na branch = deploy
- 📊 **Monitoramento** e health checks
- 🛡️ **Segurança** com JWT, rate limiting, CORS

### ✅ **Banco de Dados Padronizado**
- 🏗️ **Esquema TOIT** com campos obrigatórios
- 👥 **Tabela usuarios** compatível com portal
- 📈 **Tabelas específicas** TRADia (signals, positions, etc.)
- 🔄 **Migrations** e seeds automatizados

---

## 🚀 **PRÓXIMOS PASSOS - SIGA ESTA ORDEM:**

### **1. Configurar Repositório GitHub** 
```bash
# No diretório TRADia
git init
git add .
git commit -m "🎉 Initial TRADia Platform setup"

# Conectar ao seu repositório
git remote add origin https://github.com/victorcalife/TRADia.git
git branch -M main
git push -u origin main

# Criar branches de desenvolvimento
git checkout -b dev
git push -u origin dev

git checkout -b test  
git push -u origin test

git checkout dev  # Voltar para dev para desenvolvimento
```

### **2. Configurar Railway (Dentro do Projeto TOIT Existente)**

#### **🎯 OPÇÃO A: Usar Projeto TOIT Existente (RECOMENDADO)**

Se você já tem um projeto TOIT no Railway com PostgreSQL e Redis:

```bash
# Conectar ao projeto TOIT existente
railway link

# Adicionar apenas o serviço TRADia ao projeto existente
railway service new tradia-dev
railway service new tradia-test  
railway service new tradia-prod

# Configurar domínios
railway domain add tradia-dev.up.railway.app --service tradia-dev
railway domain add tradia-test.up.railway.app --service tradia-test
railway domain add tradia.up.railway.app --service tradia-prod
```

**✅ Vantagens:**
- Reutiliza PostgreSQL e Redis existentes
- Banco de dados único para todos os sistemas TOIT
- Economia de recursos e custos
- Integração natural entre sistemas

#### **🔄 OPÇÃO B: Projeto Separado (Caso necessite isolamento)**

```bash
cd TRADia
railway project new tradia-platform

# Criar serviços completos
railway service new postgres-dev
railway service new redis-dev  
railway service new tradia-dev
# ... resto dos serviços
```

#### **🎯 Configuração para Projeto TOIT Existente:**

**Variáveis de Ambiente (usando banco existente):**
```bash
# Para cada serviço TRADia (dev/test/prod)
NODE_ENV=development
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Mesmo banco do projeto TOIT
REDIS_URL=${{Redis.REDIS_URL}}           # Mesmo Redis do projeto TOIT
JWT_SECRET=sua-chave-secreta-tradia
FRONTEND_URL=https://tradia-dev.up.railway.app

# Configurações específicas TRADia
TRADIA_DATABASE_SCHEMA=tradia_dev  # Schema separado no mesmo banco
TRADIA_REDIS_PREFIX=tradia:dev:     # Prefix para separar cache
```

### **3. Configurar Variáveis de Ambiente no Railway**

#### **🎯 Para Projeto TOIT Existente:**

Para cada serviço TRADia (tradia-dev, tradia-test, tradia-prod):

**Reutilizando Infraestrutura TOIT:**
```
NODE_ENV=development (ou test/production)
DATABASE_URL=${{Postgres.DATABASE_URL}}     # Mesmo banco do projeto TOIT
REDIS_URL=${{Redis.REDIS_URL}}             # Mesmo Redis do projeto TOIT
JWT_SECRET=sua-chave-secreta-tradia-unica
FRONTEND_URL=https://tradia-dev.up.railway.app

# Separação por schema/prefix
TRADIA_DATABASE_SCHEMA=tradia_dev
TRADIA_REDIS_PREFIX=tradia:dev:
TRADIA_TABLE_PREFIX=tradia_

# APIs específicas TRADia
WHATSAPP_API_KEY=sua-chave-whatsapp
EMAIL_API_KEY=sua-chave-email
```

#### **🔄 Para Projeto Separado:**

```
NODE_ENV=development
DATABASE_URL=${{Postgres_TRADia_Dev.DATABASE_URL}}  # Banco dedicado
REDIS_URL=${{Redis_TRADia_Dev.REDIS_URL}}          # Redis dedicado
JWT_SECRET=sua-chave-secreta-unica
FRONTEND_URL=https://tradia-dev.up.railway.app
```

### **4. Configurar Secrets no GitHub**

No seu repositório GitHub, vá em Settings > Secrets and variables > Actions:

```
RAILWAY_TOKEN_DEV=token-do-railway-dev
RAILWAY_TOKEN_TEST=token-do-railway-test  
RAILWAY_TOKEN_PROD=token-do-railway-prod
SLACK_WEBHOOK_URL=seu-webhook-slack (opcional)
```

### **5. Desenvolvimento Local** 

```bash
# Copiar configuração de ambiente
cp .env.example .env

# Editar .env com suas configurações
nano .env  # ou use VS Code

# Dar permissão aos scripts
chmod +x setup.sh start-dev.sh stop-dev.sh

# Executar setup automatizado
./setup.sh

# Ou manualmente:
docker-compose up -d postgres redis  # Bancos
npm install                          # Dependências
npm run dev                         # Desenvolvimento
```

### **6. Testar Deploy Automático**

```bash
# Fazer uma alteração simples
echo "console.log('Testing CI/CD')" >> backend/src/test.js

# Commit e push para dev
git add .
git commit -m "🧪 Testing CI/CD pipeline"
git push origin dev

# ✅ Isso vai automaticamente fazer deploy para tradia-dev.up.railway.app
```

### **7. Pipeline de Deploy Completo**

```bash
# Desenvolvimento
git checkout dev
# fazer alterações
git push origin dev  # ✅ Auto-deploy para DEV

# Testing  
git checkout test
git merge dev
git push origin test  # ✅ Auto-deploy para TEST

# Production
git checkout main  
git merge test
git push origin main  # ✅ Auto-deploy para PROD
```

---

## 🏗️ **Estrutura dos Serviços no Railway**

### **🎯 OPÇÃO A: Integrado ao Projeto TOIT (RECOMENDADO)**

```
📦 projeto-toit/
├── 🗄️ postgres         → Banco compartilhado (portal + tradia)
├── 🔴 redis            → Cache compartilhado
├── 🌐 portal-dev       → Portal TOIT desenvolvimento
├── 🌐 portal-test      → Portal TOIT testes
├── 🌐 portal-prod      → Portal TOIT produção
├── � tradia-dev       → TRADia desenvolvimento (NOVO)
├── � tradia-test      → TRADia testes (NOVO)
└── � tradia-prod      → TRADia produção (NOVO)
```

**✅ Vantagens:**
- **Compartilha infraestrutura** (PostgreSQL + Redis)
- **Usuários unificados** entre portal e TRADia
- **Custos reduzidos** (menos recursos)
- **Backup único** para todos os sistemas
- **Integração natural** entre sistemas TOIT

### **🔄 OPÇÃO B: Projeto Separado**

```
📦 projeto-toit/          📦 tradia-platform/
├── 🗄️ postgres         ├── �️ postgres-dev
├── 🔴 redis            ├── 🗄️ postgres-test  
├── 🌐 portal-*         ├── 🗄️ postgres-prod
                        ├── 🔴 redis-dev
                        ├── 🔴 redis-test
                        ├── 🔴 redis-prod
                        ├── � tradia-dev
                        ├── 📊 tradia-test
                        └── 📊 tradia-prod
```

### **URLs dos Ambientes:**
- **Dev:** https://tradia-dev.up.railway.app
- **Test:** https://tradia-test.up.railway.app  
- **Prod:** https://tradia.up.railway.app

---

## 🔧 **Comandos Úteis**

### **Desenvolvimento Local:**
```bash
./start-dev.sh          # Iniciar tudo
./stop-dev.sh           # Parar tudo
npm run dev             # Só aplicação
docker-compose up -d    # Só bancos
```

### **Railway:**
```bash
railway logs --service tradia-dev     # Ver logs
railway connect postgres-dev          # Conectar banco
railway run "npm run db:migrate"      # Executar comando
railway up --service tradia-dev       # Deploy manual
```

### **Banco de Dados:**
```bash
# Local
npm run db:migrate  # Executar migrations
npm run db:seed     # Popular dados

# Railway
railway run "npm run db:migrate" --service tradia-dev
railway run "npm run db:seed" --service tradia-dev
```

---

## 📊 **Schema de Banco Compatível com TOIT**

### **Tabela Usuários (Compatível com Portal):**
```sql
tradia_users:
├── id, tenant_id, created_at, updated_at  # Padrão TOIT
├── perfil, model, aplicacao, contexto     # Padrão TOIT
├── email, cpf, password_hash, name, phone # Login padrão
├── capital_inicial, capital_atual         # TRADia específico
├── subscription_plan, risk_profile        # TRADia específico
└── total_return, win_rate, sharpe_ratio   # Performance
```

### **Tabelas Específicas TRADia:**
- ✅ `tradia_signals` - Sinais gerados pela IA
- ✅ `tradia_positions` - Posições dos usuários  
- ✅ `tradia_performance` - Métricas de performance
- ✅ `tradia_notifications` - Notificações enviadas
- ✅ `tradia_subscriptions` - Planos e billing
- ✅ `tradia_backtests` - Resultados de backtests
- ✅ `tradia_market_data` - Cache de dados de mercado

---

## 🎯 **Checklist Final**

### **Antes de Começar:**
- [ ] ✅ **Repositório GitHub** criado e conectado
- [ ] ✅ **Railway** conectado ao projeto TOIT existente
- [ ] ✅ **3 serviços TRADia** criados no projeto TOIT
- [ ] ✅ **Variáveis ambiente** configuradas (reutilizando banco TOIT)
- [ ] ✅ **Secrets GitHub** configurados para CI/CD
- [ ] ✅ **Desenvolvimento local** funcionando

### **Para Ir Live:**
- [ ] 🔄 **APIs externas** configuradas (WhatsApp, Email)
- [ ] 🔄 **Domínio customizado** (opcional)
- [ ] 🔄 **SSL/HTTPS** configurado
- [ ] 🔄 **Monitoramento** e alertas
- [ ] 🔄 **Backup** automatizado

---

## 🆘 **Suporte e Dúvidas**

### **Logs e Debug:**
```bash
# Logs locais
docker-compose logs -f
npm run dev 2>&1 | tee debug.log

# Logs Railway  
railway logs --service tradia-dev

# Health check
curl https://tradia-dev.up.railway.app/health
```

### **Problemas Comuns:**
1. **Build falha:** Verificar logs do GitHub Actions
2. **Banco não conecta:** Verificar DATABASE_URL 
3. **CI/CD não roda:** Verificar secrets do GitHub
4. **Deploy falha:** Verificar variáveis do Railway

---

## 🚀 **Sua Plataforma Estará Assim:**

```
🌍 https://tradia.up.railway.app
├── 📊 Dashboard com sinais em tempo real
├── 💰 Gestão de capital pelo usuário
├── 📈 Performance tracking automático  
├── 📱 Notificações WhatsApp/Email
├── 🤖 IA gerando sinais 24/7
└── 📋 Relatórios de performance
```

**🎉 Vamos começar? Siga o passo 1 e vamos colocar sua TRADia no ar!**
