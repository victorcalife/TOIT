// Reusable technical indicators library for trading algorithms
export interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
}

export interface MACD {
  macd: number;
  signal: number;
  histogram: number;
}

export interface VolumeProfile {
  averageVolume: number;
  volumeRatio: number;
  isHighVolume: boolean;
}

export class TechnicalIndicators {
  
  // RSI (Relative Strength Index) - 14 period default
  static calculateRSI(data: OHLCV[], period = 14): number[] {
    if (data.length < period + 1) return [];
    
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];
    
    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    // Calculate initial average gain and loss
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;
    
    // Calculate RSI for each point
    for (let i = period; i < gains.length; i++) {
      if (i === period) {
        // First RSI calculation
        const rs = avgGain / (avgLoss || 0.001); // Avoid division by zero
        rsi.push(100 - (100 / (1 + rs)));
      } else {
        // Smoothed RSI calculation
        avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
        avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
        const rs = avgGain / (avgLoss || 0.001);
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
    
    return rsi;
  }
  
  // Bollinger Bands - 20 period, 2 standard deviations default
  static calculateBollingerBands(data: OHLCV[], period = 20, stdDev = 2): BollingerBands[] {
    if (data.length < period) return [];
    
    const bands: BollingerBands[] = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const closes = slice.map(d => d.close);
      
      // Calculate Simple Moving Average (SMA)
      const sma = closes.reduce((sum, close) => sum + close, 0) / period;
      
      // Calculate Standard Deviation
      const variance = closes.reduce((sum, close) => sum + Math.pow(close - sma, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      bands.push({
        middle: sma,
        upper: sma + (standardDeviation * stdDev),
        lower: sma - (standardDeviation * stdDev)
      });
    }
    
    return bands;
  }
  
  // MACD (Moving Average Convergence Divergence) - 12, 26, 9 default
  static calculateMACD(data: OHLCV[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): MACD[] {
    if (data.length < slowPeriod) return [];
    
    const closes = data.map(d => d.close);
    
    // Calculate EMAs
    const fastEMA = this.calculateEMA(closes, fastPeriod);
    const slowEMA = this.calculateEMA(closes, slowPeriod);
    
    // Calculate MACD line
    const macdLine: number[] = [];
    const startIndex = slowPeriod - 1;
    
    for (let i = startIndex; i < fastEMA.length; i++) {
      macdLine.push(fastEMA[i] - slowEMA[i - startIndex]);
    }
    
    // Calculate Signal line (EMA of MACD)
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    
    // Calculate Histogram
    const macd: MACD[] = [];
    const signalStartIndex = signalPeriod - 1;
    
    for (let i = signalStartIndex; i < macdLine.length; i++) {
      macd.push({
        macd: macdLine[i],
        signal: signalLine[i - signalStartIndex],
        histogram: macdLine[i] - signalLine[i - signalStartIndex]
      });
    }
    
    return macd;
  }
  
  // EMA (Exponential Moving Average) helper
  static calculateEMA(data: number[], period: number): number[] {
    if (data.length < period) return [];
    
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for first value
    let previousEMA = data.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
    ema.push(previousEMA);
    
    // Calculate EMA for remaining values
    for (let i = period; i < data.length; i++) {
      const currentEMA = (data[i] * multiplier) + (previousEMA * (1 - multiplier));
      ema.push(currentEMA);
      previousEMA = currentEMA;
    }
    
    return ema;
  }
  
  // ATR (Average True Range) - 14 period default
  static calculateATR(data: OHLCV[], period = 14): number[] {
    if (data.length < period + 1) return [];
    
    const trueRanges: number[] = [];
    
    // Calculate True Range for each period
    for (let i = 1; i < data.length; i++) {
      const currentHigh = data[i].high;
      const currentLow = data[i].low;
      const previousClose = data[i - 1].close;
      
      const tr = Math.max(
        currentHigh - currentLow,
        Math.abs(currentHigh - previousClose),
        Math.abs(currentLow - previousClose)
      );
      
      trueRanges.push(tr);
    }
    
    // Calculate ATR using smoothed moving average
    const atr: number[] = [];
    
    // First ATR is simple average
    let previousATR = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
    atr.push(previousATR);
    
    // Subsequent ATRs are smoothed
    for (let i = period; i < trueRanges.length; i++) {
      const currentATR = ((previousATR * (period - 1)) + trueRanges[i]) / period;
      atr.push(currentATR);
      previousATR = currentATR;
    }
    
    return atr;
  }
  
  // Volume Profile Analysis
  static calculateVolumeProfile(data: OHLCV[], period = 30): VolumeProfile {
    if (data.length < period) {
      return {
        averageVolume: 0,
        volumeRatio: 0,
        isHighVolume: false
      };
    }
    
    const recentData = data.slice(-period);
    const currentVolume = data[data.length - 1].volume;
    
    const averageVolume = recentData.reduce((sum, d) => sum + d.volume, 0) / period;
    const volumeRatio = currentVolume / averageVolume;
    const isHighVolume = volumeRatio >= 2.5; // 2.5x average threshold
    
    return {
      averageVolume,
      volumeRatio,
      isHighVolume
    };
  }
  
  // VWAP (Volume Weighted Average Price)
  static calculateVWAP(data: OHLCV[]): number[] {
    if (data.length === 0) return [];
    
    const vwap: number[] = [];
    let cumulativePriceVolume = 0;
    let cumulativeVolume = 0;
    
    for (let i = 0; i < data.length; i++) {
      const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
      const priceVolume = typicalPrice * data[i].volume;
      
      cumulativePriceVolume += priceVolume;
      cumulativeVolume += data[i].volume;
      
      vwap.push(cumulativeVolume > 0 ? cumulativePriceVolume / cumulativeVolume : typicalPrice);
    }
    
    return vwap;
  }
  
  // Support and Resistance Levels
  static findSupportResistance(data: OHLCV[], lookback = 20): { support: number[]; resistance: number[] } {
    if (data.length < lookback * 2) return { support: [], resistance: [] };
    
    const support: number[] = [];
    const resistance: number[] = [];
    
    for (let i = lookback; i < data.length - lookback; i++) {
      const slice = data.slice(i - lookback, i + lookback + 1);
      const currentLow = data[i].low;
      const currentHigh = data[i].high;
      
      // Check if current low is a local minimum (support)
      const isSupport = slice.every(d => d.low >= currentLow);
      if (isSupport) {
        support.push(currentLow);
      }
      
      // Check if current high is a local maximum (resistance)
      const isResistance = slice.every(d => d.high <= currentHigh);
      if (isResistance) {
        resistance.push(currentHigh);
      }
    }
    
    return { support, resistance };
  }
  
  // Kelly Criterion Position Sizing (Conservative)
  static calculateKellyCriterion(winRate: number, avgWin: number, avgLoss: number, maxPosition = 0.05): number {
    if (avgLoss === 0 || winRate === 0) return 0;
    
    // Kelly Formula: f = (bp - q) / b
    // where b = odds received (avgWin/avgLoss), p = win probability, q = loss probability
    const b = avgWin / avgLoss;
    const p = winRate;
    const q = 1 - winRate;
    
    const kellyPercentage = (b * p - q) / b;
    
    // Apply conservative limits
    return Math.max(0, Math.min(kellyPercentage, maxPosition));
  }
  
  // Anti-Martingale Position Sizing
  static calculateAntiMartingale(
    basePosition: number, 
    recentWins: number, 
    recentLosses: number, 
    winMultiplier = 1.15, 
    lossMultiplier = 0.75
  ): number {
    let adjustedPosition = basePosition;
    
    // Increase position after wins (but conservatively)
    if (recentWins > 0) {
      adjustedPosition *= Math.pow(winMultiplier, Math.min(recentWins, 3)); // Max 3 consecutive wins
    }
    
    // Decrease position after losses
    if (recentLosses > 0) {
      adjustedPosition *= Math.pow(lossMultiplier, recentLosses);
    }
    
    // Ensure position doesn't exceed 5% of capital
    return Math.min(adjustedPosition, 0.05);
  }
}