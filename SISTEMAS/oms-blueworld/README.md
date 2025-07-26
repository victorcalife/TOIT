# OMS Blue World - TOIT Integration

## 📋 Sobre
Sistema de Gestão de Ordens de Serviço desenvolvido para Blue World, agora integrado ao ecossistema TOIT Enterprise.

## 🎯 Status
- **Versão Original**: Produção ativa
- **Versão TOIT**: Cópia para migração (não interferir no original)
- **Database**: PostgreSQL + Railway
- **Status**: Em processo de integração TOIT

## 🏗️ Arquitetura Atual (Original)
```
OMS Blue World
├── Backend (Node.js + Express + Prisma)
├── Frontend (React + Vite + TailwindCSS)
└── Database (PostgreSQL Railway)
```

## 🎯 Arquitetura Alvo (TOIT Integration)
```
OMS Blue World TOIT
├── Backend (Node.js + Express + SQL nativo)
├── Frontend (React + TOIT Design System)
├── Auth (TOIT Auth Service)
└── Database (TOIT Shared Database)
```

## 🚀 Funcionalidades Principais
- ✅ **Gestão de Usuários** (Admin, Gestor, Comercial, Operador)
- ✅ **Ordens de Serviço** (Workflow completo)
- ✅ **Instalações** (Processo step-by-step)
- ✅ **Relatórios HTML** (Geração automática)
- ✅ **Upload Google Drive** (Fotos das instalações)
- ✅ **Dashboard Analytics** (KPIs e métricas)
- ✅ **Notificações** (Sistema interno)
- ✅ **Logs de Auditoria**

## 🔄 Processo de Migração

### FASE 1: CÓPIA E ANÁLISE ✅
- [x] Cópia do código original
- [x] Análise da estrutura atual
- [x] Documentação das dependências
- [x] Mapeamento das funcionalidades

### FASE 2: PREPARAÇÃO
- [ ] Configurar estrutura TOIT
- [ ] Remover Prisma, implementar SQL nativo
- [ ] Integrar com @toit/auth-lib
- [ ] Configurar @toit/shared-database

### FASE 3: FRONTEND INTEGRATION
- [ ] Aplicar @toit/design-system
- [ ] Integrar com Portal TOIT (SSO)
- [ ] Manter funcionalidades específicas
- [ ] Testes de usabilidade

### FASE 4: DEPLOY E VALIDAÇÃO
- [ ] Ambiente de desenvolvimento
- [ ] Testes com dados reais
- [ ] Validação usuários Blue World
- [ ] Deploy com rollback plan

## 📊 Database Schema Principal

### Tabelas Core
```sql
usuario (id, nome, sobrenome, cpf, email, perfil, status)
ordemservico (id, cliente, responsavel, telefone, status, datas)
instalacao (id, ordemServicoId, operadorId, fotos, status, steps)
relatorios_html (id, osId, clienteNome, htmlContent, urlRelatorio)
notificacao (id, titulo, mensagem, tipo, lida)
logacesso (id, usuarioId, dataHora, tipo)
```

### Enums
```sql
Perfil: ADMIN | GESTOR | COMERCIAL | OPERADOR
Status: ATIVADO | DESATIVADO | BLOQUEADO
StatusOS: ABERTA | LIBERADA | INICIADA | INSTALADA | CONCLUIDA | REJEITADA
```

## 🔧 Configuração Local

### Pré-requisitos
- Node.js >= 18.0.0
- npm >= 8.0.0
- PostgreSQL
- Google Cloud credentials (para upload)

### Instalação
```bash
# Na raiz do TOIT monorepo
npm install

# Desenvolvimento apenas OMS
npm run oms:dev

# Ou desenvolvimento de todos os sistemas
npm run sistemas:dev
```

### Variáveis de Ambiente
```bash
# Backend (.env)
DATABASE_PUBLIC_URL="postgresql://..."
JWT_SECRET="your-jwt-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REFRESH_TOKEN="your-refresh-token"

# Frontend (.env)
VITE_API_URL="http://localhost:8080"
VITE_TOIT_PORTAL_URL="http://localhost:3000"
```

## 📱 Principais Componentes Frontend

### Pages
- **Dashboard**: Métricas e KPIs
- **OrdensServico**: CRUD completo com workflow
- **Instalacoes**: Processo step-by-step
- **Relatorios**: Geração e visualização HTML
- **Usuarios**: Gestão de acesso
- **Configuracoes**: Sistema e perfil

### Components
- **CameraCapture**: Captura de fotos mobile
- **StandardReportTable**: Tabelas padronizadas
- **ConfirmModal**: Modais de confirmação
- **ThemeToggle**: Alternância dark/light

## 🛠️ APIs Principais

### Authentication
```javascript
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

### Ordens de Serviço
```javascript
GET    /api/ordens
POST   /api/ordens
PUT    /api/ordens/:id
DELETE /api/ordens/:id
```

### Instalações
```javascript
GET  /api/instalacoes/minhas
POST /api/instalacoes/:id/step
PUT  /api/instalacoes/:id/foto
```

### Relatórios
```javascript
GET  /api/relatorios/:osId
POST /api/relatorios/:osId/gerar
GET  /api/relatorios/:osId/download
```

## 🔐 Integração TOIT Auth

### Antes (JWT próprio)
```javascript
const token = jwt.sign({ userId }, process.env.JWT_SECRET);
```

### Depois (TOIT Auth)
```javascript
const authService = require('@toit/auth-lib');
const token = await authService.generateToken(userData);
```

## 🎨 Design System Integration

### Antes (TailwindCSS puro)
```jsx
<div className="bg-blue-500 text-white p-4 rounded">
  Botão
</div>
```

### Depois (TOIT Design System)
```jsx
import { Button } from '@toit/design-system';

<Button variant="primary" size="md">
  Botão
</Button>
```

## 📊 Métricas e KPIs
- Total de Ordens de Serviço
- Taxa de Conclusão
- Tempo Médio de Instalação
- Performance por Operador
- Satisfação do Cliente

## 🔍 Testing Strategy
```bash
# Testes unitários
npm run test:backend
npm run test:frontend

# Testes de integração
npm run test:integration

# Testes E2E
npm run test:e2e
```

## 📚 Documentação Adicional
- [PLANO_MIGRACAO_OMS_BLUEWORLD.md](../../PLANO_MIGRACAO_OMS_BLUEWORLD.md)
- [API Documentation](./docs/API.md)
- [User Guide](./docs/USER_GUIDE.md)

## 🚨 IMPORTANTE
⚠️ **Este é uma CÓPIA do sistema original**
⚠️ **NÃO fazer alterações que afetem a produção**
⚠️ **Sistema original está em**: `C:/Users/victo/Desktop/Dodumentos Pessoais/Victor/Blue World/DEV/OMS/`

## 👥 Contatos
- **Tech Lead**: Victor Calife
- **Cliente**: Blue World
- **Repositório Original**: GitHub Blue World OMS

---

*Parte do ecossistema TOIT Enterprise - "The One in Tech"*