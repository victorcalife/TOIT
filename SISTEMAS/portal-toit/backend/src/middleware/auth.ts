import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    cpf: string;
    perfil: string;
    clienteKey?: string;
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return next(createError('Access token required', 401));
  }

  try {
    const secret = process.env.JWT_SECRET || 'toit-secret-key';
    const decoded = jwt.verify(token, secret) as any;
    
    req.user = {
      id: decoded.id,
      cpf: decoded.cpf,
      perfil: decoded.perfil,
      clienteKey: decoded.clienteKey
    };
    
    next();
  } catch (error) {
    return next(createError('Invalid or expired token', 401));
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    if (!roles.includes(req.user.perfil)) {
      return next(createError('Insufficient permissions', 403));
    }

    next();
  };
};

// Specific role checks
export const requireAdmin = requireRole(['ADMIN', 'TOIT']);
export const requireClient = requireRole(['CLIENTE']);
export const requireAnyAuth = requireRole(['ADMIN', 'TOIT', 'CLIENTE']);