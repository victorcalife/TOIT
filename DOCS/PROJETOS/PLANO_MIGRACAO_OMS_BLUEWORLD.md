# PLANO DE MIGRAÇÃO OMS BLUE WORLD PARA ARQUITETURA TOIT

## 🎯 OBJETIVO
Migrar o OMS Blue World (sistema em produção) para a nova arquitetura TOIT Enterprise, eliminando Prisma e integrando com o Portal TOIT unificado.

## 📊 ANÁLISE ATUAL DO OMS

### 🏗️ Estrutura Técnica Atual
```
OMS Blue World (Produção)
├── Backend (Node.js + Express)
│   ├── Prisma ORM + PostgreSQL
│   ├── Autenticação JWT própria
│   ├── Upload Google Drive
│   ├── Geração de relatórios (Puppeteer)
│   └── Emails (Nodemailer + Gmail API)
├── Frontend (React + Vite)
│   ├── Dashboard completo
│   ├── Gestão de usuários
│   ├── Ordens de Serviço
│   ├── Instalações
│   └── Relatórios
└── Database (PostgreSQL Railway)
```

### 🔍 Funcionalidades Identificadas
1. **Gestão de Usuários** (Admin, Gestor, Comercial, Operador)
2. **Ordens de Serviço** (CRUD completo com workflow)
3. **Instalações** (Processo step-by-step com fotos)
4. **Relatórios HTML** (Geração automática com Puppeteer)
5. **Dashboard Analytics** (Métricas e KPIs)
6. **Notificações** (Sistema interno)
7. **Logs de Acesso** (Auditoria)
8. **Upload de Fotos** (Google Drive integrado)

## 🚀 ESTRATÉGIA DE MIGRAÇÃO

### FASE 1: PREPARAÇÃO (Semana 1-2)
- [ ] Criar estrutura OMS na arquitetura TOIT
- [ ] Configurar database sem Prisma (PostgreSQL nativo)
- [ ] Criar package.json dedicado para OMS
- [ ] Backup completo do sistema atual

### FASE 2: BACKEND MIGRATION (Semana 3-4)
- [ ] Remover Prisma, implementar PostgreSQL nativo
- [ ] Integrar com auth-service TOIT
- [ ] Migrar APIs para padrão Express TOIT
- [ ] Manter funcionalidades críticas intactas

### FASE 3: FRONTEND INTEGRATION (Semana 5-6)
- [ ] Integrar com Portal TOIT (SSO)
- [ ] Aplicar design-system TOIT
- [ ] Manter funcionalidades específicas OMS
- [ ] Testes de integração

### FASE 4: DEPLOY E TESTES (Semana 7-8)
- [ ] Ambiente de desenvolvimento integrado
- [ ] Testes com dados reais (ambiente staging)
- [ ] Validação com usuários Blue World
- [ ] Deploy produção com rollback plan

## 📁 NOVA ESTRUTURA OMS-BLUEWORLD

```
SISTEMAS/oms-blueworld/
├── package.json
├── README.md
├── .env.example
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── index.js
│   │   ├── config/
│   │   │   ├── database.js (PostgreSQL sem Prisma)
│   │   │   ├── auth.js (Integração TOIT Auth)
│   │   │   └── upload.js (Google Drive)
│   │   ├── controllers/
│   │   │   ├── usuarioController.js
│   │   │   ├── osController.js
│   │   │   ├── instalacaoController.js
│   │   │   └── relatorioController.js
│   │   ├── middleware/
│   │   │   ├── authTOIT.js
│   │   │   └── validation.js
│   │   ├── models/
│   │   │   └── queries/ (SQL nativo)
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── usuarios.js
│   │   │   ├── ordens.js
│   │   │   └── instalacoes.js
│   │   └── services/
│   │       ├── emailService.js
│   │       ├── driveService.js
│   │       └── reportService.js
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── components/
│   │   │   └── (mantidos do atual)
│   │   ├── pages/
│   │   │   └── (adaptados para TOIT)
│   │   ├── hooks/
│   │   │   └── useTOITAuth.js
│   │   └── utils/
│   │       └── toitApi.js
└── docs/
    ├── MIGRATION.md
    ├── API.md
    └── USER_GUIDE.md
```

## 🔧 MUDANÇAS TÉCNICAS PRINCIPAIS

### 1. ELIMINAÇÃO DO PRISMA
```javascript
// ANTES (Prisma)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const user = await prisma.usuario.findUnique({
  where: { cpf: cpfLogin }
});

// DEPOIS (PostgreSQL nativo)
const { Pool } = require('pg');
const db = require('@toit/shared-database');

const user = await db.query(
  'SELECT * FROM usuario WHERE cpf = $1',
  [cpfLogin]
);
```

### 2. INTEGRAÇÃO COM AUTH TOIT
```javascript
// ANTES (JWT próprio)
const token = jwt.sign({ userId }, process.env.JWT_SECRET);

// DEPOIS (Auth Service TOIT)
const authService = require('@toit/auth-lib');
const token = await authService.generateToken(userData);
```

### 3. SHARED DATABASE LAYER
```javascript
// Novo: @toit/shared-database
module.exports = {
  usuario: {
    findByCpf: async (cpf) => {
      return db.query('SELECT * FROM usuario WHERE cpf = $1', [cpf]);
    },
    create: async (userData) => {
      const query = `
        INSERT INTO usuario (nome, sobrenome, cpf, email, senha, perfil)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      return db.query(query, Object.values(userData));
    }
  }
};
```

### 4. PORTAL TOIT INTEGRATION
```jsx
// Frontend: Integração com Portal TOIT
import { useTOITAuth } from '@toit/auth-lib';

function OMSApp() {
  const { user, token } = useTOITAuth();
  
  // Verificar se usuário tem acesso ao OMS
  if (!user?.subscriptions?.includes('oms-blueworld')) {
    return <AccessDenied />;
  }

  return <OMSDashboard />;
}
```

## 📊 DATABASE MIGRATION PLAN

### 1. SCHEMA MIGRATION
```sql
-- Manter estruturas existentes
-- Adicionar campos de integração TOIT

ALTER TABLE usuario ADD COLUMN toit_user_id INTEGER;
ALTER TABLE usuario ADD COLUMN toit_subscription_id INTEGER;

-- Criar índices para performance
CREATE INDEX idx_usuario_toit_id ON usuario(toit_user_id);
CREATE INDEX idx_usuario_cpf ON usuario(cpf);
```

### 2. DATA INTEGRITY
- Backup completo antes da migração
- Scripts de validação pós-migração
- Rollback plan documentado

## 🔄 INTEGRAÇÃO COM PORTAL TOIT

### 1. SINGLE SIGN-ON (SSO)
```javascript
// Portal TOIT redirecionamento
if (user.hasAccess('oms-blueworld')) {
  window.location.href = '/sistemas/oms-blueworld';
}
```

### 2. BILLING INTEGRATION
- OMS aparece como produto no Portal TOIT
- Billing unificado
- Analytics consolidadas

### 3. SUPPORT INTEGRATION  
- Tickets OMS no sistema TOIT
- Base de conhecimento unificada
- Suporte centralizado

## 🚦 MIGRATION STEPS DETALHADOS

### STEP 1: Configurar Ambiente
```bash
# Criar estrutura
mkdir -p SISTEMAS/oms-blueworld/{backend,frontend,docs}

# Copiar código atual
cp -r "C:/Users/victo/Desktop/Dodumentos Pessoais/Victor/Blue World/DEV/OMS/Backend/"* SISTEMAS/oms-blueworld/backend/
cp -r "C:/Users/victo/Desktop/Dodumentos Pessoais/Victor/Blue World/DEV/OMS/Frontend/"* SISTEMAS/oms-blueworld/frontend/

# Instalar dependências TOIT
npm install @toit/auth-lib @toit/ui-components @toit/utils
```

### STEP 2: Database Layer
```javascript
// Criar database adapter
// /PACKAGES/shared-database/oms-adapter.js

class OMSDatabase {
  constructor(dbPool) {
    this.db = dbPool;
  }

  async getUsuarios() {
    const result = await this.db.query(
      'SELECT * FROM usuario WHERE status = $1',
      ['ATIVADO']
    );
    return result.rows;
  }

  async createOrdemServico(osData) {
    const query = `
      INSERT INTO ordemservico (cliente, responsavel, telefone, criadorId)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await this.db.query(query, [
      osData.cliente,
      osData.responsavel, 
      osData.telefone,
      osData.criadorId
    ]);
    return result.rows[0];
  }
}
```

### STEP 3: Auth Integration
```javascript
// Middleware de autenticação TOIT
const authTOIT = require('@toit/auth-lib');

app.use('/api/oms', authTOIT.authenticate);
app.use('/api/oms', authTOIT.authorize(['oms-blueworld']));
```

### STEP 4: Frontend Integration
```jsx
// App.jsx principal
import { TOITProvider } from '@toit/auth-lib';
import { TOITDesignSystem } from '@toit/design-system';

function App() {
  return (
    <TOITProvider>
      <TOITDesignSystem>
        <OMSApplication />
      </TOITDesignSystem>
    </TOITProvider>
  );
}
```

## ⚠️ RISCOS E MITIGAÇÕES

### RISCO 1: Downtime do Sistema em Produção
**Mitigação:**
- Deploy Blue/Green com Railway
- Manter sistema atual até validação completa
- Rollback automatizado em caso de falha

### RISCO 2: Perda de Dados Durante Migração
**Mitigação:**
- Backup completo antes de qualquer alteração
- Scripts de validação de integridade
- Ambiente de staging com dados reais

### RISCO 3: Quebra de Funcionalidades Específicas
**Mitigação:**
- Testes funcionais completos
- Validação com usuários Blue World
- Checklist de funcionalidades críticas

### RISCO 4: Performance do Database sem Prisma
**Mitigação:**
- Connection pooling otimizado
- Queries indexadas
- Monitoring de performance

## 📈 BENEFÍCIOS PÓS-MIGRAÇÃO

### 1. ARQUITETURA UNIFICADA
- OMS integrado ao ecossistema TOIT
- Shared services (auth, database, uploads)
- Manutenção centralizada

### 2. EXPERIÊNCIA DO USUÁRIO
- Login único via Portal TOIT
- Design system consistente
- Navegação unificada

### 3. ESCALABILIDADE
- Sem dependência do Prisma
- Database otimizado
- Microservices ready

### 4. MAINTAINABILITY  
- Código padronizado TOIT
- Shared packages
- CI/CD integrado

## 📋 CHECKLIST DE VALIDAÇÃO

### PRÉ-DEPLOY
- [ ] Todos os endpoints funcionando
- [ ] Autenticação TOIT integrada
- [ ] Database migrado completamente
- [ ] Testes automatizados passando
- [ ] Performance equivalente

### PÓS-DEPLOY
- [ ] Sistema acessível via Portal TOIT
- [ ] Todas as funcionalidades operacionais
- [ ] Dados íntegros e consistentes
- [ ] Performance satisfatória
- [ ] Usuários validaram funcionalidades

### ROLLBACK PLAN
- [ ] Backup do database disponível
- [ ] Sistema anterior preservado
- [ ] Scripts de rollback testados
- [ ] Plano de comunicação preparado

## 🎯 CRONOGRAMA EXECUTIVO

```
SEMANA 1-2: Preparação e estruturação
SEMANA 3-4: Migração do backend (sem Prisma)
SEMANA 5-6: Integração frontend com Portal TOIT
SEMANA 7-8: Testes, validação e deploy

TOTAL: 8 semanas para migração completa
```

## 💰 ESTIMATIVA DE ESFORÇO

- **Backend Migration:** 40 horas
- **Frontend Integration:** 32 horas  
- **Database Migration:** 24 horas
- **Testing & Validation:** 16 horas
- **Documentation:** 8 horas

**TOTAL:** 120 horas (3 semanas full-time)

---

**PRÓXIMO PASSO:** Validação do plano e início da Fase 1 (Preparação)