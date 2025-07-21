# Trad.ia - Trading Intelligence Platform

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
├── backend/           # Express API + PostgreSQL
├── ai-engine/         # Algoritmos de IA e análise técnica
├── docs/              # Documentação técnica completa
└── package.json       # Configurações do app
```

## 🚀 Desenvolvimento

```bash
# Desenvolvimento completo (frontend + backend + ai-engine)
npm run dev

# Componentes individuais
npm run dev:frontend
npm run dev:backend
npm run dev:ai-engine

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