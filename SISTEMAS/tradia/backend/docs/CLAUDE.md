# CLAUDE.md - TOIT/SOLUCOES/Trad.ia

**v2.1.0** | **Atualizado:** 2025-07-21 | **Mudança:** Documentação completa integrada ao ecossistema TOIT

---

## 📊 INFORMAÇÕES DO PROJETO

**Nome:** Trad.ia - Plataforma Day-Trade BOVESPA com IA  
**Cliente:** TOIT - Portfólio de Soluções  
**Descrição:** Sistema de trading automatizado com inteligência artificial para day-trade na BOVESPA  
**Arquitetura:** React + Node.js + PostgreSQL + APIs Financeiras  
**Status:** 85% - MVP v2.0 desenvolvido com algoritmos refinados  
**Última atualização:** 2025-07-21 - Integração com ecossistema TOIT

### 🆔 Identificação do Arquivo
- ✅ **PROJETO ATIVO:** Sistema em desenvolvimento com documentação completa
- ✅ **INTEGRADO:** Parte do portfólio de soluções TOIT

---

## 🏗️ ARQUITETURA TÉCNICA

### Stack Tecnológica
**Frontend:**
- **Framework:** React com TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS
- **State:** useState/useCallback hooks
- **Icons:** Lucide React

**Backend:**
- **Framework:** Node.js + Express (planejado)
- **Language:** JavaScript/TypeScript
- **Database:** PostgreSQL (planejado)
- **APIs:** CedroTech, BRAPI, HG Brasil
- **Auth:** JWT (planejado)

**Deploy:**
- **Frontend:** Vercel/Railway
- **Backend:** Railway
- **Database:** Railway PostgreSQL

### Estrutura do Projeto
```
/Trad.ia/
├── CLAUDE.md                   # Este arquivo
├── tradai_project.md           # Documentação técnica completa
├── CLAUDE-Standard.md          # Template base TOIT
├── doc_continuidade.md         # Histórico de sessão 001
├── APIS.txt                    # Documentação APIs CedroTech
├── daytrade_platform.tsx       # Componente principal React
├── Backend/                    # Pasta vazia - implementar
└── Frontend/                   # Pasta vazia - organizar
```

---

## 🔐 SISTEMA DE HIERARQUIA E PERMISSÕES

### Perfis e Acessos
- **TRADER_INDIVIDUAL:** Acesso completo à plataforma, capital próprio
- **FUND_MANAGER:** Gestão de múltiplas contas, relatórios avançados
- **ADMIN:** Configuração de parâmetros, métricas globais

### Validação de Acesso
```javascript
// Frontend - Verificação de permissões
const podeGerenciarFundos = usuario?.perfil === "FUND_MANAGER";
const podeConfigurar = usuario?.perfil === "ADMIN";

// Backend - Middleware de autenticação (planejado)
// Implementar validação de perfil nas rotas de trading
```

---

## 📋 MÓDULOS FUNCIONAIS

### 🧠 ANÁLISE_TÉCNICA
- **Arquivos:** `daytrade_platform.tsx` (algoritmos de indicadores)
- **Acesso:** Todos os usuários autenticados
- **Status:** ✅ Completo e funcional
- **Funcionalidades:** RSI, MACD, Bollinger Bands, VWAP, Volume Analysis

### 💰 GESTÃO_CAPITAL
- **Arquivos:** `daytrade_platform.tsx` (Kelly Criterion + Anti-Martingale)
- **Acesso:** Todos os usuários
- **Status:** ✅ Completo v2.0 conservador
- **Funcionalidades:** Kelly limitado 5%, Circuit Breakers, Position Sizing

### 📊 DASHBOARD_TRADING
- **Arquivos:** `daytrade_platform.tsx` (interface principal)
- **Acesso:** Todos os usuários
- **Status:** ✅ Completo com métricas avançadas
- **Funcionalidades:** Sinais, histórico, métricas de performance, alertas

### 🔌 INTEGRAÇÃO_APIS
- **Arquivos:** `APIS.txt`, integração planejada
- **Acesso:** Sistema (backend)
- **Status:** ⏳ Documentado, implementação pendente
- **Funcionalidades:** CedroTech Market Data, autenticação, dados tempo real

---

## 🗄️ BANCO DE DADOS

### Tabelas Principais
```sql
-- Principais entidades do sistema
users              # Dados dos traders
trading_sessions   # Sessões de trading
trades             # Histórico de operações
portfolio_stats    # Métricas de performance
market_data        # Cache de dados de mercado
signals            # Sinais gerados pela IA
risk_events        # Eventos de risco (circuit breakers)
```

### Nomenclatura e Padrões
```javascript
// Convenções estabelecidas:
// Tabelas: snake_case
// Campos: snake_case no backend, camelCase no frontend
// Variáveis React: camelCase
// Componentes: PascalCase
```

---

## 🌐 API ENDPOINTS PRINCIPAIS

### Autenticação
- `POST /api/auth/login` - Login de trader
- `POST /api/auth/logout` - Logout seguro

### Trading
- `GET /api/market/data` - Dados de mercado tempo real
- `POST /api/signals/analyze` - Gerar sinais de trading
- `POST /api/trades/execute` - Executar operação (futuro)
- `GET /api/portfolio/stats` - Estatísticas de performance

### Gestão de Risco
- `GET /api/risk/status` - Status atual de risco
- `POST /api/risk/circuit-breaker` - Ativar/desativar proteções

---

## 🔧 COMANDOS DE DESENVOLVIMENTO

### Frontend
```bash
cd Frontend
npm install                    # Instalar dependências
npm run dev                   # Desenvolvimento local
npm run build                 # Build para produção
npm run preview               # Preview do build
npm run lint                  # Verificar código
```

### Backend (Planejado)
```bash
cd Backend
npm install                   # Instalar dependências
npm start                     # Servidor em produção
npm run dev                   # Desenvolvimento local
npm run lint                  # Verificar código
npm run test                  # Executar testes
```

### Database (Planejado)
```bash
# Comandos PostgreSQL + Prisma
npx prisma migrate dev        # Aplicar migrações
npx prisma generate          # Gerar cliente
npx prisma studio            # Interface visual
```

---

## 📊 STATUS ATUAL COMPLETO

### ✅ Funcionalidades Implementadas (v2.0)
- ✅ **GESTÃO_CAPITAL:** Kelly Criterion limitado 5%, Anti-Martingale conservador
- ✅ **ANÁLISE_TÉCNICA:** RSI ≤20/≥80, MACD, Bollinger, VWAP, Volume 2.5x
- ✅ **PROTEÇÃO_RISCO:** Circuit breaker 10% diário, stop-loss 2x ATR obrigatório
- ✅ **INTERFACE_TRADING:** Dashboard completo com métricas avançadas
- ✅ **SIMULAÇÃO_REALÍSTICA:** Custos reais, win rate 60-65%, expectativas calibradas
- ✅ **SISTEMA_SCORING:** Scoring ponderado com confiança mínima 75%

### ⚠️ Funcionalidades Parciais
- ⏳ **BACKEND_API:** Estrutura planejada, implementação pendente
- ⏳ **INTEGRAÇÃO_DADOS:** APIs documentadas, conexão pendente
- ⏳ **PERSISTÊNCIA:** Histórico simulado, banco de dados pendente
- ⏳ **AUTENTICAÇÃO:** Sistema planejado, implementação pendente

### 🔮 Funcionalidades Futuras
- **PAPER_TRADING:** Simulação com dados reais tempo real
- **EXECUÇÃO_AUTOMÁTICA:** Integração com corretoras
- **MOBILE_APP:** Versão mobile da plataforma
- **BACKTESTING_HISTÓRICO:** Validação com 2+ anos de dados
- **COMMUNITY_FEATURES:** Compartilhamento de sinais

---

## 🚨 PROBLEMAS CONHECIDOS E SOLUÇÕES

### BACKEND_AUSENTE (Status: PENDENTE)
**Problema:** Sistema frontend completo sem backend para persistência  
**Solução:** Implementar Express + PostgreSQL + APIs CedroTech  
**Status:** PENDENTE - Prioridade ALTA

### DADOS_SIMULADOS (Status: PENDENTE)
**Problema:** Market data simulado, necessita integração APIs reais  
**Solução:** Implementar CedroTech Market Data API conforme APIS.txt  
**Status:** PENDENTE - Prioridade ALTA

### CUSTOS_SIMULADOS (Status: RESOLVIDO)
**Problema:** V1.0 não considerava custos reais de trading  
**Solução:** V2.0 incorpora corretagem 0.15%, slippage 0.05-0.30%, impostos 15%  
**Status:** RESOLVIDO na versão atual

---

## 📚 DECISÕES TÉCNICAS IMPORTANTES

### Arquitetura
- **React Component:** Monolitico intencional para MVP, modularizar no backend
- **Algoritmos Conservadores:** Parâmetros restritivos para reduzir risco
- **Circuit Breakers:** Proteção automática prioritária sobre performance

### Gestão de Risco
- **Kelly Limitado:** Máximo 5% vs ilimitado para evitar posições irreais
- **Win Rate Realístico:** 60-65% vs 80% otimista da v1.0
- **Drawdown Controlado:** 10% diário, 15% total vs 67% inaceitável v1.0

### Integrações
- **CedroTech:** Escolhida por documentação completa e liquidez adequada
- **PostgreSQL:** Banco robusto para dados financeiros críticos
- **Railway:** Deploy simplificado integrado com ecossistema TOIT

---

## 📈 HISTÓRICO DE SESSÕES CRÍTICAS

### Sessão 001 - 2025-07-18 - Desenvolvimento MVP v1.0

**Contexto:** Desenvolvimento inicial da plataforma day-trade com IA

**Problemas Identificados:**
- Gestão de risco inadequada (drawdown 67%)
- Position sizing irreal (R$ 3MM com R$ 10k capital)
- Win rate otimista (80% vs realístico 60-65%)
- Ausência de custos de trading

**Soluções Implementadas:**
- Algoritmos de Kelly Criterion + Anti-Martingale
- Sistema de scoring multi-indicador
- Dashboard com métricas avançadas
- Backtest inicial 4 dias (+1.051% retorno)

**Progresso:**
1. ✅ MVP funcional desenvolvido
2. ✅ Análise crítica completa realizada
3. ✅ Refinamentos v2.0 identificados

### Sessão 002 - 2025-07-21 - Refinamento v2.0 + Integração TOIT

**Contexto:** Calibração conservadora + integração ao ecossistema TOIT

**Problemas Identificados:**
- Falta de documentação estruturada
- Ausência de backend real
- Necessidade de integração com padrões TOIT

**Soluções Implementadas:**
- Documentação CLAUDE.md completa
- Parâmetros conservadores calibrados
- Integração com workspace TOIT

**Progresso:**
1. ✅ Documentação completa criada
2. ✅ Padrões TOIT aplicados
3. ⏳ Backend pendente implementação

---

## 🎯 PRÓXIMAS AÇÕES PRIORITÁRIAS

### Sessão Atual
1. ✅ **DOCUMENTAÇÃO:** Criar CLAUDE.md integrado com TOIT
2. ⏳ **ESTRUTURA_BACKEND:** Implementar Express + PostgreSQL
3. ⏳ **INTEGRAÇÃO_APIS:** Conectar CedroTech Market Data

### Próximas Sessões
1. **PAPER_TRADING:** Implementar simulação com dados reais
2. **PERSISTÊNCIA:** Sistema completo de banco de dados
3. **AUTENTICAÇÃO:** JWT + perfis de usuário
4. **MOBILE_RESPONSIVO:** Otimização para dispositivos móveis

---

## 📊 ESTATÍSTICAS DO PROJETO

**Linhas de Código:**
- Frontend: ~850 linhas (daytrade_platform.tsx)
- Backend: ~0 linhas (pendente implementação)
- Total: ~850 linhas

**Arquivos:**
- Frontend: 1 arquivo principal + documentação
- Backend: 0 arquivos (pasta vazia)
- Documentação: 4 arquivos completos
- Total: 5 arquivos

**Funcionalidades:**
- 6 módulos de análise técnica
- 1 dashboard principal
- 3 APIs documentadas
- 8 tabelas planejadas
- 3 perfis de usuário

**Tempo de Desenvolvimento:**
- Projeto iniciado: 2025-07-18
- Sessão atual: 2025-07-21
- Status: 85% completo (falta backend)

---

## 🔒 REGRAS DE SEGURANÇA E PADRÕES

### Nomenclatura Obrigatória
```javascript
// Convenções específicas Trad.ia:
// - Tabelas banco: snake_case (users, trading_sessions)
// - Campos banco: snake_case (user_id, created_at)
// - Variáveis React: camelCase (portfolioStats, currentCapital)
// - Componentes: PascalCase (TradingPlatformV2)
// - Constantes: UPPER_SNAKE_CASE (CONSERVATIVE_PARAMS)
```

### Padrões de Código
- **Componentes:** PascalCase com sufixo descritivo
- **Arquivos:** camelCase para React, snake_case para backend
- **Funções:** camelCase descritivas (calculateKellyCriterion)
- **Constantes:** UPPER_SNAKE_CASE (TRADING_COSTS)

### Validações de Segurança
- **Frontend:** Validação de inputs financeiros, sanitização de dados
- **Backend:** Autenticação JWT, rate limiting APIs
- **Dados:** Sanitização SQL, validação de permissões por perfil

---

## ⚠️ ÁREAS CRÍTICAS - MODIFICAR COM CUIDADO

### Funcionalidades Core
- **ALGORITMOS_KELLY:** Lógica de position sizing crítica para proteção
- **CIRCUIT_BREAKERS:** Sistema de proteção contra perdas excessivas
- **SCORING_SYSTEM:** Engine de geração de sinais - cálculos sensíveis

### Configurações de Produção
- **CONSERVATIVE_PARAMS:** Parâmetros calibrados para reduzir risco
- **TRADING_COSTS:** Custos reais que impactam rentabilidade
- **RISK_LIMITS:** Limites que protegem contra perdas

---

## 📚 DECISÕES ARQUITETURAIS ESPECÍFICAS

### v1.0 → v2.0 Refinamentos Críticos
**Problema v1.0:** Parâmetros otimistas geravam expectativas irreais
**Solução v2.0:** Calibração conservadora baseada em dados reais
```javascript
// v1.0 Otimista:
RSI_OVERSOLD: 25, WIN_RATE: 80%, MAX_DRAWDOWN: Ilimitado

// v2.0 Conservador:
RSI_OVERSOLD: 20, WIN_RATE: 60-65%, MAX_DRAWDOWN: 10% daily
```

### Gestão de Capital Científica
**Decisão:** Kelly Criterion + Anti-Martingale limitados
**Justificativa:** Proteção contra over-leverage mantendo crescimento exponencial

### Sistema de Proteção Multi-Camada
**Decisão:** Circuit breakers + position limits + timing filters
**Justificativa:** Trading automatizado exige proteções redundantes

---

## 🔄 PROTOCOLO DE ATUALIZAÇÃO ESPECÍFICO

### TRIGGERS OBRIGATÓRIOS TRAD.IA:
1. **📊 Mudança em algoritmos:** Atualizar versão + documentar parâmetros
2. **💰 Alteração custos:** Recalibrar expectativas + alertar usuários
3. **🛡️ Modificação proteções:** Teste rigoroso + aprovação dupla
4. **📈 Nova métrica:** Documentar cálculo + impacto na interface
5. **🔌 Integração API:** Atualizar fluxos + documentar endpoints

### CRITÉRIOS ESPECÍFICOS TRAD.IA:
- ✅ Alteração em parâmetros de risco
- ✅ Mudança em algoritmos de trading
- ✅ Integração de novas APIs
- ✅ Modificação de interface
- ✅ Calibração de expectativas

---

## 🎓 LIÇÕES APRENDIDAS ESPECÍFICAS

### 🧮 Algoritmos Financeiros
- **Problema:** Parâmetros otimistas geram backtest enganoso
- **Solução:** Calibração conservadora + incorporação de custos reais
- **Implementação:** Conservative params object + realistic simulation

### 💼 Position Sizing
- **Problema:** Kelly Criterion puro gera posições irreais
- **Solução:** Kelly limitado + verificação de liquidez
- **Implementação:** Maximum 5% per trade + liquidity checks

### 🛡️ Gestão de Risco
- **Problema:** Drawdowns excessivos destroem capital
- **Solução:** Circuit breakers automáticos + multiple protection layers
- **Implementação:** Daily 10% + total 15% limits

---

## 🚀 INTEGRAÇÃO ECOSSISTEMA TOIT

### Relação com Outros Projetos TOIT
- **Portal Principal:** Trad.ia como solução do portfólio
- **Identidade Visual:** Aplicar paleta e fontes TOIT
- **Autenticação:** Integrar com sistema auth central
- **Deploy:** Usar Railway configurado para TOIT

### Padrões TOIT Aplicados
- **Documentação:** CLAUDE.md seguindo template padrão
- **Nomenclatura:** Consistente com outros projetos
- **Arquitetura:** Stack alinhada (React + Node.js + PostgreSQL)
- **Deploy:** Railway integrado

---

**✨ Trad.ia - Plataforma Day-Trade BOVESPA com IA v2.0 ✨**

*Documentação atualizada em: 2025-07-21*  
*Integrada ao ecossistema TOIT*  
*Pronta para implementação backend + APIs reais*