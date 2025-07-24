import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import WebSocket from 'ws';

// ...existing code...
import { initDatabase } from './config/database';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3002;

// WebSocket Server for real-time data
const wss = new WebSocket.Server({ server });

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting - more restrictive for trading API
const tradingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute for trading
  message: 'Too many trading requests, please slow down'
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200 // 200 requests per 15 minutes for general API
});

app.use('/api/trading', tradingLimiter);
app.use('/api/', generalLimiter);

// Basic middleware
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'Trad.ia Backend',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API Routes
// ...existing code...

// ...existing code...

// Error handling
// ...existing code...

// Start server
server.listen(PORT, async () => {
  console.log(`🚀 Trad.ia Backend running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`⚡ WebSocket Server: ws://localhost:${PORT}`);
  
  // Initialize database
  try {
    await initDatabase();
    console.log('✅ Trad.ia Database initialized successfully');
  } catch (error) {
    console.error('❌ Trad.ia Database initialization failed:', error);
  }
  
  // ...existing code...
});

export default app;