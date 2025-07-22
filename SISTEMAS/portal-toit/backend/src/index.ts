import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import contactRoutes from './routes/contact';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { initDatabase } from './config/database';
import { resolveTenant } from './middleware/ssoMiddleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Basic middleware
app.use(morgan('combined'));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (including login page) - Disabled for backend-only deploy
// app.use(express.static(path.join(__dirname, '../../frontend')));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'Portal TOIT Backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Tenant resolution middleware para todas as rotas (exceto health)
app.use('/api', (req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  return resolveTenant(req, res, next);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/contact', contactRoutes);

// Frontend routes - Disabled for backend-only deploy
// app.get('/login', (req, res) => {
//   res.sendFile(path.join(__dirname, '../../frontend/login-sso.html'));
// });

// app.get('/portal*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../../frontend/portal_blueworld_toit.html'));
// });

// Root redirect - API only
app.get('/', (req, res) => {
  res.json({ 
    message: 'Portal TOIT Backend API',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      dashboard: '/api/dashboard'
    }
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`🚀 Portal TOIT Backend running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  
  // Initialize database
  try {
    await initDatabase();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
});

export default app;