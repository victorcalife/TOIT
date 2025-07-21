import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { createError } from '../middleware/errorHandler';
import { LoginCredentials } from '../types/auth';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cpf, email, password, tenant_slug } = req.body;
    const ip_address = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const user_agent = req.get('User-Agent') || 'Unknown';

    // Validate input
    if ((!cpf && !email) || !password) {
      return next(createError('Email/CPF and password are required', 400));
    }

    // Resolve tenant slug
    const resolvedTenantSlug = tenant_slug || 
                              req.headers['x-tenant-slug'] as string || 
                              'blueworld'; // Default para desenvolvimento

    const credentials: LoginCredentials = {
      ...(email && { email }),
      ...(cpf && { cpf }),
      password,
      tenant_slug: resolvedTenantSlug,
      ip_address,
      user_agent
    };

    const authService = new AuthService();
    const authResponse = await authService.login(credentials);

    // Set HTTP-only cookie para refresh token
    res.cookie('toit_refresh_token', authResponse.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias
    });

    // Set cookie para access token (acessível ao JS para APIs)
    res.cookie('toit_access_token', authResponse.access_token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: authResponse.expires_in * 1000
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token: authResponse.access_token,
        user: authResponse.user,
        systems: authResponse.systems,
        expires_in: authResponse.expires_in,
        redirectUrl: getRedirectUrl(authResponse.systems)
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return next(createError(error.message || 'Login failed', 401));
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies['toit_access_token'] || 
                  (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') 
                    ? req.headers.authorization.substring(7) 
                    : null);

    if (token) {
      const authService = new AuthService();
      await authService.logout(token);
    }

    // Clear cookies
    res.clearCookie('toit_access_token');
    res.clearCookie('toit_refresh_token');

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    next(error);
  }
};

export const verify = (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Token is valid',
    user: req.user,
    tenant: req.tenant,
    systems: req.system ? [req.system] : [],
    session: req.session
  });
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies['toit_refresh_token'];
    
    if (!refreshToken) {
      return next(createError('Refresh token not found', 401));
    }

    const authService = new AuthService();
    const authResponse = await authService.refreshToken(refreshToken);

    // Update cookies
    res.cookie('toit_refresh_token', authResponse.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.cookie('toit_access_token', authResponse.access_token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: authResponse.expires_in * 1000
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed',
      data: {
        token: authResponse.access_token,
        user: authResponse.user,
        systems: authResponse.systems,
        expires_in: authResponse.expires_in
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    return next(createError('Token refresh failed', 401));
  }
};

// Helper function for redirect URL based on available systems
const getRedirectUrl = (systems: string[]): string => {
  // Se tem acesso ao OMS, direcionar para lá
  if (systems.includes('oms')) {
    return '/portal/blueworld';
  }
  
  // Se tem acesso ao Tradia
  if (systems.includes('tradia')) {
    return '/portal/tradia';
  }
  
  // Se tem acesso ao Easis
  if (systems.includes('easis')) {
    return '/portal/easis';
  }
  
  // Default para portal
  return '/portal';
};

// Endpoint para buscar dados do usuário logado (usado pelo frontend)
export const me = (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
      tenant: req.tenant,
      systems: req.system ? [req.system] : [],
      session: req.session
    }
  });
};