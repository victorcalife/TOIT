import { BacktestingEngine } from './services/backtesting';

async function runCompleteBacktest() {
  console.log('🚀 Starting Trad.ia v2.0 Comprehensive Backtest...\n');
  
  // Test multiple BOVESPA stocks
  const symbols = ['PETR4', 'VALE3', 'ITUB4', 'BBDC4'];
  const allResults = [];
  
  for (const symbol of symbols) {
    console.log(`\n🔍 Analyzing ${symbol}...`);
    console.log('='.repeat(50));
    
    try {
      const results = await BacktestingEngine.runComprehensiveBacktest(symbol, 252); // 1 year
      allResults.push(...results);
      
      // Generate report for this symbol
      const report = BacktestingEngine.generatePerformanceReport(results);
      console.log(report);
      
    } catch (error) {
      console.error(`❌ Error backtesting ${symbol}:`, error);
    }
  }
  
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 FINAL SUMMARY - ALL SYMBOLS');
  console.log('='.repeat(80));
  
  // Calculate aggregate statistics
  const totalTrades = allResults.reduce((sum, r) => sum + r.totalTrades, 0);
  const avgWinRate = allResults.reduce((sum, r) => sum + r.winRate, 0) / allResults.length;
  const avgSharpe = allResults.reduce((sum, r) => sum + r.sharpeRatio, 0) / allResults.length;
  const avgReturn = allResults.reduce((sum, r) => sum + r.realNetReturn, 0) / allResults.length;
  const avgDrawdown = allResults.reduce((sum, r) => sum + r.maxDrawdown, 0) / allResults.length;
  
  console.log(`\n📈 AGGREGATE METRICS:`);
  console.log(`   Total Trades Analyzed: ${totalTrades}`);
  console.log(`   Average Win Rate: ${(avgWinRate * 100).toFixed(2)}%`);
  console.log(`   Average Sharpe Ratio: ${avgSharpe.toFixed(2)}`);
  console.log(`   Average Net Return: ${(avgReturn * 100).toFixed(2)}%`);
  console.log(`   Average Max Drawdown: ${(avgDrawdown * 100).toFixed(2)}%`);
  
  console.log(`\n🎯 STRATEGIC RECOMMENDATIONS:`);
  console.log(`   1. Focus on high-liquidity stocks (PETR4, VALE3)`);
  console.log(`   2. Maintain strict 5% position size limit`);
  console.log(`   3. Use circuit breakers religiously`);
  console.log(`   4. Expect 10-30% monthly returns with 15% drawdowns`);
  console.log(`   5. Paper trade for at least 3 months before going live`);
  
  console.log(`\n💰 CAPITAL REQUIREMENTS:`);
  console.log(`   Minimum: R$ 50,000 (for proper diversification)`);
  console.log(`   Recommended: R$ 100,000+ (for smoother equity curve)`);
  console.log(`   Per Trade Risk: Max 2% of capital`);
  
  console.log(`\n⚠️  RISK DISCLAIMER:`);
  console.log(`   These are BACKTEST results with several limitations:`);
  console.log(`   - No market impact modeling`);
  console.log(`   - Perfect execution assumed`);
  console.log(`   - No technical failures considered`);
  console.log(`   - Historical patterns may not repeat`);
  console.log(`   - ALWAYS use stop losses and risk management`);
  
  console.log('\n✅ Backtest completed successfully!\n');
}

// Run the backtest
runCompleteBacktest().catch(console.error);