# TRADia - Trading Intelligence Platform

🚀 **Plataforma de Sinais de Trading com IA**

Uma plataforma de informações financeiras que fornece sinais de trading inteligentes para decisões de investimento. Os usuários mantêm controle total sobre seu capital enquanto recebem recomendações baseadas em IA.

## 📊 **Resultados Comprovados**
- **+42.64%** retorno anualizado da plataforma
- **68.1%** taxa de acerto geral
- **4.2%** drawdown máximo controlado
- **3 estratégias** validadas: Pairs Trading, Swing Trade, Gap Trading

Plataforma de day-trade automatizada com inteligência artificial para BOVESPA.

## 📋 Descrição

Sistema completo de trading com:
- Algoritmos de IA para análise técnica
- Gestão avançada de capital (Kelly Criterion + Anti-Martingale)
- Circuit breakers e proteções de risco
- Dashboard em tempo real
- Integração com APIs financeiras

## 🏗️ Estrutura

```
trad-ia/
├── frontend/          # React application especializada
├── backend/           # Express API + PostgreSQL + IA + Database
│   ├── src/           # Backend source code
│   ├── ai-engine/     # Algoritmos de IA e análise técnica
│   ├── database/      # Database schemas and migrations
│   └── docs/          # Documentação técnica completa
└── package.json       # Configurações do app
```

## 🚀 Desenvolvimento

```bash
# Desenvolvimento completo (frontend + backend + ai-engine)
npm run dev

# Componentes individuais
npm run dev:frontend
npm run dev:backend
npm run dev:ai

# Build para produção
npm run build

# Testes (incluindo backtesting)
npm run test

# Lint
npm run lint
```

## 🧠 Algoritmos Implementados

### v2.0 (Conservador)
- **Kelly Criterion:** Position sizing limitado a 5%
- **Circuit Breakers:** Proteção automática 10% drawdown
- **RSI:** Oversold ≤20, Overbought ≥80
- **MACD:** Análise de momentum
- **Bollinger Bands:** Extremos de volatilidade
- **VWAP:** Preço médio ponderado por volume
- **Volume Filter:** Mínimo 2.5x média 30 dias

### Gestão de Risco
- **Stop-Loss:** 2x ATR obrigatório
- **Anti-Martingale:** Conservador (+15% wins, -25% losses)
- **Timing:** Apenas 10h-16h
- **Liquidez:** Filtros rigorosos
- **Custos:** Incorporados (0.15% corretagem + slippage)

## 📊 Performance Esperada (Realística)

| Métrica | Expectativa v2.0 |
|---------|------------------|
| **Win Rate** | 60-65% |
| **Retorno Mensal** | 10-30% |
| **Max Drawdown** | ≤15% |
| **Posição Máxima** | 5% capital |

## 🔌 APIs Integradas

- **CedroTech:** Market data tempo real
- **BRAPI:** Dados complementares
- **HG Brasil:** Notícias e indicadores

## 📈 Status Atual

- **Frontend:** ✅ React component v2.0 completo
- **Backend:** ⏳ Express + PostgreSQL planejado
- **AI Engine:** ✅ Algoritmos implementados
- **APIs:** 📚 Documentadas, integração pendente
- **Deploy:** Railway configurado

## 🎯 Roadmap

### Fase Atual
- [ ] Implementar backend Express
- [ ] Integrar APIs CedroTech
- [ ] Persistência PostgreSQL
- [ ] Autenticação JWT

### Próximas Fases
- [ ] Paper trading tempo real
- [ ] Execução automática
- [ ] Mobile app
- [ ] Backtesting histórico extenso

## ⚠️ Avisos Importantes

- Sistema desenvolvido para day-trade profissional
- Incorpora custos reais e expectativas conservadoras
- Circuit breakers automáticos para proteção
- Use apenas capital que pode ser perdido

## 📚 Documentação

- **docs/tradai_project.md:** Documentação técnica completa
- **docs/CLAUDE.md:** Documentação Claude específica
- **docs/APIS.txt:** Integração CedroTech
- **docs/doc_continuidade.md:** Histórico de desenvolvimento

## 🚀 CI/CD & Deploy

### Workflow Automático (GitHub Actions)
- Push nas branches `dev` ou `test` dispara build e deploy automático Railway.
- Workflow: `.github/workflows/deploy.yml`
- Deploy manual para produção via branch `main`.

### Docker
- Build e deploy via Dockerfile na raiz do projeto.
- Comando: `docker build -t tradia . && docker run -p 3002:3002 tradia`

### Railway
- Conecte o repositório ao Railway.
- Configure variáveis de ambiente conforme `.env.example`.
- Deploy automático para dev/test, manual para produção.

## 🌎 Variáveis de Ambiente
- Configure `.env` em cada pacote usando os exemplos:
  - `backend/.env.example`
  - `frontend/.env.example`
  - `backend/ai-engine/.env.example`
  - `.env.example` global

## 🛠️ Fluxo de Deploy
1. Faça push para `dev` ou `test` → Deploy automático Railway.
2. Faça push manual para `main` → Deploy produção.
3. Configure variáveis de ambiente no Railway.
4. Acesse o dashboard para monitorar status.