import { Router } from 'express';
import { login, logout, verify, refreshToken, me } from '../controllers/authController';
import { portalAuth, optionalAuth } from '../middleware/ssoMiddleware';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);

// Protected routes - usando novo SSO middleware
router.get('/verify', portalAuth, verify);
router.get('/me', portalAuth, me);

// Health check - não requer auth
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'TOIT Auth Service',
    timestamp: new Date().toISOString() 
  });
});

export default router;