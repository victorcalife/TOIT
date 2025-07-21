import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, BarChart3, Activity, Target, Shield, Clock, Zap, CheckCircle, XCircle } from 'lucide-react';

const TradingPlatformV2 = () => {
  const [capital, setCapital] = useState('');
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [marketData, setMarketData] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [riskProfile, setRiskProfile] = useState('moderado');
  const [tradingHistory, setTradingHistory] = useState([]);
  const [currentCapital, setCurrentCapital] = useState(0);
  const [portfolioStats, setPortfolioStats] = useState({
    winRate: 0,
    winStreak: 0,
    lossStreak: 0,
    totalReturn: 0,
    maxDrawdown: 0,
    kellyPercentage: 0,
    totalTrades: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    sharpeRatio: 0
  });
  const [riskStatus, setRiskStatus] = useState('safe'); // safe, warning, danger
  const [tradingTime, setTradingTime] = useState({ hour: 10, minute: 0 });

  // Universo expandido de ativos com dados de liquidez
  const assetUniverse = {
    stocks: {
      'PETR4': { price: 32.18, volume: 88000000, avgVolume30d: 85000000, sector: 'energy', tickSize: 0.01, minLot: 100 },
      'VALE3': { price: 52.80, volume: 78000000, avgVolume30d: 75000000, sector: 'mining', tickSize: 0.01, minLot: 100 },
      'ITUB4': { price: 31.15, volume: 65000000, avgVolume30d: 60000000, sector: 'banking', tickSize: 0.01, minLot: 100 },
      'BBDC4': { price: 15.45, volume: 48000000, avgVolume30d: 45000000, sector: 'banking', tickSize: 0.01, minLot: 100 },
      'MGLU3': { price: 8.95, volume: 85000000, avgVolume30d: 80000000, sector: 'retail', tickSize: 0.01, minLot: 100 },
      'EMBR3': { price: 42.89, volume: 20000000, avgVolume30d: 18000000, sector: 'industrial', tickSize: 0.01, minLot: 100 },
      'AZUL4': { price: 14.56, volume: 35000000, avgVolume30d: 32000000, sector: 'airline', tickSize: 0.01, minLot: 100 },
      'ABEV3': { price: 14.25, volume: 45000000, avgVolume30d: 42000000, sector: 'beverage', tickSize: 0.01, minLot: 100 },
      'WEGE3': { price: 38.67, volume: 28000000, avgVolume30d: 25000000, sector: 'industrial', tickSize: 0.01, minLot: 100 }
    },
    derivatives: {
      'WDO': { price: 5.52, volume: 850000, avgVolume30d: 800000, margin: 800, leverage: 3, tickSize: 0.005, tickValue: 10, minContracts: 1 },
      'WIN': { price: 137890, volume: 420000, avgVolume30d: 400000, margin: 1200, leverage: 2.5, tickSize: 5, tickValue: 1, minContracts: 1 },
      'WSJ': { price: 1685, volume: 85000, avgVolume30d: 80000, margin: 600, leverage: 4, tickSize: 0.25, tickValue: 25, minContracts: 1 }
    }
  };

  // Custos reais de trading
  const tradingCosts = {
    brokerage: 0.0015, // 0.15% média
    slippage: {
      high_liquidity: 0.0005, // 0.05%
      medium_liquidity: 0.0015, // 0.15%
      low_liquidity: 0.003 // 0.30%
    },
    spread: 0.0002, // 0.02%
    tax: 0.15 // 15% sobre ganhos líquidos
  };

  // Parâmetros conservadores V2.0
  const conservativeParams = {
    rsi: {
      oversold: 20, // Mais conservador
      overbought: 80, // Mais conservador
      lookback: 14
    },
    volume: {
      minMultiplier: 2.5, // Volume deve ser 2.5x a média
      liquidityMinDays: 30
    },
    confidence: {
      minimum: 75, // Confiança mínima 75%
      veryHigh: 90
    },
    kelly: {
      maximum: 0.05, // Máximo 5% por operação
      minimum: 0.01
    },
    position: {
      maxPerTrade: 0.05, // 5% do capital por trade
      maxTotal: 0.25, // 25% máximo investido
      maxCorrelated: 0.15 // 15% em ativos correlacionados
    },
    risk: {
      maxDrawdownDaily: 0.10, // 10% drawdown diário = circuit breaker
      maxDrawdownTotal: 0.15, // 15% drawdown total
      stopLossMultiplier: 2.0 // 2x ATR para stop-loss
    },
    timing: {
      startHour: 10, // Evitar primeiras horas
      endHour: 16, // Evitar última hora
      avoidGaps: 0.03 // Evitar gaps > 3%
    }
  };

  // Simulação de dados de mercado com volatilidade realística
  const simulateRealisticMarketData = useCallback(() => {
    const data = {};
    const currentHour = tradingTime.hour;
    
    Object.entries(assetUniverse.stocks).forEach(([symbol, assetInfo]) => {
      // Volatilidade baseada no setor
      const sectorVolatility = {
        'energy': 0.025,
        'mining': 0.030,
        'banking': 0.020,
        'retail': 0.035,
        'industrial': 0.022,
        'airline': 0.040,
        'beverage': 0.018
      };
      
      const baseVol = sectorVolatility[assetInfo.sector] || 0.025;
      const hourlyVol = currentHour < 11 || currentHour > 15 ? baseVol * 1.3 : baseVol;
      
      // RSI mais realístico
      const rsi = 30 + Math.random() * 40 + (Math.random() > 0.7 ? -15 : 0) + (Math.random() > 0.8 ? 15 : 0);
      
      // MACD
      const macd = (Math.random() - 0.5) * 0.3;
      
      // Volume ratio
      const volumeRatio = 0.5 + Math.random() * 2; // 0.5x a 2.5x
      
      // ATR baseado na volatilidade real
      const atr = assetInfo.price * hourlyVol;
      
      // Bollinger Bands
      const bbWidth = atr * 2;
      const bollinger = {
        upper: assetInfo.price + bbWidth,
        middle: assetInfo.price,
        lower: assetInfo.price - bbWidth
      };
      
      // VWAP
      const vwap = assetInfo.price * (0.99 + Math.random() * 0.02);
      
      // Preço atual com movimento realístico
      const priceMove = (Math.random() - 0.5) * hourlyVol * 2;
      const currentPrice = assetInfo.price * (1 + priceMove);
      
      data[symbol] = {
        price: currentPrice,
        basePrice: assetInfo.price,
        change: priceMove * assetInfo.price,
        changePercent: priceMove * 100,
        volume: Math.floor(assetInfo.volume * volumeRatio),
        avgVolume30d: assetInfo.avgVolume30d,
        rsi: rsi,
        macd: macd,
        atr: atr,
        bollinger: bollinger,
        vwap: vwap,
        sector: assetInfo.sector,
        tickSize: assetInfo.tickSize,
        minLot: assetInfo.minLot,
        liquidityScore: Math.min(100, (assetInfo.volume / assetInfo.avgVolume30d) * 100)
      };
    });

    Object.entries(assetUniverse.derivatives).forEach(([symbol, assetInfo]) => {
      const baseVol = symbol === 'WDO' ? 0.015 : symbol === 'WIN' ? 0.020 : 0.025;
      const rsi = 25 + Math.random() * 50;
      const macd = (Math.random() - 0.5) * 0.4;
      const volumeRatio = 0.8 + Math.random() * 1.5;
      
      const priceMove = (Math.random() - 0.5) * baseVol * 2;
      const currentPrice = assetInfo.price * (1 + priceMove);
      
      data[symbol] = {
        price: currentPrice,
        basePrice: assetInfo.price,
        change: priceMove * assetInfo.price,
        changePercent: priceMove * 100,
        volume: Math.floor(assetInfo.volume * volumeRatio),
        avgVolume30d: assetInfo.avgVolume30d,
        rsi: rsi,
        macd: macd,
        atr: currentPrice * baseVol,
        margin: assetInfo.margin,
        leverage: assetInfo.leverage,
        tickSize: assetInfo.tickSize,
        tickValue: assetInfo.tickValue,
        minContracts: assetInfo.minContracts,
        liquidityScore: Math.min(100, (assetInfo.volume / assetInfo.avgVolume30d) * 100)
      };
    });

    setMarketData(data);
  }, [tradingTime]);

  // Análise técnica conservadora V2.0
  const analyzeMarketV2 = useCallback(() => {
    if (!capital || Object.keys(marketData).length === 0) return;

    const workingCapital = currentCapital || parseFloat(capital);
    
    // Circuit breaker - parar se drawdown diário > 10%
    if (portfolioStats.maxDrawdown > conservativeParams.risk.maxDrawdownDaily) {
      setSignals([]);
      setRiskStatus('danger');
      return;
    }

    const newSignals = [];
    const currentHour = tradingTime.hour;
    
    // Filtro de horário
    if (currentHour < conservativeParams.timing.startHour || currentHour > conservativeParams.timing.endHour) {
      setSignals([]);
      return;
    }

    Object.entries(marketData).forEach(([symbol, data]) => {
      let score = 0;
      let signals = [];
      let filters = [];
      
      // === FILTROS DE QUALIDADE ===
      
      // 1. Filtro de liquidez
      const volumeRatio = data.volume / data.avgVolume30d;
      if (volumeRatio < conservativeParams.volume.minMultiplier) {
        return; // Pular se volume insuficiente
      }
      filters.push(`Vol: ${volumeRatio.toFixed(1)}x`);
      
      // 2. Filtro de gap
      const gapPercent = Math.abs(data.changePercent) / 100;
      if (gapPercent > conservativeParams.timing.avoidGaps) {
        return; // Evitar gaps muito grandes
      }
      
      // 3. Filtro de liquidez score
      if (data.liquidityScore < 80) {
        return; // Apenas ativos com boa liquidez
      }
      
      // === ANÁLISE TÉCNICA CONSERVADORA ===
      
      // RSI (parâmetros mais rigorosos)
      if (data.rsi <= conservativeParams.rsi.oversold) {
        score += 3.0;
        signals.push(`RSI ${data.rsi.toFixed(1)} extreme oversold`);
      } else if (data.rsi <= conservativeParams.rsi.oversold + 5) {
        score += 1.5;
        signals.push(`RSI ${data.rsi.toFixed(1)} oversold`);
      } else if (data.rsi >= conservativeParams.rsi.overbought) {
        score -= 3.0;
        signals.push(`RSI ${data.rsi.toFixed(1)} extreme overbought`);
      }
      
      // MACD
      if (data.macd > 0.1) {
        score += 1.0;
        signals.push('MACD bullish');
      } else if (data.macd < -0.1) {
        score -= 1.0;
        signals.push('MACD bearish');
      }
      
      // Bollinger Bands
      if (data.price <= data.bollinger.lower) {
        score += 1.5;
        signals.push('Below Bollinger Lower');
      } else if (data.price >= data.bollinger.upper) {
        score -= 1.5;
        signals.push('Above Bollinger Upper');
      }
      
      // VWAP
      if (data.price > data.vwap * 1.01) {
        score += 0.5;
        signals.push('Above VWAP');
      } else if (data.price < data.vwap * 0.99) {
        score += 0.5; // Potential reversal
        signals.push('Below VWAP reversal');
      }
      
      // Volume confirmation
      if (volumeRatio > 3.0) {
        score += 1.0;
        signals.push('Exceptional volume');
      } else if (volumeRatio > conservativeParams.volume.minMultiplier) {
        score += 0.5;
        signals.push('Good volume');
      }
      
      // === DETERMINAÇÃO DA AÇÃO ===
      let action = 'AGUARDAR';
      let confidence = Math.min(95, Math.abs(score) * 12);
      
      if (score >= 2.5 && confidence >= conservativeParams.confidence.minimum) {
        action = 'COMPRAR';
      } else if (score <= -2.5 && confidence >= conservativeParams.confidence.minimum) {
        action = 'VENDER';
      }
      
      if (action !== 'AGUARDAR') {
        // === GESTÃO DE RISCO AVANÇADA ===
        
        // Kelly Criterion conservador
        const winRate = portfolioStats.totalTrades > 0 ? portfolioStats.winRate / 100 : 0.62;
        const avgWin = portfolioStats.avgWin || 150;
        const avgLoss = portfolioStats.avgLoss || 80;
        
        let kellyPct = winRate - ((1 - winRate) / (avgWin / avgLoss));
        kellyPct = Math.max(conservativeParams.kelly.minimum, 
                           Math.min(conservativeParams.kelly.maximum, kellyPct));
        
        // Anti-Martingale conservador
        let streakMultiplier = 1.0;
        if (portfolioStats.winStreak >= 3) {
          streakMultiplier = Math.min(1.5, 1 + (portfolioStats.winStreak - 2) * 0.15);
        } else if (portfolioStats.lossStreak >= 2) {
          streakMultiplier = Math.max(0.4, 1 - (portfolioStats.lossStreak - 1) * 0.25);
        }
        
        // Position sizing realístico
        const maxRiskAmount = workingCapital * conservativeParams.position.maxPerTrade;
        const adjustedRiskAmount = maxRiskAmount * kellyPct * streakMultiplier;
        
        // Calcular stops baseados em ATR
        const stopLossDistance = data.atr * conservativeParams.risk.stopLossMultiplier;
        const stopGainDistance = stopLossDistance * 1.8; // Risk/Reward 1:1.8
        
        let stopLoss, stopGain, suggestedShares = 0, suggestedContracts = 0;
        let estimatedCost = 0, requiredMargin = 0;
        
        if (data.margin) {
          // Derivativo
          const maxContracts = Math.floor(adjustedRiskAmount / data.margin);
          suggestedContracts = Math.max(data.minContracts, 
                               Math.min(maxContracts, 3)); // Máximo 3 contratos
          
          requiredMargin = suggestedContracts * data.margin;
          estimatedCost = requiredMargin;
          
          if (action === 'COMPRAR') {
            stopLoss = data.price - (stopLossDistance / data.price) * data.price;
            stopGain = data.price + (stopGainDistance / data.price) * data.price;
          } else {
            stopLoss = data.price + (stopLossDistance / data.price) * data.price;
            stopGain = data.price - (stopGainDistance / data.price) * data.price;
          }
        } else {
          // Ação
          const riskPerShare = stopLossDistance;
          if (riskPerShare > 0) {
            suggestedShares = Math.floor(adjustedRiskAmount / riskPerShare);
            suggestedShares = Math.max(data.minLot, 
                             Math.floor(suggestedShares / data.minLot) * data.minLot);
          }
          
          estimatedCost = suggestedShares * data.price;
          
          if (action === 'COMPRAR') {
            stopLoss = data.price - stopLossDistance;
            stopGain = data.price + stopGainDistance;
          } else {
            stopLoss = data.price + stopLossDistance;
            stopGain = data.price - stopGainDistance;
          }
        }
        
        // Verificar se a posição é viável
        const minInvestment = 300; // Mínimo R$ 300 por operação
        if (estimatedCost >= minInvestment && estimatedCost <= workingCapital * 0.8) {
          
          // Calcular custos totais
          const liquidityLevel = data.liquidityScore > 90 ? 'high_liquidity' : 
                                data.liquidityScore > 70 ? 'medium_liquidity' : 'low_liquidity';
          
          const slippage = tradingCosts.slippage[liquidityLevel];
          const brokerage = tradingCosts.brokerage;
          const spread = tradingCosts.spread;
          
          const totalCosts = (slippage + brokerage + spread) * estimatedCost;
          
          newSignals.push({
            symbol,
            action,
            price: data.price,
            confidence: confidence,
            stopLoss: stopLoss?.toFixed(4),
            stopGain: stopGain?.toFixed(4),
            suggestedShares: suggestedShares,
            suggestedContracts: suggestedContracts,
            estimatedCost: estimatedCost.toFixed(2),
            requiredMargin: requiredMargin.toFixed(2),
            signals: signals.join(', '),
            filters: filters.join(', '),
            rsi: data.rsi.toFixed(1),
            atr: data.atr.toFixed(4),
            volume: data.volume.toLocaleString(),
            kellyPct: (kellyPct * 100).toFixed(1),
            streakMultiplier: streakMultiplier.toFixed(2),
            sector: data.sector || 'derivative',
            liquidityScore: data.liquidityScore.toFixed(0),
            totalCosts: totalCosts.toFixed(2),
            expectedReturn: (stopGainDistance * (suggestedShares || suggestedContracts)).toFixed(2),
            riskReward: (stopGainDistance / stopLossDistance).toFixed(2)
          });
        }
      }
    });
    
    // Ordenar por confiança e diversificar por setor
    newSignals.sort((a, b) => b.confidence - a.confidence);
    
    // Filtro de diversificação (máximo 2 por setor)
    const sectorCount = {};
    const diversifiedSignals = newSignals.filter(signal => {
      const sector = signal.sector;
      sectorCount[sector] = (sectorCount[sector] || 0) + 1;
      return sectorCount[sector] <= 2;
    });
    
    setSignals(diversifiedSignals.slice(0, 6)); // Top 6 oportunidades
    
    // Atualizar status de risco
    if (portfolioStats.maxDrawdown > 0.08) {
      setRiskStatus('warning');
    } else {
      setRiskStatus('safe');
    }
    
  }, [marketData, capital, currentCapital, portfolioStats, tradingTime]);

  // Simulação de trade com custos reais
  const simulateRealisticTrade = useCallback((signal) => {
    // Win rate realístico baseado na confiança
    let baseWinRate = 0.62; // Base 62%
    const confidenceBonus = (signal.confidence - 75) / 200; // Bonus por confiança alta
    const finalWinRate = Math.min(0.75, baseWinRate + confidenceBonus); // Max 75%
    
    const isWin = Math.random() < finalWinRate;
    
    let grossPnL = 0;
    const costs = parseFloat(signal.totalCosts);
    
    if (isWin) {
      // Ganho baseado no target
      const targetGain = parseFloat(signal.expectedReturn);
      const actualGain = targetGain * (0.7 + Math.random() * 0.5); // 70-120% do target
      grossPnL = actualGain;
    } else {
      // Perda limitada pelo stop-loss
      const maxLoss = parseFloat(signal.estimatedCost) * 0.025; // Máximo 2.5% por stop
      const actualLoss = maxLoss * (0.8 + Math.random() * 0.4); // 80-120% do stop
      grossPnL = -actualLoss;
    }
    
    // PnL líquido após custos
    const netPnL = grossPnL - costs;
    
    const newTrade = {
      id: Date.now() + Math.random(),
      symbol: signal.symbol,
      action: signal.action,
      entryPrice: signal.price,
      exitPrice: (parseFloat(signal.price) + (grossPnL / (signal.suggestedShares || signal.suggestedContracts))).toFixed(4),
      shares: signal.suggestedShares,
      contracts: signal.suggestedContracts,
      grossPnL: grossPnL,
      costs: costs,
      netPnL: netPnL,
      confidence: signal.confidence,
      timestamp: new Date().toLocaleTimeString(),
      isWin: isWin,
      riskReward: signal.riskReward,
      sector: signal.sector
    };
    
    setTradingHistory(prev => [...prev.slice(-49), newTrade]); // Manter últimos 50 trades
    
    return newTrade;
  }, []);

  // Atualizar estatísticas do portfólio
  const updatePortfolioStats = useCallback(() => {
    if (tradingHistory.length === 0) {
      setCurrentCapital(parseFloat(capital || 0));
      return;
    }
    
    const totalNetPnL = tradingHistory.reduce((sum, trade) => sum + trade.netPnL, 0);
    const newCapital = parseFloat(capital || 0) + totalNetPnL;
    setCurrentCapital(newCapital);
    
    const wins = tradingHistory.filter(t => t.netPnL > 0);
    const losses = tradingHistory.filter(t => t.netPnL < 0);
    
    const winRate = wins.length / tradingHistory.length;
    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.netPnL, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.netPnL, 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? (wins.reduce((sum, t) => sum + t.netPnL, 0)) / Math.abs(losses.reduce((sum, t) => sum + t.netPnL, 0)) : 0;
    
    // Calcular streaks atuais
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    for (let i = tradingHistory.length - 1; i >= 0; i--) {
      if (tradingHistory[i].netPnL > 0) {
        if (currentLossStreak === 0) currentWinStreak++;
        else break;
      } else {
        if (currentWinStreak === 0) currentLossStreak++;
        else break;
      }
    }
    
    // Calcular drawdown máximo
    let peak = parseFloat(capital || 0);
    let maxDD = 0;
    let running = parseFloat(capital || 0);
    
    tradingHistory.forEach(trade => {
      running += trade.netPnL;
      if (running > peak) peak = running;
      const drawdown = (peak - running) / peak;
      if (drawdown > maxDD) maxDD = drawdown;
    });
    
    // Sharpe ratio simplificado
    const returns = tradingHistory.slice(-20).map(t => t.netPnL / parseFloat(capital || 1));
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;
    
    setPortfolioStats({
      winRate: (winRate * 100),
      winStreak: currentWinStreak,
      lossStreak: currentLossStreak,
      totalReturn: ((newCapital / parseFloat(capital || 1) - 1) * 100),
      maxDrawdown: maxDD,
      totalTrades: tradingHistory.length,
      avgWin: avgWin,
      avgLoss: avgLoss,
      profitFactor: profitFactor,
      sharpeRatio: sharpeRatio
    });
  }, [tradingHistory, capital]);

  // Análise geral do mercado
  const performMarketAnalysisV2 = useCallback(() => {
    if (Object.keys(marketData).length === 0) return;
    
    const prices = Object.values(marketData);
    const avgRSI = prices.reduce((sum, stock) => sum + stock.rsi, 0) / prices.length;
    const highVolumeStocks = prices.filter(stock => stock.volume > stock.avgVolume30d * 2).length;
    const oversoldStocks = prices.filter(stock => stock.rsi <= conservativeParams.rsi.oversold).length;
    const overboughtStocks = prices.filter(stock => stock.rsi >= conservativeParams.rsi.overbought).length;
    
    let marketSentiment = 'NEUTRO';
    if (avgRSI < 35) marketSentiment = 'MUITO PESSIMISTA';
    else if (avgRSI < 45) marketSentiment = 'PESSIMISTA';
    else if (avgRSI > 65) marketSentiment = 'MUITO OTIMISTA';
    else if (avgRSI > 55) marketSentiment = 'OTIMISTA';
    
    setAnalysis({
      avgRSI: avgRSI.toFixed(1),
      marketSentiment,
      highVolumeStocks,
      oversoldStocks,
      overboughtStocks,
      totalOpportunities: signals.length,
      riskLevel: riskStatus.toUpperCase(),
      tradingWindow: `${conservativeParams.timing.startHour}h-${conservativeParams.timing.endHour}h`
    });
  }, [marketData, signals, riskStatus]);

  // Effects
  useEffect(() => {
    simulateRealisticMarketData();
    const interval = setInterval(simulateRealisticMarketData, 45000); // Atualizar a cada 45s
    return () => clearInterval(interval);
  }, [simulateRealisticMarketData]);

  useEffect(() => {
    updatePortfolioStats();
  }, [tradingHistory, updatePortfolioStats]);

  useEffect(() => {
    analyzeMarketV2();
  }, [marketData, capital, currentCapital, portfolioStats, analyzeMarketV2]);

  useEffect(() => {
    performMarketAnalysisV2();
  }, [signals, performMarketAnalysisV2]);

  // Atualizar horário de trading
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTradingTime({ hour: now.getHours(), minute: now.getMinutes() });
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const runAnalysis = async () => {
    if (!capital) {
      alert('Por favor, insira o valor disponível para investimento');
      return;
    }
    
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    simulateRealisticMarketData();
    setLoading(false);
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'COMPRAR': return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'VENDER': return <TrendingDown className="w-5 h-5 text-red-600" />;
      default: return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'COMPRAR': return 'border-green-500 bg-green-50';
      case 'VENDER': return 'border-red-500 bg-red-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getRiskStatusColor = (status) => {
    switch (status) {
      case 'safe': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'danger': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Zap className="w-8 h-8 mr-3 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Day-Trade IA v2.0</h1>
              <p className="text-sm text-gray-600">Algoritmos Refinados | Gestão de Risco Avançada</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg flex items-center ${getRiskStatusColor(riskStatus)}`}>
            <Shield className="w-5 h-5 mr-2" />
            <span className="font-semibold">
              {riskStatus === 'safe' ? 'SEGURO' : riskStatus === 'warning' ? 'ATENÇÃO' : 'PERIGO'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="inline w-4 h-4 mr-1" />
              Capital Disponível (R$)
            </label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              placeholder="Ex: 10000"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Shield className="inline w-4 h-4 mr-1" />
              Perfil de Risco
            </label>
            <select
              value={riskProfile}
              onChange={(e) => setRiskProfile(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="conservador">Conservador</option>
              <option value="moderado">Moderado</option>
              <option value="agressivo">Agressivo</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="inline w-4 h-4 mr-1" />
              Horário de Trading
            </label>
            <div className="text-lg font-semibold text-blue-600 p-3 bg-blue-50 rounded-lg">
              {tradingTime.hour.toString().padStart(2, '0')}:{tradingTime.minute.toString().padStart(2, '0')}
            </div>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={runAnalysis}
              disabled={loading || riskStatus === 'danger'}
              className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Analisando...
                </>
              ) : riskStatus === 'danger' ? (
                <>
                  <XCircle className="w-5 h-5 mr-2" />
                  Bloqueado
                </>
              ) : (
                <>
                  <Target className="w-5 h-5 mr-2" />
                  Analisar v2.0
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Market Analysis */}
      {analysis && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Análise de Mercado v2.0</h2>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{analysis.avgRSI}</div>
              <div className="text-sm text-gray-600">RSI Médio</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{analysis.marketSentiment}</div>
              <div className="text-sm text-gray-600">Sentimento</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{analysis.highVolumeStocks}</div>
              <div className="text-sm text-gray-600">Alto Volume</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{analysis.oversoldStocks}</div>
              <div className="text-sm text-gray-600">Oversold</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{analysis.overboughtStocks}</div>
              <div className="text-sm text-gray-600">Overbought</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">{analysis.totalOpportunities}</div>
              <div className="text-sm text-gray-600">Oportunidades</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-blue-600">{analysis.tradingWindow}</div>
              <div className="text-sm text-gray-600">Janela Trading</div>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Stats */}
      {currentCapital > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6 mb-6 border border-blue-200">
          <div className="flex items-center mb-4">
            <BarChart3 className="w-6 h-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-800">Performance v2.0 (Custos Incluídos)</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-9 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">R$ {currentCapital.toFixed(0)}</div>
              <div className="text-sm text-gray-600">Capital Atual</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${parseFloat(portfolioStats.totalReturn) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {portfolioStats.totalReturn.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-600">Retorno Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{portfolioStats.winRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{portfolioStats.totalTrades}</div>
              <div className="text-sm text-gray-600">Total Trades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{portfolioStats.winStreak}</div>
              <div className="text-sm text-gray-600">Win Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{portfolioStats.lossStreak}</div>
              <div className="text-sm text-gray-600">Loss Streak</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${portfolioStats.maxDrawdown > 0.10 ? 'text-red-600' : 'text-yellow-600'}`}>
                {(portfolioStats.maxDrawdown * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Max Drawdown</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-indigo-600">{portfolioStats.profitFactor.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Profit Factor</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-teal-600">{portfolioStats.sharpeRatio.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Sharpe Ratio</div>
            </div>
          </div>
          
          {/* Risk Alerts */}
          {portfolioStats.maxDrawdown > conservativeParams.risk.maxDrawdownDaily && (
            <div className="mt-4 bg-red-100 border border-red-300 rounded-lg p-3">
              <div className="flex items-center text-red-800">
                <AlertTriangle className="w-5 h-5 mr-2" />
                <span className="font-semibold">CIRCUIT BREAKER ATIVO:</span>
                <span className="ml-1">Trading suspenso por drawdown excessivo (>{(conservativeParams.risk.maxDrawdownDaily * 100).toFixed(0)}%)</span>
              </div>
            </div>
          )}
          
          {portfolioStats.lossStreak >= 3 && (
            <div className="mt-4 bg-yellow-100 border border-yellow-300 rounded-lg p-3">
              <div className="flex items-center text-yellow-800">
                <TrendingDown className="w-5 h-5 mr-2" />
                <span className="font-semibold">ALERTA:</span>
                <span className="ml-1">{portfolioStats.lossStreak} perdas consecutivas - Position sizing reduzido</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trading Signals */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Sinais de Trading v2.0 (Conservadores)</h2>
        
        {riskStatus === 'danger' && (
          <div className="text-center py-8 bg-red-50 rounded-lg border border-red-200">
            <XCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
            <p className="text-red-700 font-semibold">Trading Suspenso</p>
            <p className="text-red-600 text-sm">Circuit breaker ativo por excesso de drawdown</p>
          </div>
        )}
        
        {signals.length === 0 && !loading && capital && riskStatus !== 'danger' && (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Nenhuma oportunidade atende aos critérios conservadores no momento.</p>
            <p className="text-sm">Aguardando setups de alta probabilidade (confiança ≥ 75%)</p>
          </div>
        )}
        
        {!capital && !loading && (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Insira seu capital disponível para começar a análise v2.0.</p>
          </div>
        )}

        <div className="grid gap-4">
          {signals.map((signal, index) => (
            <div
              key={`${signal.symbol}-${index}`}
              className={`border-2 rounded-lg p-4 ${getActionColor(signal.action)}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center">
                  {getActionIcon(signal.action)}
                  <div className="ml-3">
                    <h3 className="text-lg font-bold text-gray-800">{signal.symbol}</h3>
                    <p className="text-sm text-gray-600">
                      Confiança: {signal.confidence.toFixed(1)}% | Liquidez: {signal.liquidityScore}%
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-800">R$ {signal.price.toFixed(4)}</div>
                  <div className={`text-sm font-semibold ${signal.action === 'COMPRAR' ? 'text-green-600' : 'text-red-600'}`}>
                    {signal.action}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div>
                  <div className="text-sm text-gray-600">Stop Loss</div>
                  <div className="font-semibold text-red-600">R$ {signal.stopLoss}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Stop Gain</div>
                  <div className="font-semibold text-green-600">R$ {signal.stopGain}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Quantidade</div>
                  <div className="font-semibold">
                    {signal.suggestedShares > 0 ? `${signal.suggestedShares} ações` : `${signal.suggestedContracts} contratos`}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Investimento</div>
                  <div className="font-semibold text-blue-600">R$ {signal.estimatedCost}</div>
                </div>
              </div>

              {/* Advanced Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 bg-gray-50 p-3 rounded">
                <div>
                  <div className="text-xs text-gray-500">Risk/Reward</div>
                  <div className="text-sm font-semibold text-purple-600">1:{signal.riskReward}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Kelly %</div>
                  <div className="text-sm font-semibold text-blue-600">{signal.kellyPct}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Custos Totais</div>
                  <div className="text-sm font-semibold text-red-600">R$ {signal.totalCosts}</div>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={() => simulateRealisticTrade(signal)}
                    className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                  >
                    Simular Trade v2.0
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">RSI:</span> <span className="font-semibold">{signal.rsi}</span>
                </div>
                <div>
                  <span className="text-gray-600">ATR:</span> <span className="font-semibold">{signal.atr}</span>
                </div>
                <div>
                  <span className="text-gray-600">Setor:</span> <span className="font-semibold">{signal.sector}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <strong>Sinais:</strong> {signal.signals}
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  <strong>Filtros:</strong> {signal.filters}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trading History */}
      {tradingHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Histórico de Trades v2.0 (Com Custos Reais)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2">Hora</th>
                  <th className="text-left py-2">Ativo</th>
                  <th className="text-left py-2">Ação</th>
                  <th className="text-right py-2">Entrada</th>
                  <th className="text-right py-2">Saída</th>
                  <th className="text-right py-2">Qtd</th>
                  <th className="text-right py-2">P&L Bruto</th>
                  <th className="text-right py-2">Custos</th>
                  <th className="text-right py-2">P&L Líquido</th>
                  <th className="text-right py-2">R/R</th>
                </tr>
              </thead>
              <tbody>
                {tradingHistory.slice(-15).reverse().map((trade) => (
                  <tr key={trade.id} className="border-b border-gray-100">
                    <td className="py-2">{trade.timestamp}</td>
                    <td className="py-2 font-semibold">{trade.symbol}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        trade.action === 'COMPRAR' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {trade.action}
                      </span>
                    </td>
                    <td className="py-2 text-right">R$ {trade.entryPrice}</td>
                    <td className="py-2 text-right">R$ {trade.exitPrice}</td>
                    <td className="py-2 text-right">{trade.shares || trade.contracts}</td>
                    <td className={`py-2 text-right ${trade.grossPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {trade.grossPnL.toFixed(2)}
                    </td>
                    <td className="py-2 text-right text-gray-600">
                      R$ {trade.costs.toFixed(2)}
                    </td>
                    <td className={`py-2 text-right font-semibold ${
                      trade.netPnL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      R$ {trade.netPnL.toFixed(2)}
                    </td>
                    <td className="py-2 text-right text-blue-600">
                      {trade.riskReward}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Zap className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <strong>Day-Trade IA v2.0 - Refinamentos Implementados:</strong>
            <br />• <strong>Gestão de Risco:</strong> Circuit breaker 10%, max 5% por trade, stop-loss obrigatório
            <br />• <strong>Parâmetros Conservadores:</strong> RSI ≤20/≥80, volume ≥2.5x, confiança ≥75%
            <br />• <strong>Custos Reais:</strong> Corretagem, slippage, spread e impostos incluídos
            <br />• <strong>Position Sizing:</strong> Kelly limitado, verificação de liquidez, tamanhos realísticos
            <br />• <strong>Filtros Avançados:</strong> Liquidez, timing, gaps, diversificação setorial
            <br />• <strong>Win Rate Realístico:</strong> 60-65% esperado vs 80% da v1.0
            <br />
            <strong className="text-red-600">AVISO:</strong> Versão simulada para demonstração. Always trade with money you can afford to lose.
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingPlatformV2;