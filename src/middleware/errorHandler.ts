import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
    status?: number;
    code?: string;
}

export const errorHandler = (
    error: ApiError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Log do erro
    console.error('🚨 Erro na API:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    // Determinar status code
    const statusCode = error.status || 500;

    // Determinar mensagem baseada no ambiente
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    let message = error.message;
    let details: any = undefined;

    // Erros específicos
    switch (error.code) {
        case 'VALIDATION_ERROR':
            message = 'Dados de entrada inválidos';
            break;
        
        case 'RATE_LIMIT_EXCEEDED':
            message = 'Muitas tentativas. Tente novamente mais tarde.';
            break;
        
        case 'EMAIL_SEND_FAILED':
            message = 'Falha ao enviar email. Tente novamente.';
            break;
        
        case 'DATABASE_ERROR':
            message = 'Erro interno do servidor';
            break;
        
        default:
            if (statusCode === 500) {
                message = 'Erro interno do servidor';
            }
    }

    // Incluir stack trace apenas em desenvolvimento
    if (isDevelopment && statusCode === 500) {
        details = {
            stack: error.stack,
            originalMessage: error.message
        };
    }

    // Response padronizada
    const errorResponse = {
        success: false,
        error: message,
        code: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        ...(details && { details })
    };

    res.status(statusCode).json(errorResponse);
};

// Handler para promises rejeitadas
export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Middleware para capturar erros de JSON malformado
export const jsonErrorHandler = (
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (error instanceof SyntaxError && 'body' in error) {
        return res.status(400).json({
            success: false,
            error: 'JSON inválido',
            code: 'INVALID_JSON',
            message: 'Verifique a formatação dos dados enviados'
        });
    }
    
    next(error);
};