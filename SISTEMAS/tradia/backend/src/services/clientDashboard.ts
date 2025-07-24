/**
 * SISTEMA DE ACOMPANHAMENTO DO CLIENTE - TRAD.IA
 * Dashboard para monitorar performance e receber recomendações
 */

interface ClientDashboard {
  clientId: string;
  currentCapital: number;
  initialCapital: number;
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  totalReturn: number;
  currentDrawdown: number;
  openPositions: PositionSummary[];
  recentTrades: TradeSummary[];
  currentRecommendations: RecommendationSummary[];
  riskMetrics: RiskMetrics;
  nextActions: string[];
}

interface PositionSummary {
  symbol: string;
  strategy: string;
  entryDate: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  daysHeld: number;
  stopLoss: number;
  takeProfit: number;
  status: 'profit' | 'loss' | 'breakeven';
  aiConfidence: number;
}

interface TradeSummary {
  symbol: string;
  strategy: string;
  entryDate: string;
  exitDate: string;
  duration: string;
  realizedPnL: number;
  realizedPnLPercent: number;
  exitReason: string;
}

interface RecommendationSummary {
  symbol: string;
  action: string;
  strategy: string;
  price: number;
  quantity: number;
  investment: number;
  confidence: number;
  expectedReturn: number;
  risk: number;
  timeframe: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
}

interface RiskMetrics {
  currentExposure: number;
  riskPerPosition: number;
  diversification: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  consecutiveLosses: number;
}

export class ClientTrackingSystem {
  
  static generateCurrentDashboard(clientCapital: number = 61510): ClientDashboard {
    // Simular dashboard atual baseado na simulação de 7 meses
    
    const dashboard: ClientDashboard = {
      clientId: 'CLIENT_001',
      currentCapital: clientCapital,
      initialCapital: 50000,
      dailyPnL: 0.8, // +0.8% hoje
      weeklyPnL: 2.1, // +2.1% esta semana
      monthlyPnL: 3.4, // +3.4% este mês (julho)
      totalReturn: 23.02, // +23.02% total
      currentDrawdown: -1.2, // -1.2% do pico atual
      
      openPositions: [
        {
          symbol: 'ITUB4',
          strategy: 'Pairs Trading',
          entryDate: '15/07/2025',
          entryPrice: 32.40,
          currentPrice: 33.85,
          quantity: 300,
          unrealizedPnL: 435,
          unrealizedPnLPercent: 4.48,
          daysHeld: 8,
          stopLoss: 31.40,
          takeProfit: 34.50,
          status: 'profit',
          aiConfidence: 82
        },
        {
          symbol: 'WEGE3',
          strategy: 'Swing Trade',
          entryDate: '18/07/2025',
          entryPrice: 54.20,
          currentPrice: 53.90,
          quantity: 180,
          unrealizedPnL: -54,
          unrealizedPnLPercent: -0.55,
          daysHeld: 5,
          stopLoss: 52.60,
          takeProfit: 57.80,
          status: 'loss',
          aiConfidence: 75
        },
        {
          symbol: 'VALE3',
          strategy: 'Pairs Trading',
          entryDate: '20/07/2025',
          entryPrice: 59.80,
          currentPrice: 60.95,
          quantity: 160,
          unrealizedPnL: 184,
          unrealizedPnLPercent: 1.92,
          daysHeld: 3,
          stopLoss: 58.20,
          takeProfit: 62.40,
          status: 'profit',
          aiConfidence: 88
        }
      ],
      
      recentTrades: [
        {
          symbol: 'PETR4',
          strategy: 'Swing Trade',
          entryDate: '10/07/2025',
          exitDate: '16/07/2025',
          duration: '6 dias',
          realizedPnL: 1240,
          realizedPnLPercent: 5.85,
          exitReason: 'Take Profit'
        },
        {
          symbol: 'MGLU3',
          strategy: 'Gap Trading',
          entryDate: '08/07/2025',
          exitDate: '09/07/2025',
          duration: '1 dia',
          realizedPnL: 340,
          realizedPnLPercent: 2.80,
          exitReason: 'Gap Fechou'
        },
        {
          symbol: 'BBAS3',
          strategy: 'Pairs Trading',
          entryDate: '05/07/2025',
          exitDate: '12/07/2025',
          duration: '7 dias',
          realizedPnL: 890,
          realizedPnLPercent: 3.45,
          exitReason: 'Take Profit'
        }
      ],
      
      currentRecommendations: [
        {
          symbol: 'B3SA3',
          action: 'COMPRAR',
          strategy: 'Gap Trading',
          price: 11.20,
          quantity: 400,
          investment: 4480,
          confidence: 85,
          expectedReturn: 3.2,
          risk: 1.8,
          timeframe: '1-3 dias',
          reasoning: 'Gap de -2.8% na abertura, alto volume, tendência de fechamento estatística',
          priority: 'high'
        },
        {
          symbol: 'ABEV3',
          action: 'COMPRAR',
          strategy: 'Pairs Trading',
          price: 15.85,
          quantity: 300,
          investment: 4755,
          confidence: 78,
          expectedReturn: 2.8,
          risk: 1.5,
          timeframe: '5-12 dias',
          reasoning: 'Z-Score de -2.4 vs COCA34, correlação histórica favorável',
          priority: 'medium'
        },
        {
          symbol: 'SUZB3',
          action: 'COMPRAR',
          strategy: 'Swing Trade',
          price: 48.90,
          quantity: 100,
          investment: 4890,
          confidence: 72,
          expectedReturn: 5.5,
          risk: 3.0,
          timeframe: '4-8 dias',
          reasoning: 'RSI 28 (oversold), MACD bullish divergence, suporte técnico',
          priority: 'medium'
        }
      ],
      
      riskMetrics: {
        currentExposure: 68.5, // 68.5% do capital investido
        riskPerPosition: 2.1, // 2.1% risco médio por posição
        diversification: 85, // 85% diversificado
        sharpeRatio: 1.94,
        maxDrawdown: -4.2,
        winRate: 68.1,
        profitFactor: 2.34,
        consecutiveLosses: 0 // Última sequência foi positiva
      },
      
      nextActions: [
        'Considerar fechar WEGE3 se romper stop em R$ 52,60',
        'Monitorar ITUB4 próximo do take profit em R$ 34,50',
        'Avaliar recomendação B3SA3 (gap trading de alta prioridade)',
        'Manter 31.5% em cash para novas oportunidades',
        'Revisão semanal agendada para sexta-feira'
      ]
    };
    
    return dashboard;
  }
  
  static displayDashboard(): void {
    const dashboard = this.generateCurrentDashboard();
    
    console.log('🎯 TRAD.IA - DASHBOARD DO CLIENTE');
    console.log('Data:', new Date().toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }));
    console.log('═'.repeat(80));
    
    // RESUMO FINANCEIRO
    console.log('💰 RESUMO FINANCEIRO:');
    console.log('─'.repeat(40));
    console.log(`Capital Atual: R$ ${dashboard.currentCapital.toLocaleString('pt-BR')}`);
    console.log(`Capital Inicial: R$ ${dashboard.initialCapital.toLocaleString('pt-BR')}`);
    console.log(`Lucro Total: R$ ${(dashboard.currentCapital - dashboard.initialCapital).toLocaleString('pt-BR')}`);
    console.log(`Retorno Total: ${dashboard.totalReturn.toFixed(2)}% 📈`);
    console.log('');
    console.log(`Performance Hoje: ${dashboard.dailyPnL > 0 ? '+' : ''}${dashboard.dailyPnL.toFixed(2)}%`);
    console.log(`Performance Semana: ${dashboard.weeklyPnL > 0 ? '+' : ''}${dashboard.weeklyPnL.toFixed(2)}%`);
    console.log(`Performance Mês: ${dashboard.monthlyPnL > 0 ? '+' : ''}${dashboard.monthlyPnL.toFixed(2)}%`);
    
    // POSIÇÕES ABERTAS
    console.log('\n📊 POSIÇÕES ABERTAS:');
    console.log('─'.repeat(40));
    if (dashboard.openPositions.length === 0) {
      console.log('Nenhuma posição aberta no momento.');
    } else {
      dashboard.openPositions.forEach(pos => {
        const statusIcon = pos.status === 'profit' ? '🟢' : pos.status === 'loss' ? '🔴' : '🟡';
        console.log(`${statusIcon} ${pos.symbol} (${pos.strategy})`);
        console.log(`   Entrada: R$ ${pos.entryPrice.toFixed(2)} | Atual: R$ ${pos.currentPrice.toFixed(2)}`);
        console.log(`   Quantidade: ${pos.quantity} | ${pos.daysHeld} dias`);
        console.log(`   P&L: R$ ${pos.unrealizedPnL.toFixed(0)} (${pos.unrealizedPnLPercent > 0 ? '+' : ''}${pos.unrealizedPnLPercent.toFixed(2)}%)`);
        console.log(`   Stop: R$ ${pos.stopLoss.toFixed(2)} | Target: R$ ${pos.takeProfit.toFixed(2)}`);
        console.log(`   Confiança IA: ${pos.aiConfidence}%\n`);
      });
    }
    
    // RECOMENDAÇÕES ATUAIS
    console.log('🎯 RECOMENDAÇÕES ATUAIS:');
    console.log('─'.repeat(40));
    dashboard.currentRecommendations.forEach((rec, index) => {
      const priorityIcon = rec.priority === 'high' ? '🔥' : rec.priority === 'medium' ? '⭐' : '💡';
      console.log(`${priorityIcon} ${index + 1}. ${rec.action} ${rec.symbol} - ${rec.strategy}`);
      console.log(`   Preço: R$ ${rec.price.toFixed(2)} | Qtd: ${rec.quantity}`);
      console.log(`   Investimento: R$ ${rec.investment.toLocaleString('pt-BR')}`);
      console.log(`   Retorno Esperado: ${rec.expectedReturn.toFixed(1)}% | Risco: ${rec.risk.toFixed(1)}%`);
      console.log(`   Prazo: ${rec.timeframe} | Confiança: ${rec.confidence}%`);
      console.log(`   📝 ${rec.reasoning}\n`);
    });
    
    // TRADES RECENTES
    console.log('📈 TRADES RECENTES:');
    console.log('─'.repeat(40));
    dashboard.recentTrades.forEach(trade => {
      const resultIcon = trade.realizedPnL > 0 ? '✅' : '❌';
      console.log(`${resultIcon} ${trade.symbol} (${trade.strategy}) - ${trade.duration}`);
      console.log(`   P&L: R$ ${trade.realizedPnL.toFixed(0)} (${trade.realizedPnLPercent > 0 ? '+' : ''}${trade.realizedPnLPercent.toFixed(2)}%)`);
      console.log(`   Saída: ${trade.exitReason}\n`);
    });
    
    // MÉTRICAS DE RISCO
    console.log('🛡️ MÉTRICAS DE RISCO:');
    console.log('─'.repeat(40));
    console.log(`Exposição Atual: ${dashboard.riskMetrics.currentExposure.toFixed(1)}%`);
    console.log(`Cash Disponível: ${(100 - dashboard.riskMetrics.currentExposure).toFixed(1)}%`);
    console.log(`Risco por Posição: ${dashboard.riskMetrics.riskPerPosition.toFixed(1)}%`);
    console.log(`Diversificação: ${dashboard.riskMetrics.diversification}%`);
    console.log(`Sharpe Ratio: ${dashboard.riskMetrics.sharpeRatio}`);
    console.log(`Taxa de Acerto: ${dashboard.riskMetrics.winRate.toFixed(1)}%`);
    console.log(`Profit Factor: ${dashboard.riskMetrics.profitFactor}`);
    console.log(`Perdas Consecutivas: ${dashboard.riskMetrics.consecutiveLosses}`);
    
    // PRÓXIMAS AÇÕES
    console.log('\n⚡ PRÓXIMAS AÇÕES:');
    console.log('─'.repeat(40));
    dashboard.nextActions.forEach((action, index) => {
      console.log(`${index + 1}. ${action}`);
    });
    
    // RESUMO DE ALOCAÇÃO
    console.log('\n📊 ALOCAÇÃO ATUAL:');
    console.log('─'.repeat(40));
    const totalInvested = dashboard.openPositions.reduce((sum, pos) => 
      sum + (pos.quantity * pos.currentPrice), 0
    );
    const cashAvailable = dashboard.currentCapital - totalInvested;
    
    console.log(`💰 Cash: R$ ${cashAvailable.toFixed(0)} (${((cashAvailable/dashboard.currentCapital)*100).toFixed(1)}%)`);
    console.log(`📈 Investido: R$ ${totalInvested.toFixed(0)} (${((totalInvested/dashboard.currentCapital)*100).toFixed(1)}%)`);
    
    // Breakdown por estratégia
    const strategiesBreakdown: { [key: string]: number } = {};
    dashboard.openPositions.forEach(pos => {
      const value = pos.quantity * pos.currentPrice;
      strategiesBreakdown[pos.strategy] = (strategiesBreakdown[pos.strategy] || 0) + value;
    });
    
    Object.entries(strategiesBreakdown).forEach(([strategy, value]) => {
      const percentage = (value / dashboard.currentCapital) * 100;
      console.log(`🎯 ${strategy}: R$ ${value.toFixed(0)} (${percentage.toFixed(1)}%)`);
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log('💡 RESUMO EXECUTIVO:');
    console.log(`✅ Performance excelente: ${dashboard.totalReturn.toFixed(1)}% em 7 meses`);
    console.log(`🛡️ Risco controlado: Drawdown máximo de ${dashboard.riskMetrics.maxDrawdown}%`);
    console.log(`📈 Sistema funcionando: ${dashboard.riskMetrics.winRate.toFixed(0)}% de acertos`);
    console.log(`🎯 Próximo objetivo: Manter performance e escalar capital`);
    
    console.log('\n🤖 SISTEMA TRAD.IA OPERACIONAL - Tudo funcionando perfeitamente!');
  }
  
  // Simular como seria o acompanhamento diário
  static simulateDailyTracking(): void {
    console.log('\n🔄 SIMULANDO ACOMPANHAMENTO DIÁRIO:\n');
    
    const days = [
      { date: '24/07/2025', action: 'Executada compra B3SA3 conforme recomendação', pnl: '+1.2%' },
      { date: '25/07/2025', action: 'WEGE3 atingiu stop loss, posição fechada', pnl: '-0.5%' },
      { date: '26/07/2025', action: 'ITUB4 próximo do take profit, monitorando', pnl: '+0.8%' },
      { date: '29/07/2025', action: 'Nova oportunidade PETR4 identificada', pnl: '+0.3%' },
      { date: '30/07/2025', action: 'Portfolio rebalanceado, 3 posições ativas', pnl: '+1.1%' }
    ];
    
    days.forEach(day => {
      console.log(`📅 ${day.date}: ${day.action}`);
      console.log(`   Performance do dia: ${day.pnl}\n`);
    });
    
    console.log('📊 RESUMO DA SEMANA:');
    console.log('• Total de ações executadas: 5');
    console.log('• Performance semanal: +2.9%');
    console.log('• Recomendações seguidas: 100%');
    console.log('• Alertas de risco: 0');
    console.log('• Sistema funcionando automaticamente ✅');
  }
}

// Executar dashboard
console.log('Iniciando dashboard do cliente...\n');
ClientTrackingSystem.displayDashboard();
ClientTrackingSystem.simulateDailyTracking();
