import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
  ssl?: boolean;
}

// PostgreSQL Configuration (Railway)
const postgresConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create PostgreSQL connection pool
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
    console.log('✅ PostgreSQL Database connected successfully');
    console.log('🕐 Server time:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL Database connection failed:', error);
    return false;
  }
};

// Initialize database and run migrations
export const initDatabase = async () => {
  try {
    await testConnection();
    
    // Check if tables exist
    const client = await pgPool.connect();
    
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const tables = await client.query(tablesQuery);
    console.log('📋 Available tables:', tables.rows.map(row => row.table_name));
    
    // Run migrations if needed
    await runMigrations(client);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Database migrations
const runMigrations = async (client: any) => {
  try {
    // Create migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration 001: Users table
    const migration001 = 'create_users_table';
    const migrationExists = await client.query(
      'SELECT 1 FROM migrations WHERE name = $1',
      [migration001]
    );

    if (migrationExists.rows.length === 0) {
      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          cpf VARCHAR(14) NOT NULL UNIQUE,
          senha VARCHAR(255) NOT NULL,
          perfil VARCHAR(20) NOT NULL CHECK (perfil IN ('ADMIN', 'TOIT', 'CLIENTE')),
          cliente_key VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_users_cpf ON users(cpf);
        CREATE INDEX idx_users_perfil ON users(perfil);
      `);

      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migration001]
      );

      console.log('✅ Migration 001: Users table created');
    }

    // Migration 002: Leads table
    const migration002 = 'create_leads_table';
    const migration002Exists = await client.query(
      'SELECT 1 FROM migrations WHERE name = $1',
      [migration002]
    );

    if (migration002Exists.rows.length === 0) {
      await client.query(`
        CREATE TABLE leads (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          company VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          message TEXT,
          source VARCHAR(50) DEFAULT 'website',
          status VARCHAR(20) DEFAULT 'new',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_leads_email ON leads(email);
        CREATE INDEX idx_leads_status ON leads(status);
        CREATE INDEX idx_leads_created_at ON leads(created_at);
      `);

      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migration002]
      );

      console.log('✅ Migration 002: Leads table created');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};