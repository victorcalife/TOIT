import { pgPool } from '../config/database';
import { TechnicalIndicators } from './technicalIndicators';

export interface RiskMetrics {
  totalPnL: number;
  dailyPnL: number;
  weeklyPnL: number;
  drawdown: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  isCircuitBreakerTriggered: boolean;
}

export interface RiskLimits {
  maxDailyLoss: number; // -5%
  maxTotalDrawdown: number; // -15%
  maxPositionSize: number; // 5%
  maxOpenPositions: number; // 3
  minWinRate: number; // 50%
  maxConsecutiveLosses: number; // 5
}

export class RiskManager {
  private static readonly DEFAULT_LIMITS: RiskLimits = {
    maxDailyLoss: -0.05, // -5%
    maxTotalDrawdown: -0.15, // -15%
    maxPositionSize: 0.05, // 5%
    maxOpenPositions: 3,
    minWinRate: 0.50, // 50%
    maxConsecutiveLosses: 5
  };

  // Circuit Breaker System - CRITICAL for protecting capital
  static async checkCircuitBreakers(symbol?: string): Promise<boolean> {
    try {
      const metrics = await this.calculateRiskMetrics();
      
      // Daily loss limit check
      if (metrics.dailyPnL <= this.DEFAULT_LIMITS.maxDailyLoss) {
        console.log('🚨 CIRCUIT BREAKER: Daily loss limit exceeded');
        await this.triggerCircuitBreaker('daily_loss_limit', metrics.dailyPnL);
        return false;
      }

      // Total drawdown check
      if (metrics.drawdown <= this.DEFAULT_LIMITS.maxTotalDrawdown) {
        console.log('🚨 CIRCUIT BREAKER: Maximum drawdown exceeded');
        await this.triggerCircuitBreaker('max_drawdown', metrics.drawdown);
        return false;
      }

      // Consecutive losses check
      const consecutiveLosses = await this.getConsecutiveLosses();
      if (consecutiveLosses >= this.DEFAULT_LIMITS.maxConsecutiveLosses) {
        console.log('🚨 CIRCUIT BREAKER: Too many consecutive losses');
        await this.triggerCircuitBreaker('consecutive_losses', consecutiveLosses);
        return false;
      }

      // Win rate degradation check
      if (metrics.winRate < this.DEFAULT_LIMITS.minWinRate && await this.getTradeCount() > 20) {
        console.log('🚨 CIRCUIT BREAKER: Win rate below minimum threshold');
        await this.triggerCircuitBreaker('low_win_rate', metrics.winRate);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error checking circuit breakers:', error);
      // Fail safe - if we can't check risk, don't trade
      return false;
    }
  }

  // Calculate comprehensive risk metrics
  static async calculateRiskMetrics(): Promise<RiskMetrics> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Get recent trades for calculations
      const tradesResult = await pgPool.query(`
        SELECT 
          pnl,
          fees,
          entry_time,
          exit_time,
          status,
          quantity * entry_price as position_value
        FROM trades 
        WHERE entry_time >= $1
        ORDER BY entry_time DESC
      `, [weekAgo]);

      const trades = tradesResult.rows;
      
      if (trades.length === 0) {
        return {
          totalPnL: 0,
          dailyPnL: 0,
          weeklyPnL: 0,
          drawdown: 0,
          maxDrawdown: 0,
          winRate: 0,
          profitFactor: 0,
          sharpeRatio: 0,
          isCircuitBreakerTriggered: false
        };
      }

      // Calculate PnL metrics
      const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      const dailyTrades = trades.filter(trade => 
        new Date(trade.entry_time) >= today
      );
      const dailyPnL = dailyTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      
      // Calculate win rate
      const closedTrades = trades.filter(trade => trade.status === 'closed');
      const winningTrades = closedTrades.filter(trade => (trade.pnl || 0) > 0);
      const winRate = closedTrades.length > 0 ? winningTrades.length / closedTrades.length : 0;

      // Calculate profit factor
      const grossProfit = winningTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      const grossLoss = Math.abs(closedTrades
        .filter(trade => (trade.pnl || 0) < 0)
        .reduce((sum, trade) => sum + (trade.pnl || 0), 0));
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

      // Calculate drawdown
      let peak = 0;
      let currentDrawdown = 0;
      let maxDrawdown = 0;
      let runningPnL = 0;

      for (const trade of trades.reverse()) { // Process chronologically
        runningPnL += (trade.pnl || 0);
        
        if (runningPnL > peak) {
          peak = runningPnL;
        }
        
        currentDrawdown = (runningPnL - peak) / Math.max(peak, 1000); // Avoid division by zero
        maxDrawdown = Math.min(maxDrawdown, currentDrawdown);
      }

      return {
        totalPnL,
        dailyPnL: dailyPnL / 10000, // Convert to percentage (assuming 10k capital)
        weeklyPnL: totalPnL / 10000,
        drawdown: currentDrawdown,
        maxDrawdown,
        winRate,
        profitFactor,
        sharpeRatio: this.calculateSharpeRatio(trades),
        isCircuitBreakerTriggered: false
      };

    } catch (error) {
      console.error('❌ Error calculating risk metrics:', error);
      throw error;
    }
  }

  // Validate position size using Kelly Criterion + Conservative limits
  static validatePositionSize(
    signal: any,
    accountBalance: number,
    winRate: number,
    avgWin: number,
    avgLoss: number
  ): number {
    try {
      // Calculate Kelly Criterion position size
      const kellySize = TechnicalIndicators.calculateKellyCriterion(
        winRate,
        avgWin,
        avgLoss,
        this.DEFAULT_LIMITS.maxPositionSize
      );

      // Apply confidence-based scaling
      const confidenceMultiplier = Math.min(signal.confidence / 100, 1);
      let adjustedSize = kellySize * confidenceMultiplier;

      // Conservative maximum: 5% of account
      adjustedSize = Math.min(adjustedSize, this.DEFAULT_LIMITS.maxPositionSize);

      // Minimum viable position: 0.5%
      adjustedSize = Math.max(adjustedSize, 0.005);

      // Calculate actual position value
      const positionValue = accountBalance * adjustedSize;

      console.log(`💰 Position sizing: Kelly=${kellySize.toFixed(3)}, Confidence=${confidenceMultiplier.toFixed(2)}, Final=${adjustedSize.toFixed(3)} ($${positionValue.toFixed(2)})`);

      return positionValue;
    } catch (error) {
      console.error('❌ Error validating position size:', error);
      return accountBalance * 0.01; // Fallback to 1%
    }
  }

  // Check if new position can be opened
  static async canOpenPosition(symbol: string): Promise<boolean> {
    try {
      // Check circuit breakers first
      const circuitBreakersOk = await this.checkCircuitBreakers(symbol);
      if (!circuitBreakersOk) return false;

      // Check maximum open positions
      const openPositionsResult = await pgPool.query(`
        SELECT COUNT(*) as count 
        FROM trades 
        WHERE status = 'open'
      `);
      
      const openPositions = parseInt(openPositionsResult.rows[0].count);
      if (openPositions >= this.DEFAULT_LIMITS.maxOpenPositions) {
        console.log(`⚠️ Maximum open positions reached: ${openPositions}/${this.DEFAULT_LIMITS.maxOpenPositions}`);
        return false;
      }

      // Check if we already have a position in this symbol
      const symbolPositionResult = await pgPool.query(`
        SELECT COUNT(*) as count 
        FROM trades 
        WHERE symbol = $1 AND status = 'open'
      `, [symbol]);
      
      const symbolPositions = parseInt(symbolPositionResult.rows[0].count);
      if (symbolPositions > 0) {
        console.log(`⚠️ Already have open position in ${symbol}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error checking position eligibility:', error);
      return false;
    }
  }

  // Stop-loss calculation using ATR
  static calculateStopLoss(
    entryPrice: number,
    atr: number,
    side: 'buy' | 'sell',
    multiplier = 2.0
  ): number {
    if (side === 'buy') {
      return entryPrice - (atr * multiplier);
    } else {
      return entryPrice + (atr * multiplier);
    }
  }

  // Take-profit calculation
  static calculateTakeProfit(
    entryPrice: number,
    stopLoss: number,
    side: 'buy' | 'sell',
    rewardRiskRatio = 2.0
  ): number {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = risk * rewardRiskRatio;

    if (side === 'buy') {
      return entryPrice + reward;
    } else {
      return entryPrice - reward;
    }
  }

  // Monitor open positions for risk management
  static async monitorOpenPositions(): Promise<void> {
    try {
      const openPositionsResult = await pgPool.query(`
        SELECT * FROM trades 
        WHERE status = 'open'
        ORDER BY entry_time ASC
      `);

      const openPositions = openPositionsResult.rows;

      for (const position of openPositions) {
        await this.checkPositionRisk(position);
      }
    } catch (error) {
      console.error('❌ Error monitoring open positions:', error);
    }
  }

  private static async checkPositionRisk(position: any): Promise<void> {
    try {
      // Get current market price (would need real-time data feed)
      // For now, simulate current price check
      
      // Check stop-loss levels
      if (position.stop_loss) {
        // Implement stop-loss trigger logic
        console.log(`🔍 Monitoring ${position.symbol} stop-loss at ${position.stop_loss}`);
      }

      // Check take-profit levels
      if (position.take_profit) {
        // Implement take-profit trigger logic
        console.log(`🔍 Monitoring ${position.symbol} take-profit at ${position.take_profit}`);
      }

      // Check position age (close if held too long)
      const entryTime = new Date(position.entry_time);
      const now = new Date();
      const hoursHeld = (now.getTime() - entryTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursHeld > 24) { // Close positions held longer than 1 day
        console.log(`⏰ Position ${position.symbol} held for ${hoursHeld.toFixed(1)} hours - consider closing`);
      }

    } catch (error) {
      console.error('❌ Error checking position risk:', error);
    }
  }

  private static async triggerCircuitBreaker(reason: string, value: number): Promise<void> {
    try {
      // Log circuit breaker event
      console.log(`🚨 CIRCUIT BREAKER TRIGGERED: ${reason} - Value: ${value}`);
      
      // Close all open positions immediately
      await pgPool.query(`
        UPDATE trades 
        SET status = 'closed', 
            exit_reason = 'circuit_breaker_' || $1,
            exit_time = NOW()
        WHERE status = 'open'
      `, [reason]);

      // Disable trading for the session
      // Implementation would depend on trading engine architecture
      
    } catch (error) {
      console.error('❌ Error triggering circuit breaker:', error);
    }
  }

  private static async getConsecutiveLosses(): Promise<number> {
    try {
      const result = await pgPool.query(`
        SELECT pnl 
        FROM trades 
        WHERE status = 'closed' 
        ORDER BY exit_time DESC 
        LIMIT 10
      `);

      let consecutiveLosses = 0;
      for (const trade of result.rows) {
        if ((trade.pnl || 0) < 0) {
          consecutiveLosses++;
        } else {
          break;
        }
      }

      return consecutiveLosses;
    } catch (error) {
      console.error('❌ Error getting consecutive losses:', error);
      return 0;
    }
  }

  private static async getTradeCount(): Promise<number> {
    try {
      const result = await pgPool.query(`
        SELECT COUNT(*) as count 
        FROM trades 
        WHERE status = 'closed'
      `);
      
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('❌ Error getting trade count:', error);
      return 0;
    }
  }

  private static calculateSharpeRatio(trades: any[]): number {
    if (trades.length < 2) return 0;

    const returns = trades.map(trade => trade.pnl || 0);
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? avgReturn / stdDev : 0;
  }

  // Get comprehensive risk report
  static async getRiskReport(): Promise<any> {
    try {
      const metrics = await this.calculateRiskMetrics();
      const consecutiveLosses = await this.getConsecutiveLosses();
      const tradeCount = await this.getTradeCount();
      
      return {
        ...metrics,
        consecutiveLosses,
        totalTrades: tradeCount,
        riskLimits: this.DEFAULT_LIMITS,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Error generating risk report:', error);
      throw error;
    }
  }
}