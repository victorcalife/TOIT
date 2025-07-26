# TOIT - NOVA ESTRUTURA ORGANIZACIONAL

## 🏢 VISÃO EMPRESARIAL HIERÁRQUICA

```
TOIT (STARTUP/EMPRESA)
├── 1.1 - INSTITUCIONAL (Página e Captação)
├── 1.2 - ITMS (Sistema Interno de Gestão)
└── 1.3 - SISTEMAS/PRODUTOS
    ├── 1.3.1 - Portal TOIT (Área do Cliente)
    ├── 1.3.2 - OMS (Blue World - Sistema Existente)
    ├── 1.3.3 - Trad.ia (Plataforma de Trading)
    └── 1.3.4 - Easis (ERP Integrado)
```

## 📁 ESTRUTURA DE DIRETÓRIOS REORGANIZADA

```
/TOIT-ENTERPRISE/
├── README.md
├── package.json
├── turbo.json
├── tsconfig.json
├── railway.toml
│
├── 📄 DOCS/
│   ├── EMPRESA/
│   │   ├── TOIT-ECOSYSTEM-VISION.md
│   │   ├── BUSINESS-MODEL.md
│   │   └── ROADMAP.md
│   ├── TECNOLOGIA/
│   │   ├── ARCHITECTURE.md
│   │   ├── SECURITY.md
│   │   └── DEPLOYMENT.md
│   └── PROJETOS/
│       ├── CLAUDE.md (instruções gerais)
│       └── [projeto-específico]/
│
├── 🎨 ASSETS/
│   ├── branding/
│   │   ├── logos/
│   │   ├── cores/
│   │   └── guidelines/
│   ├── icons/
│   └── fonts/
│
├── 🏢 INSTITUCIONAL/
│   ├── website/
│   │   ├── index.html (página principal)
│   │   ├── sobre.html
│   │   ├── produtos.html
│   │   ├── contato.html
│   │   └── assets/
│   ├── marketing/
│   └── legal/
│
├── 🖥️ ITMS/ (Internal Technology Management System)
│   ├── backend/
│   ├── frontend/
│   └── docs/
│
├── 🏗️ SISTEMAS/
│   │
│   ├── portal-toit/
│   │   ├── backend/
│   │   ├── frontend/
│   │   ├── docs/
│   │   └── package.json
│   │
│   ├── oms-blueworld/
│   │   ├── backend/
│   │   ├── frontend/
│   │   ├── docs/
│   │   └── package.json
│   │
│   ├── tradia/
│   │   ├── backend/
│   │   ├── frontend/
│   │   ├── ai-engine/
│   │   ├── docs/
│   │   └── package.json
│   │
│   └── easis-erp/
│       ├── backend/
│       ├── frontend/
│       ├── docs/
│       └── package.json
│
├── 📦 PACKAGES/
│   ├── ui-components/
│   ├── auth-lib/
│   ├── utils/
│   ├── types/
│   └── design-system/
│
├── ⚙️ SERVICES/
│   ├── auth-service/
│   ├── payment-service/
│   ├── notification-service/
│   ├── analytics-service/
│   └── shared-database/
│
├── 🛠️ TOOLS/
│   ├── scripts/
│   ├── deployment/
│   └── monitoring/
│
└── 🚀 INFRASTRUCTURE/
    ├── docker/
    ├── kubernetes/
    ├── terraform/
    └── railway/
```

## 🎯 REORGANIZAÇÃO ESPECÍFICA

### 1.1 - INSTITUCIONAL
- **Objetivo**: Apresentar a TOIT como empresa
- **Conteúdo**: Site institucional, captação de clientes, brand
- **Tecnologia**: HTML/CSS/JS estático (performance)

### 1.2 - ITMS (Internal Technology Management System)
- **Objetivo**: Gestão interna da TOIT (funcionários, projetos, metrics)
- **Funcionalidades**:
  - Dashboard executivo
  - Gestão de projetos internos
  - Monitoramento de todos os sistemas
  - Análise de performance dos produtos
  - Gestão de clientes enterprise

### 1.3.1 - Portal TOIT (Área do Cliente)
- **Objetivo**: Single Sign-On para todos os produtos TOIT
- **Funcionalidades**:
  - Login unificado
  - Dashboard do cliente
  - Acesso aos sistemas contratados
  - Billing unificado
  - Suporte centralizado

### 1.3.2 - OMS Blue World
- **Status**: Sistema existente, será integrado
- **Objetivo**: Trazer para arquitetura TOIT
- **Integração**: Portal TOIT → OMS Blue World

### 1.3.3 - Trad.ia
- **Objetivo**: Plataforma de sinais de trading
- **Status**: Em desenvolvimento
- **Integração**: Portal TOIT → Trad.ia

### 1.3.4 - Easis ERP
- **Objetivo**: Sistema de gestão empresarial
- **Status**: Planejado
- **Módulos**: Financeiro, Estoque, Vendas, etc.

## 🔄 BENEFÍCIOS DA NOVA ESTRUTURA

### 1. CLAREZA ORGANIZACIONAL
- Cada diretório tem propósito claro
- Hierarquia reflete estrutura empresarial
- Fácil navegação para novos desenvolvedores

### 2. ESCALABILIDADE
- Novos produtos facilmente adicionados
- Estrutura suporta crescimento
- Separação clara de responsabilidades

### 3. MANUTENIBILIDADE
- Código organizado por domínio
- Packages compartilhados centralizados
- Documentação estruturada

### 4. CI/CD OTIMIZADO
- Build targets bem definidos
- Deploy independente por sistema
- Monorepo com Turborepo otimizado

### 5. EXPERIÊNCIA DO DESENVOLVEDOR
- Estrutura intuitiva
- Comandos npm organizados
- Ambiente de desenvolvimento claro

## 🚀 PRÓXIMOS PASSOS

1. **Backup da estrutura atual**
2. **Migração gradual dos arquivos**
3. **Atualização dos scripts npm**
4. **Teste de build/deploy**
5. **Documentação atualizada**
6. **Configuração Railway para nova estrutura**

## 📝 COMANDOS ATUALIZADOS

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    
    // Por sistema
    "institucional:dev": "turbo run dev --filter=institucional",
    "itms:dev": "turbo run dev --filter=itms",
    "portal:dev": "turbo run dev --filter=portal-toit",
    "oms:dev": "turbo run dev --filter=oms-blueworld", 
    "tradia:dev": "turbo run dev --filter=tradia",
    "easis:dev": "turbo run dev --filter=easis-erp",
    
    // Grupos
    "sistemas:dev": "turbo run dev --filter=./SISTEMAS/*",
    "services:dev": "turbo run dev --filter=./SERVICES/*"
  }
}
```

Esta estrutura reflete exatamente sua visão empresarial e facilita o crescimento da TOIT!