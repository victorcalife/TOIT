import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { leadRoutes } from './routes/leads';
import { contactRoutes } from './routes/contact';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Configuração de segurança
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https://api.toit.com.br"],
            imgSrc: ["'self'", "data:", "https:"],
            mediaSrc: ["'self'"]
        }
    }
}));

// CORS para o site institucional
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://toit.com.br',
        'https://www.toit.com.br',
        'https://toitsite.up.railway.app',
        'https://toitsitedev.up.railway.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
    message: {
        error: 'Muitas tentativas. Tente novamente em 15 minutos.',
        retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(limiter);

// Middleware para parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy para Railway
app.set('trust proxy', true);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Rotas principais
app.use('/api/leads', leadRoutes);
app.use('/api/contact', contactRoutes);

// Rota raiz
app.get('/', (req, res) => {
    res.json({
        message: 'TOIT Site Backend API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            leads: '/api/leads',
            contact: '/api/contact'
        },
        documentation: 'https://docs.toit.com.br'
    });
});

// Middleware de erro
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint não encontrado',
        message: `Rota ${req.method} ${req.originalUrl} não existe`,
        availableEndpoints: ['/health', '/api/leads', '/api/contact']
    });
});

// Inicializar servidor
app.listen(PORT, () => {
    console.log(`🚀 TOIT Site Backend rodando na porta ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    
    if (process.env.NODE_ENV === 'production') {
        console.log('🔒 Rodando em modo PRODUÇÃO');
    } else {
        console.log('🛠️ Rodando em modo DESENVOLVIMENTO');
    }
});

export default app;