// middleware/ssoMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { ToitJWTPayload } from '../types/auth';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        cpf?: string;
        role: string;
        permissions: string[];
      };
      tenant?: {
        id: string;
        slug: string;
        name: string;
        plan: string;
      };
      system?: {
        system_id: string;
        role: string;
        permissions: string[];
        expires_at?: string;
      };
      session?: {
        id: string;
        ip_address: string;
        expires_at: Date;
      };
    }
  }
}

/**
 * Middleware SSO universal para todos os sistemas TOIT
 */
export const ssoMiddleware = (systemCode: string, options: { 
  requireAuth?: boolean;
  requirePermission?: string;
} = {}) => {
  const { requireAuth = true, requirePermission } = options;
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const authService = new AuthService();
    let token: string | null = null;
    
    // 1. Buscar token de múltiplas fontes
    
    // Header Authorization (APIs)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Cookie (navegador)
    if (!token && req.cookies && req.cookies['toit_access_token']) {
      token = req.cookies['toit_access_token'];
    }
    
    // Query parameter (redirect SSO)
    if (!token && req.query.token) {
      token = req.query.token as string;
      
      // Se veio por query, salvar em cookie e redirecionar limpo
      if (token && req.method === 'GET') {
        res.cookie('toit_access_token', token, {
          httpOnly: false,  // Precisa ser acessível pelo JS
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 8 * 60 * 60 * 1000 // 8 horas
        });
        
        // Redirect sem token na URL
        const cleanUrl = req.originalUrl.split('?token=')[0];
        return res.redirect(cleanUrl);
      }
    }
    
    // 2. Se não tem token e não requer auth, continuar
    if (!token && !requireAuth) {
      return next();
    }
    
    // 3. Se não tem token mas requer auth, retornar erro ou redirecionar
    if (!token && requireAuth) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'NO_TOKEN'
        });
      } else {
        // Redirecionar para login com returnUrl
        const returnUrl = encodeURIComponent(req.originalUrl);
        return res.redirect(`/login?returnUrl=${returnUrl}`);
      }
    }
    
    // 4. Validar token
    let payload: ToitJWTPayload | null = null;
    try {
      payload = await authService.validateToken(token);
    } catch (error) {
      console.error('Token validation error:', error);
    }
    
    if (!payload) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ 
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        });
      } else {
        // Limpar cookie inválido e redirecionar
        res.clearCookie('toit_access_token');
        return res.redirect('/login');
      }
    }
    
    // 5. Verificar acesso ao sistema
    const systemAccess = payload.systems[systemCode];
    if (!systemAccess) {
      return res.status(403).json({ 
        error: `No access to system: ${systemCode}`,
        code: 'NO_SYSTEM_ACCESS',
        available_systems: Object.keys(payload.systems)
      });
    }
    
    // 6. Verificar permissão específica se requerida
    if (requirePermission) {
      const hasPermission = authService.hasPermission(payload, systemCode, requirePermission);
      if (!hasPermission) {
        return res.status(403).json({ 
          error: `Missing permission: ${requirePermission}`,
          code: 'INSUFFICIENT_PERMISSIONS',
          required_permission: requirePermission,
          user_permissions: systemAccess.permissions
        });
      }
    }
    
    // 7. Adicionar contexto ao request
    req.user = {
      id: payload.user_id,
      name: payload.name,
      email: payload.email,
      cpf: payload.cpf,
      role: systemAccess.role,
      permissions: systemAccess.permissions
    };
    
    req.tenant = payload.tenant;
    
    req.system = systemAccess;
    
    req.session = {
      id: payload.session_id,
      ip_address: payload.ip_address,
      expires_at: new Date(payload.exp * 1000)
    };
    
    next();
  };
};

/**
 * Middleware para resolver tenant por subdomain/path
 */
export const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  let tenantSlug: string | undefined;
  
  // Estratégia 1: Subdomain (blueworld.toit.com)
  const host = req.get('host');
  if (host) {
    const subdomain = host.split('.')[0];
    if (subdomain && !['www', 'app', 'api', 'admin'].includes(subdomain)) {
      tenantSlug = subdomain;
    }
  }
  
  // Estratégia 2: Path-based (/tenant/blueworld)
  if (!tenantSlug && req.path.startsWith('/tenant/')) {
    tenantSlug = req.path.split('/')[2];
  }
  
  // Estratégia 3: Header (para desenvolvimento/API)
  if (!tenantSlug) {
    tenantSlug = req.headers['x-tenant-slug'] as string;
  }
  
  // Para desenvolvimento, usar default
  if (!tenantSlug && process.env.NODE_ENV === 'development') {
    tenantSlug = 'blueworld';
  }
  
  if (!tenantSlug) {
    return res.status(400).json({ 
      error: 'Tenant not specified',
      code: 'NO_TENANT'
    });
  }
  
  // Adicionar ao request para uso posterior
  req.headers['x-tenant-slug'] = tenantSlug;
  next();
};

/**
 * Middleware específico para Portal TOIT
 */
export const portalAuth = ssoMiddleware('portal');

/**
 * Middleware específico para OMS
 */
export const omsAuth = ssoMiddleware('oms');

/**
 * Middleware específico para Trad.ia
 */
export const tradiaAuth = ssoMiddleware('tradia');

/**
 * Middleware para APIs que não requerem auth (opcional)
 */
export const optionalAuth = ssoMiddleware('portal', { requireAuth: false });

/**
 * Middleware com permissão específica
 */
export const requirePermission = (system: string, permission: string) => 
  ssoMiddleware(system, { requirePermission: permission });