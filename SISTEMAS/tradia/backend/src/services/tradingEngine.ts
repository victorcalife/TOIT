import { pgPool } from '../config/database';
import { TechnicalIndicators } from './technicalIndicators';
import { RiskManager } from './riskManager';
import { PortfolioManager } from './portfolioManager';

export interface TradeSignal {
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  targetPrice?: number;
  stopLoss?: number;
  strategy: string;
  indicators: any;
  timestamp: Date;
}

export interface TradingConfig {
  maxPositionSize: number; // Percentage of capital (Kelly Criterion limited to 5%)
  maxDrawdown: number; // Maximum allowed drawdown (10%)
  dailyLossLimit: number; // Daily loss limit
  riskPerTrade: number; // Risk per trade (2x ATR)
  tradingHours: { start: string; end: string }; // 10h-16h
  minimumVolume: number; // 2.5x average volume
  strategies: string[]; // Active strategies
}

export class TradingEngine {
  private static instance: TradingEngine;
  private isInitialized = false;
  private activeStrategies: Map<string, any> = new Map();
  private config: TradingConfig;

  constructor() {
    this.config = {
      maxPositionSize: 0.05, // 5% Kelly Criterion limit
      maxDrawdown: 0.10, // 10% circuit breaker
      dailyLossLimit: 0.05, // 5% daily loss limit
      riskPerTrade: 2.0, // 2x ATR for stop-loss
      tradingHours: { start: '10:00', end: '16:00' },
      minimumVolume: 2.5, // 2.5x average volume
      strategies: ['kelly_conservative', 'rsi_bollinger', 'macd_momentum']
    };
  }

  public static getInstance(): TradingEngine {
    if (!TradingEngine.instance) {
      TradingEngine.instance = new TradingEngine();
    }
    return TradingEngine.instance;
  }

  public static initialize(): void {
    const engine = TradingEngine.getInstance();
    engine.initializeEngine();
  }

  private async initializeEngine(): Promise<void> {
    try {
      console.log('🤖 Initializing Trading Engine v2.0...');
      
      // Load trading sessions
      await this.loadActiveSessions();
      
      // Initialize strategies
      this.initializeStrategies();
      
      // Start monitoring
      this.startMarketMonitoring();
      
      this.isInitialized = true;
      console.log('✅ Trading Engine initialized successfully');
      
    } catch (error) {
      console.error('❌ Trading Engine initialization failed:', error);
      throw error;
    }
  }

  private async loadActiveSessions(): Promise<void> {
    try {
      const result = await pgPool.query(`
        SELECT * FROM trading_sessions 
        WHERE status = 'active'
        ORDER BY created_at DESC
      `);
      
      console.log(`📊 Loaded ${result.rows.length} active trading sessions`);
    } catch (error) {
      console.error('❌ Error loading trading sessions:', error);
      throw error;
    }
  }

  private initializeStrategies(): void {
    // Kelly Criterion Conservative Strategy
    this.activeStrategies.set('kelly_conservative', {
      name: 'Kelly Criterion Conservative',
      analyze: this.kellyConservativeStrategy.bind(this),
      enabled: true
    });

    // RSI + Bollinger Bands Strategy
    this.activeStrategies.set('rsi_bollinger', {
      name: 'RSI + Bollinger Bands',
      analyze: this.rsiBollingerStrategy.bind(this),
      enabled: true
    });

    // MACD Momentum Strategy
    this.activeStrategies.set('macd_momentum', {
      name: 'MACD Momentum',
      analyze: this.macdMomentumStrategy.bind(this),
      enabled: true
    });

    console.log(`🎯 Initialized ${this.activeStrategies.size} trading strategies`);
  }

  private startMarketMonitoring(): void {
    // Monitor market every 30 seconds during trading hours
    setInterval(async () => {
      if (this.isMarketOpen()) {
        await this.analyzeMarket();
      }
    }, 30000);

    console.log('👀 Market monitoring started');
  }

  private isMarketOpen(): boolean {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Check if it's a weekday (Monday-Friday)
    const isWeekday = currentDay >= 1 && currentDay <= 5;
    
    // Check if it's within trading hours
    const isWithinHours = currentTime >= this.config.tradingHours.start && 
                         currentTime <= this.config.tradingHours.end;
    
    return isWeekday && isWithinHours;
  }

  private async analyzeMarket(): Promise<void> {
    try {
      // Get active symbols to analyze
      const symbols = await this.getActiveSymbols();
      
      for (const symbol of symbols) {
        // Check circuit breakers first
        const canTrade = await RiskManager.checkCircuitBreakers(symbol);
        if (!canTrade) {
          continue;
        }

        // Run all active strategies
        for (const [strategyName, strategy] of this.activeStrategies) {
          if (strategy.enabled) {
            try {
              const signal = await strategy.analyze(symbol);
              if (signal && signal.confidence > 70) {
                await this.processSignal(signal);
              }
            } catch (error) {
              console.error(`❌ Strategy ${strategyName} error for ${symbol}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Market analysis error:', error);
    }
  }

  private async getActiveSymbols(): Promise<string[]> {
    // Return BOVESPA symbols with sufficient liquidity
    return ['PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'ABEV3', 'WEGE3', 'MGLU3'];
  }

  private async kellyConservativeStrategy(symbol: string): Promise<TradeSignal | null> {
    try {
      // Get market data for analysis
      const marketData = await this.getMarketData(symbol, 50); // 50 periods
      if (marketData.length < 20) return null;

      // Calculate technical indicators
      const rsi = TechnicalIndicators.calculateRSI(marketData, 14);
      const bollinger = TechnicalIndicators.calculateBollingerBands(marketData, 20, 2);
      const volume = TechnicalIndicators.calculateVolumeProfile(marketData, 30);
      const atr = TechnicalIndicators.calculateATR(marketData, 14);

      const currentPrice = marketData[marketData.length - 1].close;
      const currentRSI = rsi[rsi.length - 1];
      const currentBollinger = bollinger[bollinger.length - 1];
      const currentVolume = marketData[marketData.length - 1].volume;
      const avgVolume = volume.averageVolume;

      // Kelly Criterion Conservative Rules
      let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let confidence = 0;
      let targetPrice = 0;
      let stopLoss = 0;

      // Volume filter (minimum 2.5x average)
      if (currentVolume < avgVolume * this.config.minimumVolume) {
        return null;
      }

      // BUY Signal: RSI oversold + price near lower Bollinger Band
      if (currentRSI <= 20 && currentPrice <= currentBollinger.lower * 1.02) {
        signal = 'BUY';
        confidence = Math.min(95, 60 + (20 - currentRSI) * 2);
        targetPrice = currentBollinger.middle;
        stopLoss = currentPrice - (atr[atr.length - 1] * this.config.riskPerTrade);
      }
      
      // SELL Signal: RSI overbought + price near upper Bollinger Band
      else if (currentRSI >= 80 && currentPrice >= currentBollinger.upper * 0.98) {
        signal = 'SELL';
        confidence = Math.min(95, 60 + (currentRSI - 80) * 2);
        targetPrice = currentBollinger.middle;
        stopLoss = currentPrice + (atr[atr.length - 1] * this.config.riskPerTrade);
      }

      if (signal !== 'HOLD' && confidence >= 70) {
        return {
          symbol,
          signal,
          confidence,
          price: currentPrice,
          targetPrice,
          stopLoss,
          strategy: 'kelly_conservative',
          indicators: {
            rsi: currentRSI,
            bollinger: currentBollinger,
            volume: currentVolume,
            avgVolume,
            atr: atr[atr.length - 1]
          },
          timestamp: new Date()
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ Kelly Conservative strategy error for ${symbol}:`, error);
      return null;
    }
  }

  private async rsiBollingerStrategy(symbol: string): Promise<TradeSignal | null> {
    // Implementation similar to Kelly but with different parameters
    // Focus on RSI divergences and Bollinger Band squeezes
    return null; // Placeholder
  }

  private async macdMomentumStrategy(symbol: string): Promise<TradeSignal | null> {
    // Implementation focusing on MACD crossovers and momentum
    return null; // Placeholder
  }

  private async getMarketData(symbol: string, periods: number): Promise<any[]> {
    try {
      const result = await pgPool.query(`
        SELECT * FROM market_data 
        WHERE symbol = $1 AND timeframe = '5m'
        ORDER BY timestamp DESC 
        LIMIT $2
      `, [symbol, periods]);

      return result.rows.reverse(); // Return in chronological order
    } catch (error) {
      console.error(`❌ Error getting market data for ${symbol}:`, error);
      return [];
    }
  }

  private async processSignal(signal: TradeSignal): Promise<void> {
    try {
      // Save signal to database
      await pgPool.query(`
        INSERT INTO signals 
        (symbol, signal_type, strategy, confidence, price, target_price, stop_loss, indicators)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        signal.symbol,
        signal.signal.toLowerCase(),
        signal.strategy,
        signal.confidence,
        signal.price,
        signal.targetPrice,
        signal.stopLoss,
        JSON.stringify(signal.indicators)
      ]);

      console.log(`🎯 Signal generated: ${signal.signal} ${signal.symbol} @ ${signal.price} (${signal.confidence}%)`);

      // If in live trading mode, execute the trade
      // For now, just log - actual execution would require broker integration
      
    } catch (error) {
      console.error('❌ Error processing signal:', error);
    }
  }

  public async getSignals(symbol?: string, limit = 50): Promise<any[]> {
    try {
      let query = `
        SELECT * FROM signals 
        WHERE 1=1
      `;
      const params: any[] = [];

      if (symbol) {
        query += ` AND symbol = $${params.length + 1}`;
        params.push(symbol);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await pgPool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting signals:', error);
      return [];
    }
  }

  public getConfig(): TradingConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<TradingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Trading configuration updated');
  }
}