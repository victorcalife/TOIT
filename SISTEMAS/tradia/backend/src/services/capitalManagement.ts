/**
 * SISTEMA DE GESTÃO DE RISCO E CAPITAL - TRAD.IA
 * Aplicação prática das estratégias com acompanhamento real do cliente
 */

import { RiskManager, RiskMetrics } from '../services/riskManager';
import { TechnicalIndicators } from '../services/technicalIndicators';

interface ClientPortfolio {
  clientId: string;
  initialCapital: number;
  currentCapital: number;
  availableCash: number;
  openPositions: Position[];
  closedTrades: Trade[];
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  maxDrawdownTolerance: number;
  monthlyTarget: number;
}

interface Position {
  id: string;
  symbol: string;
  strategy: 'pairs' | 'swing' | 'gap';
  entryDate: Date;
  entryPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  riskAmount: number;
  positionSize: number;
  status: 'open' | 'closed';
  aiConfidence: number;
}

interface Trade {
  id: string;
  symbol: string;
  strategy: 'pairs' | 'swing' | 'gap';
  entryDate: Date;
  exitDate: Date;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  realizedPnL: number;
  realizedPnLPercent: number;
  daysHeld: number;
  exitReason: string;
  fees: number;
}

interface TradeRecommendation {
  id: string;
  symbol: string;
  strategy: 'pairs' | 'swing' | 'gap';
  action: 'buy' | 'sell' | 'hold' | 'close';
  recommendedPrice: number;
  quantity: number;
  positionSize: number;
  riskAmount: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  timeframe: string;
  expectedReturn: number;
  riskRewardRatio: number;
}

interface PortfolioAnalysis {
  currentValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  currentDrawdown: number;
  monthlyReturn: number;
  sharpeRatio: number;
  winRate: number;
  profitFactor: number;
  riskExposure: number;
  diversification: number;
  recommendations: TradeRecommendation[];
}

export class CapitalManagementSystem {
  private static readonly STRATEGY_ALLOCATION = {
    pairs: 0.60,    // 60% - Core strategy (mais estável)
    swing: 0.30,    // 30% - Satellite (maior retorno)
    gap: 0.10       // 10% - Tactical (oportunidades)
  };

  private static readonly RISK_PARAMETERS = {
    maxDailyRisk: 0.02,           // 2% máximo por dia
    maxPositionRisk: 0.03,        // 3% máximo por posição
    maxTotalExposure: 0.80,       // 80% máximo investido
    maxOpenPositions: 5,          // Máximo 5 posições abertas
    minCashReserve: 0.15,         // 15% em cash sempre
    stopLossMultiplier: 2.0,      // 2x ATR para stop
    takeProfitMultiplier: 3.0     // 3x risk para target
  };

  // Simular dados reais de 2025 (Janeiro - Julho)
  private static get2025MarketData(): { [symbol: string]: any[] } {
    const symbols = ['PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'WEGE3', 'MGLU3', 'B3SA3'];
    const data: { [symbol: string]: any[] } = {};
    
    // Gerar dados realísticos para 2025 (Janeiro - Julho = ~140 dias úteis)
    symbols.forEach(symbol => {
      data[symbol] = this.generateRealistic2025Data(symbol, 140);
    });
    
    return data;
  }

  private static generateRealistic2025Data(symbol: string, days: number): any[] {
    const startPrices: { [key: string]: number } = {
      'PETR4': 38.50,  // Preços reais aproximados de Jan/2025
      'VALE3': 58.20,
      'ITUB4': 31.80,
      'BBAS3': 26.40,
      'WEGE3': 52.70,
      'MGLU3': 12.80,
      'B3SA3': 10.90
    };

    const volatilities: { [key: string]: number } = {
      'PETR4': 0.028,
      'VALE3': 0.025,
      'ITUB4': 0.020,
      'BBAS3': 0.022,
      'WEGE3': 0.024,
      'MGLU3': 0.035,
      'B3SA3': 0.018
    };

    const data: any[] = [];
    let currentPrice = startPrices[symbol];
    const startDate = new Date('2025-01-02');

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      // Simular movimento de preço realístico
      const volatility = volatilities[symbol];
      const dailyReturn = this.randomNormal() * volatility;
      
      // Adicionar tendência baseada em cenários 2025
      const trend = this.get2025Trend(symbol, i);
      
      const open = currentPrice;
      const close = open * (1 + dailyReturn + trend);
      
      // Calcular high/low
      const intradayVol = volatility * 0.6;
      const high = Math.max(open, close) * (1 + Math.random() * intradayVol);
      const low = Math.min(open, close) * (1 - Math.random() * intradayVol);
      
      const volume = Math.floor(1000000 + Math.random() * 5000000);

      data.push({
        date,
        open,
        high,
        low,
        close,
        volume,
        symbol
      });

      currentPrice = close;
    }

    return data;
  }

  private static get2025Trend(symbol: string, day: number): number {
    // Cenários específicos para 2025
    const trends: { [key: string]: number } = {
      'PETR4': 0.0001,  // Leve alta com petróleo
      'VALE3': 0.0002,  // Commodities em alta
      'ITUB4': 0.0001,  // Bancos estáveis
      'BBAS3': 0.0001,  // Bancos estáveis
      'WEGE3': 0.0003,  // Tecnologia em alta
      'MGLU3': -0.0001, // E-commerce desafiado
      'B3SA3': 0.0002   // Mercado de capitais crescendo
    };

    return trends[symbol] || 0;
  }

  private static randomNormal(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // Executar simulação completa 2025
  static async run2025Simulation(initialCapital: number = 50000): Promise<void> {
    console.log('🚀 TRAD.IA - SIMULAÇÃO GESTÃO DE CAPITAL 2025');
    console.log('═'.repeat(80));
    console.log(`💰 Capital Inicial: R$ ${initialCapital.toLocaleString('pt-BR')}`);
    console.log(`📅 Período: Janeiro - Julho 2025 (7 meses)`);
    console.log(`🎯 Estratégias: Pairs (60%) + Swing (30%) + Gap (10%)`);
    console.log('═'.repeat(80));

    // Inicializar portfolio do cliente
    const portfolio: ClientPortfolio = {
      clientId: 'CLIENT_001',
      initialCapital,
      currentCapital: initialCapital,
      availableCash: initialCapital,
      openPositions: [],
      closedTrades: [],
      riskProfile: 'moderate',
      maxDrawdownTolerance: 0.15,
      monthlyTarget: 0.03 // 3% ao mês
    };

    // Obter dados de mercado
    const marketData = this.get2025MarketData();
    const maxDays = Math.min(...Object.values(marketData).map(data => data.length));

    // Arrays para tracking
    const dailyCapital: number[] = [];
    const monthlyReturns: number[] = [];
    const recommendations: TradeRecommendation[] = [];

    console.log('\n📊 EVOLUÇÃO DIÁRIA DO PORTFOLIO:\n');
    console.log('Data'.padEnd(12) + 'Capital'.padEnd(15) + 'Return%'.padEnd(10) + 'DD%'.padEnd(8) + 'Posições'.padEnd(10) + 'Ação');
    console.log('─'.repeat(80));

    let maxCapital = initialCapital;
    let monthStart = 0;

    // Simular dia por dia
    for (let day = 20; day < maxDays - 1; day++) { // Começar no dia 20 para ter dados dos indicadores
      const currentDate = marketData['PETR4'][day].date;
      
      // Atualizar preços atuais das posições
      this.updatePositionPrices(portfolio, marketData, day);
      
      // Verificar saídas (stops, targets, tempo)
      await this.processExits(portfolio, marketData, day);
      
      // Calcular capital atual
      const currentCapital = this.calculateCurrentCapital(portfolio, marketData, day);
      portfolio.currentCapital = currentCapital;
      dailyCapital.push(currentCapital);
      
      // Calcular drawdown
      if (currentCapital > maxCapital) maxCapital = currentCapital;
      const drawdown = (currentCapital - maxCapital) / maxCapital;
      
      // Verificar novas oportunidades
      const newRecommendations = await this.scanOpportunities(portfolio, marketData, day);
      
      // Executar recomendações se risk management permitir
      let actionTaken = '';
      if (newRecommendations.length > 0 && await this.checkRiskConstraints(portfolio)) {
        const topRecommendation = newRecommendations[0];
        await this.executeRecommendation(portfolio, topRecommendation, marketData, day);
        actionTaken = `${topRecommendation.action.toUpperCase()} ${topRecommendation.symbol}`;
      }

      // Log diário (apenas alguns dias para não poluir)
      if (day % 5 === 0 || actionTaken) {
        const dailyReturn = ((currentCapital - initialCapital) / initialCapital) * 100;
        console.log(
          currentDate.toLocaleDateString('pt-BR').padEnd(12) +
          `R$ ${Math.round(currentCapital).toLocaleString('pt-BR')}`.padEnd(15) +
          `${dailyReturn.toFixed(1)}%`.padEnd(10) +
          `${(drawdown * 100).toFixed(1)}%`.padEnd(8) +
          `${portfolio.openPositions.length}`.padEnd(10) +
          actionTaken
        );
      }

      // Calcular retorno mensal
      if (day % 21 === 0 && day > monthStart) { // ~21 dias úteis por mês
        const monthReturn = (currentCapital - (dailyCapital[monthStart] || initialCapital)) / (dailyCapital[monthStart] || initialCapital);
        monthlyReturns.push(monthReturn);
        monthStart = day;
      }
    }

    // Fechar todas as posições no final
    this.closeAllPositions(portfolio, marketData, maxDays - 1);

    // Calcular capital final
    const finalCapital = this.calculateFinalCapital(portfolio);
    portfolio.currentCapital = finalCapital;

    // Gerar relatório final
    await this.generateFinalReport(portfolio, dailyCapital, monthlyReturns);
  }

  private static updatePositionPrices(portfolio: ClientPortfolio, marketData: any, day: number): void {
    for (const position of portfolio.openPositions) {
      const currentPrice = marketData[position.symbol][day].close;
      position.currentPrice = currentPrice;
      
      const pnl = (currentPrice - position.entryPrice) * position.quantity;
      position.unrealizedPnL = pnl - (position.quantity * position.entryPrice * 0.0005); // Taxa
      position.unrealizedPnLPercent = position.unrealizedPnL / (position.entryPrice * position.quantity);
    }
  }

  private static async processExits(portfolio: ClientPortfolio, marketData: any, day: number): Promise<void> {
    const positionsToClose: Position[] = [];

    for (const position of portfolio.openPositions) {
      const currentPrice = position.currentPrice;
      const entryDate = position.entryDate;
      const currentDate = marketData[position.symbol][day].date;
      const daysHeld = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));

      let shouldClose = false;
      let exitReason = '';

      // Stop Loss
      if (currentPrice <= position.stopLoss) {
        shouldClose = true;
        exitReason = 'stop_loss';
      }
      // Take Profit
      else if (currentPrice >= position.takeProfit) {
        shouldClose = true;
        exitReason = 'take_profit';
      }
      // Time-based exit (específico por estratégia)
      else if (this.shouldTimeExit(position, daysHeld)) {
        shouldClose = true;
        exitReason = 'time_exit';
      }

      if (shouldClose) {
        positionsToClose.push(position);
        
        // Criar trade fechado
        const trade: Trade = {
          id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          symbol: position.symbol,
          strategy: position.strategy,
          entryDate: position.entryDate,
          exitDate: currentDate,
          entryPrice: position.entryPrice,
          exitPrice: currentPrice,
          quantity: position.quantity,
          realizedPnL: position.unrealizedPnL,
          realizedPnLPercent: position.unrealizedPnLPercent,
          daysHeld,
          exitReason,
          fees: position.quantity * position.entryPrice * 0.001 // 0.1% total de taxas
        };

        portfolio.closedTrades.push(trade);
      }
    }

    // Remover posições fechadas
    portfolio.openPositions = portfolio.openPositions.filter(
      pos => !positionsToClose.some(closePos => closePos.id === pos.id)
    );

    // Atualizar cash disponível
    for (const closedPos of positionsToClose) {
      const proceeds = closedPos.quantity * closedPos.currentPrice;
      const fees = closedPos.quantity * closedPos.entryPrice * 0.001; // 0.1% de taxas
      portfolio.availableCash += proceeds - fees;
    }
  }

  private static shouldTimeExit(position: Position, daysHeld: number): boolean {
    const timeouts = {
      pairs: 14,  // 14 dias máximo
      swing: 10,  // 10 dias máximo
      gap: 3      // 3 dias máximo
    };

    return daysHeld >= timeouts[position.strategy];
  }

  private static async scanOpportunities(portfolio: ClientPortfolio, marketData: any, day: number): Promise<TradeRecommendation[]> {
    const recommendations: TradeRecommendation[] = [];
    const symbols = Object.keys(marketData);

    for (const symbol of symbols) {
      // Verificar se já tem posição no símbolo
      const hasPosition = portfolio.openPositions.some(pos => pos.symbol === symbol);
      if (hasPosition) continue;

      // Analisar oportunidades por estratégia
      const pairsSignal = await this.analyzePairsOpportunity(symbol, marketData, day);
      if (pairsSignal.shouldEnter) {
        recommendations.push(this.createRecommendation(symbol, 'pairs', pairsSignal, portfolio));
      }

      const swingSignal = await this.analyzeSwingOpportunity(symbol, marketData, day);
      if (swingSignal.shouldEnter) {
        recommendations.push(this.createRecommendation(symbol, 'swing', swingSignal, portfolio));
      }

      // Gap trading apenas às segundas-feiras
      const currentDate = marketData[symbol][day].date;
      if (currentDate.getDay() === 1) {
        const gapSignal = await this.analyzeGapOpportunity(symbol, marketData, day);
        if (gapSignal.shouldEnter) {
          recommendations.push(this.createRecommendation(symbol, 'gap', gapSignal, portfolio));
        }
      }
    }

    // Ordenar por prioridade e confiança
    return recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return (priorityWeight[b.priority] * b.confidence) - (priorityWeight[a.priority] * a.confidence);
    });
  }

  private static async analyzePairsOpportunity(symbol: string, marketData: any, day: number): Promise<any> {
    // Implementar lógica de pairs trading
    if (day < 30) return { shouldEnter: false };

    // Para simplificar, vamos simular sinais baseados nos resultados do backtesting
    const pairsSymbols = ['PETR4', 'ITUB4', 'VALE3'];
    if (!pairsSymbols.includes(symbol)) return { shouldEnter: false };

    // Simular Z-Score
    const zScore = (Math.random() - 0.5) * 6; // -3 a +3
    const shouldEnter = Math.abs(zScore) > 2.0;

    return {
      shouldEnter,
      confidence: Math.min(Math.abs(zScore) / 3 * 100, 95),
      direction: zScore > 0 ? 'sell' : 'buy',
      zScore,
      expectedReturn: 0.02, // 2%
      risk: 0.015 // 1.5%
    };
  }

  private static async analyzeSwingOpportunity(symbol: string, marketData: any, day: number): Promise<any> {
    if (day < 20) return { shouldEnter: false };

    // Simular análise técnica
    const data = marketData[symbol];
    const currentPrice = data[day].close;
    const rsi = 30 + Math.random() * 40; // Simular RSI 30-70
    
    const isOversold = rsi < 35;
    const isOverbought = rsi > 65;
    const shouldEnter = isOversold || isOverbought;

    return {
      shouldEnter,
      confidence: shouldEnter ? 60 + Math.random() * 30 : 0,
      direction: isOversold ? 'buy' : 'sell',
      rsi,
      expectedReturn: 0.06, // 6%
      risk: 0.03 // 3%
    };
  }

  private static async analyzeGapOpportunity(symbol: string, marketData: any, day: number): Promise<any> {
    if (day < 2) return { shouldEnter: false };

    const data = marketData[symbol];
    const previousClose = data[day - 1].close;
    const currentOpen = data[day].open;
    const gapPercent = (currentOpen - previousClose) / previousClose;

    const isSignificantGap = Math.abs(gapPercent) > 0.02; // 2%

    return {
      shouldEnter: isSignificantGap,
      confidence: isSignificantGap ? 70 + Math.random() * 25 : 0,
      direction: gapPercent > 0 ? 'sell' : 'buy', // Contra o gap
      gapPercent: gapPercent * 100,
      expectedReturn: 0.025, // 2.5%
      risk: 0.015 // 1.5%
    };
  }

  private static createRecommendation(
    symbol: string, 
    strategy: 'pairs' | 'swing' | 'gap', 
    signal: any, 
    portfolio: ClientPortfolio
  ): TradeRecommendation {
    
    // Calcular position size baseado na estratégia e capital disponível
    const strategyAllocation = this.STRATEGY_ALLOCATION[strategy];
    const maxAllocation = portfolio.currentCapital * strategyAllocation;
    const riskAmount = portfolio.currentCapital * this.RISK_PARAMETERS.maxPositionRisk;
    
    // Position size baseado no risco
    const positionSize = Math.min(maxAllocation * 0.3, riskAmount / signal.risk);
    
    const currentPrice = 40; // Simplificado
    const quantity = Math.floor(positionSize / currentPrice);
    
    // Calcular stop loss e take profit
    const risk = signal.risk || 0.02;
    const expectedReturn = signal.expectedReturn || 0.04;
    
    const stopLoss = signal.direction === 'buy' ? 
      currentPrice * (1 - risk) : 
      currentPrice * (1 + risk);
      
    const takeProfit = signal.direction === 'buy' ? 
      currentPrice * (1 + expectedReturn) : 
      currentPrice * (1 - expectedReturn);

    return {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      strategy,
      action: signal.direction === 'buy' ? 'buy' : 'sell',
      recommendedPrice: currentPrice,
      quantity,
      positionSize,
      riskAmount,
      stopLoss,
      takeProfit,
      confidence: signal.confidence,
      reasoning: this.generateReasoning(strategy, signal),
      priority: signal.confidence > 80 ? 'high' : signal.confidence > 60 ? 'medium' : 'low',
      timeframe: this.getTimeframe(strategy),
      expectedReturn,
      riskRewardRatio: expectedReturn / risk
    };
  }

  private static generateReasoning(strategy: string, signal: any): string {
    const reasons = {
      pairs: `Z-Score de ${signal.zScore?.toFixed(2)} indica divergência significativa entre pares`,
      swing: `RSI em ${signal.rsi?.toFixed(1)} sinaliza ${signal.rsi < 35 ? 'oversold' : 'overbought'} com reversão provável`,
      gap: `Gap de ${signal.gapPercent?.toFixed(2)}% tende a fechar estatisticamente`
    };
    
    return reasons[strategy as keyof typeof reasons] || 'Sinal técnico identificado';
  }

  private static getTimeframe(strategy: string): string {
    const timeframes = {
      pairs: '5-14 dias',
      swing: '3-10 dias', 
      gap: '1-3 dias'
    };
    
    return timeframes[strategy as keyof typeof timeframes] || '1-7 dias';
  }

  private static async checkRiskConstraints(portfolio: ClientPortfolio): Promise<boolean> {
    // Verificar limites de risco
    const totalExposure = portfolio.openPositions.reduce((sum, pos) => 
      sum + (pos.quantity * pos.currentPrice), 0
    );
    
    const exposureRatio = totalExposure / portfolio.currentCapital;
    
    // Verificar constraints
    if (exposureRatio > this.RISK_PARAMETERS.maxTotalExposure) return false;
    if (portfolio.openPositions.length >= this.RISK_PARAMETERS.maxOpenPositions) return false;
    if (portfolio.availableCash < portfolio.currentCapital * this.RISK_PARAMETERS.minCashReserve) return false;
    
    return true;
  }

  private static async executeRecommendation(
    portfolio: ClientPortfolio, 
    recommendation: TradeRecommendation, 
    marketData: any, 
    day: number
  ): Promise<void> {
    
    const currentDate = marketData[recommendation.symbol][day].date;
    const executionPrice = recommendation.recommendedPrice * (1 + 0.001); // Slippage
    
    // Verificar se tem cash suficiente
    const totalCost = recommendation.quantity * executionPrice;
    if (totalCost > portfolio.availableCash) return;
    
    // Criar nova posição
    const position: Position = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: recommendation.symbol,
      strategy: recommendation.strategy,
      entryDate: currentDate,
      entryPrice: executionPrice,
      quantity: recommendation.quantity,
      stopLoss: recommendation.stopLoss,
      takeProfit: recommendation.takeProfit,
      currentPrice: executionPrice,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      riskAmount: recommendation.riskAmount,
      positionSize: recommendation.positionSize,
      status: 'open',
      aiConfidence: recommendation.confidence
    };
    
    portfolio.openPositions.push(position);
    portfolio.availableCash -= totalCost;
  }

  private static calculateCurrentCapital(portfolio: ClientPortfolio, marketData: any, day: number): number {
    let totalValue = portfolio.availableCash;
    
    // Somar valor das posições abertas
    for (const position of portfolio.openPositions) {
      const currentPrice = marketData[position.symbol][day].close;
      totalValue += position.quantity * currentPrice;
    }
    
    return totalValue;
  }

  private static closeAllPositions(portfolio: ClientPortfolio, marketData: any, day: number): void {
    for (const position of portfolio.openPositions) {
      const currentPrice = marketData[position.symbol][day].close;
      const currentDate = marketData[position.symbol][day].date;
      
      const trade: Trade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol: position.symbol,
        strategy: position.strategy,
        entryDate: position.entryDate,
        exitDate: currentDate,
        entryPrice: position.entryPrice,
        exitPrice: currentPrice,
        quantity: position.quantity,
        realizedPnL: (currentPrice - position.entryPrice) * position.quantity,
        realizedPnLPercent: (currentPrice - position.entryPrice) / position.entryPrice,
        daysHeld: Math.floor((currentDate.getTime() - position.entryDate.getTime()) / (1000 * 60 * 60 * 24)),
        exitReason: 'end_of_period',
        fees: position.quantity * position.entryPrice * 0.001
      };
      
      portfolio.closedTrades.push(trade);
      portfolio.availableCash += position.quantity * currentPrice - trade.fees;
    }
    
    portfolio.openPositions = [];
  }

  private static calculateFinalCapital(portfolio: ClientPortfolio): number {
    return portfolio.availableCash;
  }

  private static async generateFinalReport(
    portfolio: ClientPortfolio, 
    dailyCapital: number[], 
    monthlyReturns: number[]
  ): Promise<void> {
    
    const finalCapital = portfolio.currentCapital;
    const totalReturn = (finalCapital - portfolio.initialCapital) / portfolio.initialCapital;
    const annualizedReturn = Math.pow(1 + totalReturn, 12/7) - 1; // 7 meses para 12

    console.log('\n' + '═'.repeat(80));
    console.log('📊 RELATÓRIO FINAL - GESTÃO DE CAPITAL 2025');
    console.log('═'.repeat(80));

    console.log(`\n💰 PERFORMANCE FINANCEIRA:`);
    console.log(`Capital Inicial: R$ ${portfolio.initialCapital.toLocaleString('pt-BR')}`);
    console.log(`Capital Final: R$ ${Math.round(finalCapital).toLocaleString('pt-BR')}`);
    console.log(`Retorno Total: ${(totalReturn * 100).toFixed(2)}%`);
    console.log(`Retorno Anualizado: ${(annualizedReturn * 100).toFixed(2)}%`);

    // Calcular métricas de risco
    const maxCapital = Math.max(...dailyCapital);
    const minCapital = Math.min(...dailyCapital);
    const maxDrawdown = (minCapital - maxCapital) / maxCapital;

    console.log(`\n🛡️ MÉTRICAS DE RISCO:`);
    console.log(`Drawdown Máximo: ${(maxDrawdown * 100).toFixed(2)}%`);
    console.log(`Capital Máximo: R$ ${Math.round(maxCapital).toLocaleString('pt-BR')}`);
    console.log(`Capital Mínimo: R$ ${Math.round(minCapital).toLocaleString('pt-BR')}`);

    // Estatísticas de trades
    const winningTrades = portfolio.closedTrades.filter(t => t.realizedPnL > 0);
    const losingTrades = portfolio.closedTrades.filter(t => t.realizedPnL <= 0);
    const winRate = portfolio.closedTrades.length > 0 ? 
      winningTrades.length / portfolio.closedTrades.length : 0;

    const grossProfit = winningTrades.reduce((sum, t) => sum + t.realizedPnL, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.realizedPnL, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

    console.log(`\n📈 ESTATÍSTICAS DE TRADING:`);
    console.log(`Total de Trades: ${portfolio.closedTrades.length}`);
    console.log(`Taxa de Acerto: ${(winRate * 100).toFixed(1)}%`);
    console.log(`Profit Factor: ${profitFactor.toFixed(2)}`);
    console.log(`Lucro Bruto: R$ ${Math.round(grossProfit).toLocaleString('pt-BR')}`);
    console.log(`Perda Bruta: R$ ${Math.round(grossLoss).toLocaleString('pt-BR')}`);

    // Performance por estratégia
    console.log(`\n🎯 PERFORMANCE POR ESTRATÉGIA:`);
    const strategies = ['pairs', 'swing', 'gap'];
    
    for (const strategy of strategies) {
      const strategyTrades = portfolio.closedTrades.filter(t => t.strategy === strategy);
      const strategyPnL = strategyTrades.reduce((sum, t) => sum + t.realizedPnL, 0);
      const strategyWinRate = strategyTrades.length > 0 ? 
        strategyTrades.filter(t => t.realizedPnL > 0).length / strategyTrades.length : 0;

      console.log(`${strategy.toUpperCase().padEnd(10)}: ${strategyTrades.length} trades, ` +
        `${(strategyWinRate * 100).toFixed(1)}% win rate, ` +
        `R$ ${Math.round(strategyPnL).toLocaleString('pt-BR')} PnL`);
    }

    // Top 5 melhores trades
    const topTrades = [...portfolio.closedTrades]
      .sort((a, b) => b.realizedPnLPercent - a.realizedPnLPercent)
      .slice(0, 5);

    console.log(`\n🏆 TOP 5 MELHORES TRADES:`);
    for (const trade of topTrades) {
      console.log(`${trade.symbol.padEnd(8)} | ${trade.strategy.padEnd(6)} | ` +
        `${(trade.realizedPnLPercent * 100).toFixed(2)}% | ` +
        `${trade.daysHeld}d | R$ ${Math.round(trade.realizedPnL).toLocaleString('pt-BR')}`);
    }

    // Retornos mensais
    if (monthlyReturns.length > 0) {
      console.log(`\n📅 RETORNOS MENSAIS:`);
      monthlyReturns.forEach((ret, i) => {
        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul'][i];
        console.log(`${month}: ${(ret * 100).toFixed(2)}%`);
      });
    }

    console.log(`\n✅ CONCLUSÃO:`);
    console.log(`O sistema de gestão de capital mostrou ${totalReturn > 0 ? 'SUCESSO' : 'necessidade de ajustes'}.`);
    console.log(`A estratégia híbrida (Pairs + Swing + Gap) ${winRate > 0.6 ? 'funcionou conforme esperado' : 'precisa ser refinada'}.`);
    console.log(`Recomenda-se ${maxDrawdown < -0.1 ? 'ajustar limites de risco' : 'manter os parâmetros atuais'}.`);
  }
}

// Executar simulação
console.log('Iniciando simulação de gestão de capital...');
CapitalManagementSystem.run2025Simulation(50000).catch(console.error);
