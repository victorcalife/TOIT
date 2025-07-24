/**
 * PLATAFORMA DE SINAIS TRAD.IA
 * Sistema de informações e análises - Cliente gerencia próprio capital
 */

interface ClientPortfolio {
  clientId: string;
  initialCapital: number;
  currentCapital: number;
  lastUpdate: Date;
  broker: string;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
}

interface TradingSignal {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  strategy: string;
  price: number;
  targetPrice: number;
  stopPrice: number;
  confidence: number;
  reasoning: string;
  timeframe: string;
  riskLevel: 'low' | 'medium' | 'high';
  timestamp: Date;
  suggestedPosition: number; // % do capital
  suggestedAmount?: number; // R$ baseado no capital do cliente
}

interface ClientExecution {
  signalId: string;
  executed: boolean;
  executionPrice?: number;
  quantity?: number;
  executionDate?: Date;
  result?: 'profit' | 'loss' | 'open';
  realizedPnL?: number;
  notes?: string;
}

interface PerformanceComparison {
  period: string;
  clientReturn: number;
  platformReturn: number;
  clientFollowRate: number; // % de sinais seguidos
  clientWinRate: number;
  platformWinRate: number;
  tracking: {
    signalsGiven: number;
    signalsFollowed: number;
    clientProfit: number;
    potentialProfit: number; // Se seguisse 100%
  };
}

export class SignalsPlatform {
  
  static clientProfile: ClientPortfolio = {
    clientId: 'CLIENT_001',
    initialCapital: 50000,
    currentCapital: 61500, // Cliente atualizou
    lastUpdate: new Date(),
    broker: 'Rico',
    riskProfile: 'moderate'
  };

  static generateCurrentSignals(): TradingSignal[] {
    const now = new Date();
    const capital = this.clientProfile.currentCapital;
    
    return [
      {
        id: 'SIG_001',
        symbol: 'ITUB4',
        action: 'SELL',
        strategy: 'Take Profit - Swing Trade',
        price: 34.20,
        targetPrice: 34.80,
        stopPrice: 33.50,
        confidence: 85,
        reasoning: 'Ação atingiu resistência técnica forte. RSI em 78 (overbought). Recomenda-se realizar lucros.',
        timeframe: '1-2 dias',
        riskLevel: 'low',
        timestamp: new Date(now.getTime() - 10 * 60000),
        suggestedPosition: 3.5, // 3.5% do capital
        suggestedAmount: Math.round(capital * 0.035)
      },
      {
        id: 'SIG_002',
        symbol: 'B3SA3',
        action: 'BUY',
        strategy: 'Gap Trading',
        price: 11.20,
        targetPrice: 11.56,
        stopPrice: 10.95,
        confidence: 82,
        reasoning: 'Gap de -2.8% na abertura. Volume 3x acima da média. Estatisticamente 76% dos gaps fecham em 3 dias.',
        timeframe: '1-3 dias',
        riskLevel: 'medium',
        timestamp: new Date(now.getTime() - 15 * 60000),
        suggestedPosition: 4.0,
        suggestedAmount: Math.round(capital * 0.04)
      },
      {
        id: 'SIG_003',
        symbol: 'WEGE3',
        action: 'SELL',
        strategy: 'Stop Loss - Pairs Trading',
        price: 53.60,
        targetPrice: 0, // Stop loss não tem target
        stopPrice: 53.60,
        confidence: 95,
        reasoning: 'URGENTE: Rompeu suporte importante. Stop loss acionado para proteger capital.',
        timeframe: 'Imediato',
        riskLevel: 'high',
        timestamp: new Date(now.getTime() - 5 * 60000),
        suggestedPosition: 0, // Venda total da posição
        suggestedAmount: 0 // Venda de toda a posição existente
      },
      {
        id: 'SIG_004',
        symbol: 'PETR4',
        action: 'BUY',
        strategy: 'Swing Trade',
        price: 38.90,
        targetPrice: 41.20,
        stopPrice: 37.50,
        confidence: 78,
        reasoning: 'RSI em 25 (oversold) + MACD com divergência bullish. Suporte testado e confirmado.',
        timeframe: '5-8 dias',
        riskLevel: 'medium',
        timestamp: new Date(now.getTime() - 20 * 60000),
        suggestedPosition: 5.0,
        suggestedAmount: Math.round(capital * 0.05)
      },
      {
        id: 'SIG_005',
        symbol: 'ABEV3',
        action: 'BUY',
        strategy: 'Pairs Trading',
        price: 15.85,
        targetPrice: 16.30,
        stopPrice: 15.45,
        confidence: 72,
        reasoning: 'Z-Score -2.4 vs COCA34. Correlação histórica 87%. Divergência temporária para reversão.',
        timeframe: '7-12 dias',
        riskLevel: 'low',
        timestamp: new Date(now.getTime() - 30 * 60000),
        suggestedPosition: 3.0,
        suggestedAmount: Math.round(capital * 0.03)
      }
    ];
  }

  static simulateClientExecutions(): ClientExecution[] {
    return [
      {
        signalId: 'SIG_001',
        executed: true,
        executionPrice: 34.15,
        quantity: 60,
        executionDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        result: 'profit',
        realizedPnL: 180,
        notes: 'Executou parcialmente - vendeu 60 de 100 ações'
      },
      {
        signalId: 'SIG_002',
        executed: false,
        notes: 'Cliente optou por não seguir - gap muito pequeno'
      },
      {
        signalId: 'SIG_003',
        executed: true,
        executionPrice: 53.58,
        quantity: 180,
        executionDate: new Date(Date.now() - 12 * 60 * 60 * 1000),
        result: 'loss',
        realizedPnL: -108,
        notes: 'Stop loss executado automaticamente'
      },
      {
        signalId: 'SIG_004',
        executed: true,
        executionPrice: 38.95,
        quantity: 120,
        executionDate: new Date(Date.now() - 8 * 60 * 60 * 1000),
        result: 'open',
        notes: 'Posição aberta - aguardando desenvolvimento'
      },
      {
        signalId: 'SIG_005',
        executed: false,
        notes: 'Cliente não tinha cash disponível no momento'
      }
    ];
  }

  static calculatePerformanceComparison(): PerformanceComparison {
    const signals = this.generateCurrentSignals();
    const executions = this.simulateClientExecutions();
    
    const signalsGiven = signals.length;
    const signalsFollowed = executions.filter(e => e.executed).length;
    const followRate = (signalsFollowed / signalsGiven) * 100;
    
    // Simular resultados
    const clientTrades = executions.filter(e => e.executed && e.result !== 'open');
    const clientWins = clientTrades.filter(e => e.result === 'profit').length;
    const clientWinRate = clientTrades.length > 0 ? (clientWins / clientTrades.length) * 100 : 0;
    
    return {
      period: 'Últimos 30 dias',
      clientReturn: 2.5, // Cliente conseguiu 2.5%
      platformReturn: 3.8, // Plataforma indicou 3.8%
      clientFollowRate: followRate,
      clientWinRate: clientWinRate,
      platformWinRate: 68.1, // Win rate histórica da plataforma
      tracking: {
        signalsGiven: signalsGiven,
        signalsFollowed: signalsFollowed,
        clientProfit: 1537, // R$ ganhos pelo cliente
        potentialProfit: 2340 // R$ se seguisse 100% dos sinais
      }
    };
  }

  static displayPlatformDashboard(): void {
    const signals = this.generateCurrentSignals();
    const executions = this.simulateClientExecutions();
    const performance = this.calculatePerformanceComparison();
    
    console.log('📊 TRAD.IA - PLATAFORMA DE SINAIS E ANÁLISES');
    console.log('═'.repeat(80));
    console.log(`👤 Cliente: ${this.clientProfile.clientId}`);
    console.log(`💰 Capital Inicial: R$ ${this.clientProfile.initialCapital.toLocaleString('pt-BR')}`);
    console.log(`💰 Capital Atual: R$ ${this.clientProfile.currentCapital.toLocaleString('pt-BR')}`);
    console.log(`📈 Retorno Total: ${((this.clientProfile.currentCapital / this.clientProfile.initialCapital - 1) * 100).toFixed(2)}%`);
    console.log(`🏦 Corretora: ${this.clientProfile.broker}`);
    console.log(`⚖️ Perfil de Risco: ${this.clientProfile.riskProfile}`);
    
    // SINAIS ATUAIS
    console.log('\n🎯 SINAIS ATUAIS:');
    console.log('─'.repeat(60));
    signals.forEach((signal, index) => {
      const actionIcon = signal.action === 'BUY' ? '🟢' : signal.action === 'SELL' ? '🔴' : '🟡';
      const riskIcon = signal.riskLevel === 'low' ? '🟢' : signal.riskLevel === 'medium' ? '🟡' : '🔴';
      
      console.log(`\n${actionIcon} SINAL ${index + 1}: ${signal.action} ${signal.symbol}`);
      console.log(`📊 Estratégia: ${signal.strategy}`);
      console.log(`💵 Preço Atual: R$ ${signal.price.toFixed(2)}`);
      console.log(`🎯 Target: R$ ${signal.targetPrice.toFixed(2)} | Stop: R$ ${signal.stopPrice.toFixed(2)}`);
      console.log(`🎲 Confiança: ${signal.confidence}% | ${riskIcon} Risco: ${signal.riskLevel}`);
      console.log(`⏱️ Prazo: ${signal.timeframe}`);
      console.log(`💰 Valor Sugerido: R$ ${signal.suggestedAmount?.toLocaleString('pt-BR')} (${signal.suggestedPosition}% do capital)`);
      console.log(`📝 Análise: ${signal.reasoning}`);
      
      // Verificar se cliente executou
      const execution = executions.find(e => e.signalId === signal.id);
      if (execution) {
        if (execution.executed) {
          console.log(`✅ EXECUTADO: ${execution.quantity} ações a R$ ${execution.executionPrice?.toFixed(2)}`);
          if (execution.result && execution.result !== 'open') {
            const resultIcon = execution.result === 'profit' ? '✅' : '❌';
            console.log(`${resultIcon} Resultado: R$ ${execution.realizedPnL} (${execution.result})`);
          }
          if (execution.notes) console.log(`📝 Observação: ${execution.notes}`);
        } else {
          console.log(`❌ NÃO EXECUTADO: ${execution.notes}`);
        }
      } else {
        console.log(`⏳ AGUARDANDO DECISÃO DO CLIENTE`);
      }
    });
    
    // COMPARAÇÃO DE PERFORMANCE
    console.log('\n📈 COMPARAÇÃO DE PERFORMANCE:');
    console.log('─'.repeat(60));
    console.log(`📅 Período: ${performance.period}`);
    console.log(`🎯 Retorno do Cliente: ${performance.clientReturn.toFixed(2)}%`);
    console.log(`🤖 Retorno da Plataforma: ${performance.platformReturn.toFixed(2)}%`);
    console.log(`📊 Taxa de Adesão: ${performance.clientFollowRate.toFixed(1)}% (${performance.tracking.signalsFollowed}/${performance.tracking.signalsGiven} sinais)`);
    console.log(`🎯 Taxa de Acerto Cliente: ${performance.clientWinRate.toFixed(1)}%`);
    console.log(`🤖 Taxa de Acerto Plataforma: ${performance.platformWinRate.toFixed(1)}%`);
    console.log(`💰 Lucro Realizado: R$ ${performance.tracking.clientProfit.toLocaleString('pt-BR')}`);
    console.log(`💡 Potencial Perdido: R$ ${(performance.tracking.potentialProfit - performance.tracking.clientProfit).toLocaleString('pt-BR')}`);
    
    // SUGESTÕES
    console.log('\n💡 SUGESTÕES PARA MELHORAR PERFORMANCE:');
    console.log('─'.repeat(60));
    if (performance.clientFollowRate < 70) {
      console.log('• Considere seguir mais sinais da plataforma para melhorar resultados');
    }
    if (performance.clientWinRate < performance.platformWinRate) {
      console.log('• Revise seus critérios de entrada e saída');
      console.log('• Considere seguir mais rigorosamente os stops sugeridos');
    }
    if (performance.clientReturn < performance.platformReturn) {
      console.log('• Aumente a adesão aos sinais de alta confiança (>80%)');
      console.log('• Evite alterar muito os preços de entrada sugeridos');
    }
    
    console.log('\n🎯 PRÓXIMOS SINAIS ESPERADOS:');
    console.log('─'.repeat(60));
    console.log('• Monitoramento de earnings desta semana');
    console.log('• Setup de gap trading na abertura de amanhã');
    console.log('• Oportunidades de pairs em bancos vs seguradoras');
    console.log('• Divergências técnicas em small caps');
    
    console.log('\n📱 COMO USAR A PLATAFORMA:');
    console.log('─'.repeat(60));
    console.log('1. 📊 Receba sinais em tempo real via WhatsApp/App');
    console.log('2. 📈 Analise a recomendação e valor sugerido');
    console.log('3. 💰 Execute na sua corretora (Rico, XP, etc.)');
    console.log('4. 📝 Atualize o sistema com sua execução');
    console.log('5. 📊 Acompanhe performance vs plataforma');
    
    console.log('\n🤖 TRAD.IA - PLATAFORMA DE SINAIS FUNCIONANDO ✅');
  }

  static generateClientInstructions(signal: TradingSignal): string {
    let instructions = `📱 COMO EXECUTAR - ${signal.symbol}\n\n`;
    
    if (signal.action === 'BUY') {
      instructions += `🟢 COMPRAR ${signal.symbol}\n`;
      instructions += `💵 Preço até: R$ ${signal.price.toFixed(2)}\n`;
      instructions += `📊 Quantidade sugerida: ${Math.floor(signal.suggestedAmount! / signal.price)} ações\n`;
      instructions += `💰 Valor total: R$ ${signal.suggestedAmount?.toLocaleString('pt-BR')}\n\n`;
      
      instructions += `📋 PASSOS NA CORRETORA:\n`;
      instructions += `1. Acesse o home broker\n`;
      instructions += `2. Busque por "${signal.symbol}"\n`;
      instructions += `3. Clique em "Comprar"\n`;
      instructions += `4. Insira quantidade: ${Math.floor(signal.suggestedAmount! / signal.price)} ações\n`;
      instructions += `5. Tipo: "Por quantidade" ou "À mercado"\n`;
      instructions += `6. Confirme a operação\n\n`;
      
      instructions += `🎯 GESTÃO DA POSIÇÃO:\n`;
      instructions += `• Take Profit: R$ ${signal.targetPrice.toFixed(2)} (+${(((signal.targetPrice/signal.price)-1)*100).toFixed(1)}%)\n`;
      instructions += `• Stop Loss: R$ ${signal.stopPrice.toFixed(2)} (${(((signal.stopPrice/signal.price)-1)*100).toFixed(1)}%)\n`;
      instructions += `• Prazo: ${signal.timeframe}\n`;
      
    } else if (signal.action === 'SELL') {
      instructions += `🔴 VENDER ${signal.symbol}\n`;
      instructions += `💵 Preço mínimo: R$ ${signal.price.toFixed(2)}\n`;
      instructions += `📊 Quantidade: Toda a posição ou parte dela\n\n`;
      
      instructions += `📋 PASSOS NA CORRETORA:\n`;
      instructions += `1. Acesse o home broker\n`;
      instructions += `2. Vá em "Carteira" ou "Posições"\n`;
      instructions += `3. Encontre ${signal.symbol}\n`;
      instructions += `4. Clique em "Vender"\n`;
      instructions += `5. Insira a quantidade desejada\n`;
      instructions += `6. Tipo: "Por quantidade" ou "À mercado"\n`;
      instructions += `7. Confirme a operação\n\n`;
      
      if (signal.strategy.includes('Stop Loss')) {
        instructions += `⚠️ STOP LOSS ACIONADO!\n`;
        instructions += `• Execute IMEDIATAMENTE para proteger capital\n`;
        instructions += `• Não deixe para depois - risco de perda maior\n`;
      } else {
        instructions += `💰 REALIZAÇÃO DE LUCROS\n`;
        instructions += `• Ótimo momento para vender\n`;
        instructions += `• Pode vender parcialmente se preferir\n`;
      }
    }
    
    instructions += `\n📝 LEMBRE-SE:\n`;
    instructions += `• Confirme execução no app da TRAD.IA\n`;
    instructions += `• Anote preço e quantidade exatos\n`;
    instructions += `• Configure stop loss se aplicável\n`;
    instructions += `• Acompanhe a posição até o fechamento\n`;
    
    return instructions;
  }
}

// Executar dashboard da plataforma
console.log('🚀 INICIANDO PLATAFORMA DE SINAIS TRAD.IA\n');
SignalsPlatform.displayPlatformDashboard();

// Exemplo de instruções para o cliente
console.log('\n' + '═'.repeat(80));
console.log('📋 EXEMPLO DE INSTRUÇÕES PARA CLIENTE:');
console.log('═'.repeat(80));
const signals = SignalsPlatform.generateCurrentSignals();
console.log(SignalsPlatform.generateClientInstructions(signals[1])); // B3SA3 BUY
