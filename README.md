# 🚀 TOIT - The One in Tech

Enterprise Technology Ecosystem - Plataforma multi-tenant com SSO unificado

## 🏗️ Arquitetura

### 🌟 **Sistemas Principais**
- **Portal TOIT**: Gateway SSO centralizado  
- **OMS Blue World**: Sistema de gestão de ordens de serviço
- **Trad.ia**: Trading system com IA
- **Easis ERP**: Sistema ERP empresarial

### 🔧 **Infraestrutura**
- **Multi-tenant**: Suporte a múltiplos clientes
- **SSO**: Single Sign-On unificado  
- **Microservices**: Arquitetura modular
- **Cloud-native**: Deploy em Railway

## 🌿 Branches & Ambientes

```
dev → Development (auto-deploy)
test → Quality Assurance (auto-deploy)
main → Production (manual deploy)
```

### 🔗 **URLs dos Ambientes**
- **DEV**: https://toit-dev.up.railway.app
- **TEST**: https://toit-test.up.railway.app
- **PROD**: https://portal.toit.com

## 🚀 Deploy

### Development
```bash
git checkout dev
git add .
git commit -m "feat: nova funcionalidade"
git push origin dev
```

### Test (Quality Assurance)
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
```

## 🛠️ Desenvolvimento Local

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Setup
```bash
# Instalar dependências
npm install

# Setup do Portal TOIT
cd SISTEMAS/portal-toit/backend
npm install
cp .env.example .env

# Iniciar desenvolvimento
npm run dev
```

### Scripts Principais
```bash
# Desenvolvimento
npm run dev              # Portal TOIT
npm run portal:dev       # Portal TOIT específico
npm run oms:dev         # OMS Blue World
npm run tradia:dev      # Trad.ia

# Build
npm run build           # Build all
npm run build --filter=portal-toit

# Test
npm run test            # Test all
npm run test --filter=portal-toit

# Lint
npm run lint
npm run format
```

## 📊 Estrutura do Monorepo

```
TOIT/
├── SISTEMAS/           # Aplicações principais
│   ├── portal-toit/   # SSO Gateway
│   ├── oms-blueworld/ # Order Management
│   ├── tradia/        # Trading System  
│   └── easis-erp/     # ERP System
│
├── PACKAGES/          # Bibliotecas compartilhadas
│   ├── auth-lib/      # Autenticação
│   ├── ui-components/ # Componentes UI
│   ├── design-system/ # Design System
│   └── utils/         # Utilitários
│
├── SERVICES/          # Microsserviços
│   ├── auth-service/
│   ├── notification-service/
│   └── analytics-service/
│
├── INFRASTRUCTURE/    # Deploy e infraestrutura
├── DOCS/             # Documentação
└── TOOLS/            # Scripts e ferramentas
```

## 🔐 Sistema SSO

### Login
- **CPF**: 123.456.789-00  
- **Senha**: 123456
- **Tenant**: blueworld (auto-detectado)

### Fluxo
1. Login no Portal TOIT
2. Token JWT com contexto tenant/sistema
3. Acesso automático a todos os sistemas
4. Session management centralizado

## 🗄️ Banco de Dados

### Schema Padronizado
Todas as tabelas têm campos obrigatórios:
- **Contexto**: `tenant_id`, `perfil`, `aplicacao`, `contexto`  
- **Flexibilidade**: `campo1-5` para futuras necessidades
- **Auditoria**: `created_at`, `updated_at`, `created_by`, etc.

### Ambientes
- **DEV**: PostgreSQL + Redis (Railway)
- **TEST**: PostgreSQL + Redis (Railway)
- **PROD**: PostgreSQL + Redis (Railway)

## 🔍 Monitoramento

### Health Checks
- Portal: `/health`
- OMS: `/api/health`  
- Tradia: `/api/health`

### Logs
```bash
# Railway
railway logs --follow

# Local
npm run dev  # Mostra logs em tempo real
```

## 📚 Documentação

### Arquitetura
- [Sistema SSO](DOCS/SISTEMA_SSO_PORTAL_TOIT.md)
- [Multi-tenant](DOCS/ARQUITETURA_MULTITENANT_TOIT.md)
- [Setup Completo](DOCS/SETUP_SSO_PORTAL_TOIT.md)

### Deploy
- [GitHub Actions](.github/workflows/)
- [Railway Config](railway.toml)

## 🛡️ Segurança

- JWT tokens com expiração (8h)
- Refresh tokens HttpOnly (30 dias)
- Rate limiting (100 req/15min)
- CSRF protection
- Audit logs completos
- Input validation

## 🎯 Status do Projeto

### ✅ Implementado
- [x] Sistema SSO multi-tenant
- [x] Portal TOIT (Gateway)
- [x] Database schema padronizado
- [x] CI/CD para 3 ambientes
- [x] JWT + Redis sessions
- [x] Interface de login moderna

### 🚧 Em Desenvolvimento
- [ ] Integração OMS Blue World
- [ ] Sistema de tickets
- [ ] Dashboard administrativo
- [ ] Trad.ia MVP
- [ ] Easis ERP planejamento

### 🔮 Roadmap
- [ ] Mobile apps
- [ ] API webhooks  
- [ ] Billing/usage tracking
- [ ] Advanced analytics
- [ ] White-label solutions

## 📞 Suporte

### Ambientes
- **Development**: Deploy automático via `dev` branch
- **Test**: Deploy automático via `test` branch  
- **Production**: Deploy manual via `main` branch

### Contato
- **GitHub**: https://github.com/victorcalife/TOIT
- **Railway**: [Dashboard do projeto TOIT]
- **Docs**: Pasta `/DOCS` neste repo

---

**🎯 TOIT - Transformando tecnologia em resultados empresariais**

*Sistema enterprise pronto para múltiplos clientes com SSO unificado*