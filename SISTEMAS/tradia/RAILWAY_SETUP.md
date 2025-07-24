# 🚀 TRADia - Setup no Railway

Este guia te ajudará a configurar a TRADia Platform no Railway com CI/CD automático.

## 📋 Pré-requisitos

- Conta no [Railway](https://railway.app)
- CLI do Railway instalado
- Repositório GitHub configurado
- Tokens de API (WhatsApp, Email, etc.)

## 🛠️ Setup Inicial

### 1. Login no Railway
```bash
railway login
```

### 2. Criar Projeto Principal
```bash
railway project new tradia-platform
```

### 3. Configurar Ambientes

#### Development Environment
```bash
# Criar serviços de banco
railway service new postgres-dev
railway service new redis-dev
railway service new tradia-dev

# Configurar domínios
railway domain add tradia-dev.up.railway.app --service tradia-dev
railway domain add tradia-api-dev.up.railway.app --service tradia-dev
```

#### Testing Environment  
```bash
railway service new postgres-test
railway service new redis-test
railway service new tradia-test

railway domain add tradia-test.up.railway.app --service tradia-test
railway domain add tradia-api-test.up.railway.app --service tradia-test
```

#### Production Environment
```bash
railway service new postgres-prod
railway service new redis-prod
railway service new tradia-prod

railway domain add tradia.up.railway.app --service tradia-prod
railway domain add tradia-api.up.railway.app --service tradia-prod
```

## ⚙️ Variáveis de Ambiente

### 🔒 Secrets (Configure no Railway Dashboard)

#### JWT Secrets
```bash
# Development
JWT_SECRET_DEV=dev-super-secret-jwt-key-change-in-production-2025

# Testing
JWT_SECRET_TEST=test-super-secret-jwt-key-for-testing-only-2025

# Production
JWT_SECRET_PROD=prod-ultra-secure-jwt-key-never-share-this-2025
```

#### API Keys
```bash
# WhatsApp Business API
WHATSAPP_API_KEY=your-whatsapp-business-api-key

# Email Service (SendGrid/AWS SES)
EMAIL_API_KEY=your-email-service-api-key

# Railway Tokens for CI/CD
RAILWAY_TOKEN_DEV=railway-dev-token-from-dashboard
RAILWAY_TOKEN_TEST=railway-test-token-from-dashboard  
RAILWAY_TOKEN_PROD=railway-prod-token-from-dashboard

# Slack Notifications (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/slack/webhook

# Security
CODECOV_TOKEN=your-codecov-token-for-coverage-reports
```

### 🌍 Environment Variables

#### Development Service
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=${{Postgres_Dev.DATABASE_URL}}
REDIS_URL=${{Redis_Dev.REDIS_URL}}
JWT_SECRET=${{JWT_SECRET_DEV}}
WHATSAPP_API_KEY=${{WHATSAPP_API_KEY}}
EMAIL_API_KEY=${{EMAIL_API_KEY}}
FRONTEND_URL=https://tradia-dev.up.railway.app
CORS_ORIGIN=https://tradia-dev.up.railway.app
LOG_LEVEL=debug
RATE_LIMIT_MAX_REQUESTS=1000
```

#### Testing Service
```bash
NODE_ENV=test
PORT=3000
DATABASE_URL=${{Postgres_Test.DATABASE_URL}}
REDIS_URL=${{Redis_Test.REDIS_URL}}
JWT_SECRET=${{JWT_SECRET_TEST}}
WHATSAPP_API_KEY=${{WHATSAPP_API_KEY}}
EMAIL_API_KEY=${{EMAIL_API_KEY}}
FRONTEND_URL=https://tradia-test.up.railway.app
CORS_ORIGIN=https://tradia-test.up.railway.app
LOG_LEVEL=info
RATE_LIMIT_MAX_REQUESTS=500
```

#### Production Service
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=${{Postgres_Prod.DATABASE_URL}}
REDIS_URL=${{Redis_Prod.REDIS_URL}}
JWT_SECRET=${{JWT_SECRET_PROD}}
WHATSAPP_API_KEY=${{WHATSAPP_API_KEY}}
EMAIL_API_KEY=${{EMAIL_API_KEY}}
FRONTEND_URL=https://tradia.up.railway.app
CORS_ORIGIN=https://tradia.up.railway.app
LOG_LEVEL=warn
RATE_LIMIT_MAX_REQUESTS=100
```

## 🗄️ Configuração de Banco de Dados

### PostgreSQL Setup

#### 1. Configurar Planos
```bash
# Development: Hobby Plan
railway service select postgres-dev
railway plan set hobby

# Testing: Hobby Plan  
railway service select postgres-test
railway plan set hobby

# Production: Pro Plan
railway service select postgres-prod
railway plan set pro
```

#### 2. Executar Migrations
```bash
# Development
railway service select tradia-dev
railway run "npm run db:migrate"
railway run "npm run db:seed"

# Testing
railway service select tradia-test
railway run "npm run db:migrate"
railway run "npm run db:seed:test"

# Production
railway service select tradia-prod
railway run "npm run db:migrate"
railway run "npm run db:seed:prod"
```

### Redis Setup

#### 1. Configurar Memory Limits
```bash
# Development: 512MB
railway service select redis-dev
railway variable set REDIS_MAXMEMORY=512mb
railway variable set REDIS_MAXMEMORY_POLICY=allkeys-lru

# Testing: 512MB
railway service select redis-test  
railway variable set REDIS_MAXMEMORY=512mb
railway variable set REDIS_MAXMEMORY_POLICY=allkeys-lru

# Production: 2GB
railway service select redis-prod
railway variable set REDIS_MAXMEMORY=2048mb
railway variable set REDIS_MAXMEMORY_POLICY=allkeys-lru
```

## 🔄 CI/CD Setup

### 1. GitHub Repository Secrets
No seu repositório GitHub, adicione estes secrets:

```
RAILWAY_TOKEN_DEV=<token-from-railway-dashboard>
RAILWAY_TOKEN_TEST=<token-from-railway-dashboard>
RAILWAY_TOKEN_PROD=<token-from-railway-dashboard>
SLACK_WEBHOOK_URL=<your-slack-webhook>
CODECOV_TOKEN=<your-codecov-token>
```

### 2. Branch Protection Rules

#### Main Branch
- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Require conversation resolution

#### Test Branch  
- Require status checks to pass
- Allow force pushes (for testing)

#### Dev Branch
- No restrictions (development freedom)

### 3. Workflow Triggers

```yaml
# .github/workflows/ci-cd.yml já está configurado para:

# Push to 'dev' → Deploy to Development
# Push to 'test' → Deploy to Testing  
# Push to 'main' → Deploy to Production

# Pull Request → Run tests only
```

## 🚀 Deploy Manual (Primeira vez)

### 1. Deploy Development
```bash
git checkout dev
git push origin dev
# CI/CD irá automaticamente fazer deploy
```

### 2. Deploy Testing
```bash
git checkout test
git merge dev
git push origin test
# CI/CD irá automaticamente fazer deploy
```

### 3. Deploy Production
```bash
git checkout main
git merge test
git push origin main
# CI/CD irá automaticamente fazer deploy
```

## 📊 Monitoramento

### Health Checks
Cada ambiente tem health check em `/health`:

- **Dev:** https://tradia-dev.up.railway.app/health
- **Test:** https://tradia-test.up.railway.app/health  
- **Prod:** https://tradia.up.railway.app/health

### Logs
```bash
# Ver logs em tempo real
railway logs --service tradia-dev
railway logs --service tradia-test
railway logs --service tradia-prod
```

### Métricas
Acesse o Railway Dashboard para ver:
- CPU usage
- Memory usage  
- Network traffic
- Database connections
- Redis operations

## 🔧 Comandos Úteis

### Desenvolvimento Local
```bash
# Usar Docker (recomendado)
docker-compose up -d

# Ou rodar serviços separadamente
npm run dev:backend
npm run dev:frontend
npm run dev:ai
```

### Deploy Manual
```bash
# Development
railway up --service tradia-dev

# Testing
railway up --service tradia-test

# Production  
railway up --service tradia-prod
```

### Database Management
```bash
# Conectar ao banco
railway connect postgres-dev
railway connect postgres-test
railway connect postgres-prod

# Backup
railway run "pg_dump \$DATABASE_URL > backup.sql" --service postgres-prod

# Restore
railway run "psql \$DATABASE_URL < backup.sql" --service postgres-prod
```

### Redis Management  
```bash
# Conectar ao Redis
railway connect redis-dev
railway connect redis-test
railway connect redis-prod

# Flush cache
railway run "redis-cli FLUSHALL" --service redis-dev
```

## 🔐 Segurança

### 1. JWT Secrets
- Use secrets diferentes para cada ambiente
- Rotacione as chaves periodicamente
- Nunca commite secrets no código

### 2. Database
- Use connection pooling
- Configure SSL em produção
- Faça backups regulares

### 3. Rate Limiting
- Development: 1000 req/window
- Testing: 500 req/window
- Production: 100 req/window

### 4. CORS
- Configure origins específicos por ambiente
- Nunca use `*` em produção

## 📈 Escalabilidade

### Horizontal Scaling
```bash
# Aumentar réplicas em produção
railway service scale --replicas 3 tradia-prod
```

### Vertical Scaling
```bash
# Aumentar recursos
railway service plan set pro tradia-prod
```

### Database Scaling
```bash
# Upgrade para plano superior
railway service plan set pro postgres-prod
```

## 🆘 Troubleshooting

### Build Failures
```bash
# Ver logs detalhados
railway logs --service tradia-dev

# Rebuild
railway redeploy --service tradia-dev
```

### Database Issues
```bash
# Verificar conexões
railway run "psql \$DATABASE_URL -c 'SELECT version();'" --service postgres-dev

# Reset migrations
railway run "npm run db:reset" --service tradia-dev
```

### Performance Issues
```bash
# Ver métricas
railway metrics --service tradia-prod

# Verificar Redis
railway run "redis-cli INFO memory" --service redis-prod
```

---

## 🎯 Próximos Passos

1. ✅ Configurar Railway e CI/CD
2. ✅ Deploy em todos os ambientes
3. 🔄 Configurar monitoramento avançado
4. 🔄 Setup de alertas
5. 🔄 Testes de carga
6. 🔄 Documentação da API
7. 🔄 Setup de staging completo

**🚀 Sua TRADia Platform estará rodando em produção!**

---

**Suporte:** Para dúvidas, abra uma issue no GitHub ou entre em contato com a equipe TOIT.
