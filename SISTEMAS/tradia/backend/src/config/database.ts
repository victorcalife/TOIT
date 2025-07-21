import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL Configuration (Railway shared with Portal)
const postgresConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create PostgreSQL connection pool (shared with Portal)
export const pgPool = new Pool(postgresConfig);

// Graceful shutdown
process.on('SIGINT', () => {
  pgPool.end();
});

process.on('SIGTERM', () => {
  pgPool.end();
});

// Test database connection
export const testConnection = async () => {
  try {
    const client = await pgPool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Trad.ia PostgreSQL Database connected successfully');
    console.log('🕐 Server time:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Trad.ia PostgreSQL Database connection failed:', error);
    return false;
  }
};

// Initialize database and run Trad.ia specific migrations
export const initDatabase = async () => {
  try {
    await testConnection();
    
    // Check if tables exist
    const client = await pgPool.connect();
    
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'trading_%'
      ORDER BY table_name;
    `;
    
    const tables = await client.query(tablesQuery);
    console.log('📋 Available Trad.ia tables:', tables.rows.map(row => row.table_name));
    
    // Run Trad.ia specific migrations
    await runTradingMigrations(client);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Trad.ia Database initialization failed:', error);
    throw error;
  }
};

// Trading-specific database migrations
const runTradingMigrations = async (client: any) => {
  try {
    // Migration 003: Trading Sessions table
    const migration003 = 'create_trading_sessions_table';
    const migration003Exists = await client.query(
      'SELECT 1 FROM migrations WHERE name = $1',
      [migration003]
    );

    if (migration003Exists.rows.length === 0) {
      await client.query(`
        CREATE TABLE trading_sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('paper', 'live')),
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
          initial_capital DECIMAL(15,2) NOT NULL,
          current_capital DECIMAL(15,2) NOT NULL,
          pnl DECIMAL(15,2) DEFAULT 0,
          trades_count INTEGER DEFAULT 0,
          win_rate DECIMAL(5,2) DEFAULT 0,
          max_drawdown DECIMAL(5,2) DEFAULT 0,
          strategy_config JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_trading_sessions_user_id ON trading_sessions(user_id);
        CREATE INDEX idx_trading_sessions_status ON trading_sessions(status);
        CREATE INDEX idx_trading_sessions_type ON trading_sessions(session_type);
      `);

      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migration003]
      );

      console.log('✅ Migration 003: Trading Sessions table created');
    }

    // Migration 004: Trades table
    const migration004 = 'create_trades_table';
    const migration004Exists = await client.query(
      'SELECT 1 FROM migrations WHERE name = $1',
      [migration004]
    );

    if (migration004Exists.rows.length === 0) {
      await client.query(`
        CREATE TABLE trades (
          id SERIAL PRIMARY KEY,
          session_id INTEGER REFERENCES trading_sessions(id),
          symbol VARCHAR(10) NOT NULL,
          side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
          quantity INTEGER NOT NULL,
          entry_price DECIMAL(10,4) NOT NULL,
          exit_price DECIMAL(10,4),
          stop_loss DECIMAL(10,4),
          take_profit DECIMAL(10,4),
          status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
          pnl DECIMAL(15,2),
          fees DECIMAL(10,2) DEFAULT 0,
          strategy VARCHAR(50),
          entry_reason TEXT,
          exit_reason TEXT,
          entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          exit_time TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_trades_session_id ON trades(session_id);
        CREATE INDEX idx_trades_symbol ON trades(symbol);
        CREATE INDEX idx_trades_status ON trades(status);
        CREATE INDEX idx_trades_entry_time ON trades(entry_time);
      `);

      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migration004]
      );

      console.log('✅ Migration 004: Trades table created');
    }

    // Migration 005: Market Data table
    const migration005 = 'create_market_data_table';
    const migration005Exists = await client.query(
      'SELECT 1 FROM migrations WHERE name = $1',
      [migration005]
    );

    if (migration005Exists.rows.length === 0) {
      await client.query(`
        CREATE TABLE market_data (
          id SERIAL PRIMARY KEY,
          symbol VARCHAR(10) NOT NULL,
          timestamp TIMESTAMP NOT NULL,
          open DECIMAL(10,4) NOT NULL,
          high DECIMAL(10,4) NOT NULL,
          low DECIMAL(10,4) NOT NULL,
          close DECIMAL(10,4) NOT NULL,
          volume BIGINT NOT NULL,
          timeframe VARCHAR(10) NOT NULL CHECK (timeframe IN ('1m', '5m', '15m', '1h', '1d')),
          source VARCHAR(20) DEFAULT 'cedrotech',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE UNIQUE INDEX idx_market_data_unique ON market_data(symbol, timestamp, timeframe);
        CREATE INDEX idx_market_data_symbol_time ON market_data(symbol, timestamp DESC);
        CREATE INDEX idx_market_data_timeframe ON market_data(timeframe);
      `);

      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migration005]
      );

      console.log('✅ Migration 005: Market Data table created');
    }

    // Migration 006: Signals table
    const migration006 = 'create_signals_table';
    const migration006Exists = await client.query(
      'SELECT 1 FROM migrations WHERE name = $1',
      [migration006]
    );

    if (migration006Exists.rows.length === 0) {
      await client.query(`
        CREATE TABLE signals (
          id SERIAL PRIMARY KEY,
          symbol VARCHAR(10) NOT NULL,
          signal_type VARCHAR(20) NOT NULL CHECK (signal_type IN ('buy', 'sell', 'hold')),
          strategy VARCHAR(50) NOT NULL,
          confidence DECIMAL(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
          price DECIMAL(10,4) NOT NULL,
          target_price DECIMAL(10,4),
          stop_loss DECIMAL(10,4),
          indicators JSONB,
          processed BOOLEAN DEFAULT FALSE,
          trade_id INTEGER REFERENCES trades(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_signals_symbol ON signals(symbol);
        CREATE INDEX idx_signals_type ON signals(signal_type);
        CREATE INDEX idx_signals_strategy ON signals(strategy);
        CREATE INDEX idx_signals_processed ON signals(processed);
        CREATE INDEX idx_signals_created_at ON signals(created_at DESC);
      `);

      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migration006]
      );

      console.log('✅ Migration 006: Signals table created');
    }

  } catch (error) {
    console.error('❌ Trading migration failed:', error);
    throw error;
  }
};