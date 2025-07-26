import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { LeadService } from '../services/leadService';
import { LeadData } from '../types/lead';

// Validação simples sem express-validator (para simplificar)
const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    return phoneRegex.test(phone);
};

const router = Router();
const leadService = new LeadService();

// Validação manual simplificada
const validateLeadData = (data: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!data.name || data.name.length < 2 || data.name.length > 100) {
        errors.push('Nome deve ter entre 2 e 100 caracteres');
    }
    
    if (!data.email || !validateEmail(data.email)) {
        errors.push('Email inválido');
    }
    
    if (data.phone && !validatePhone(data.phone)) {
        errors.push('Telefone inválido');
    }
    
    if (data.message && data.message.length > 1000) {
        errors.push('Mensagem deve ter no máximo 1000 caracteres');
    }
    
    const validSources = ['website', 'portal', 'social', 'referral', 'ads'];
    if (data.source && !validSources.includes(data.source)) {
        errors.push('Source inválido');
    }
    
    const validProducts = ['portal', 'oms', 'tradia', 'easis', 'gisst', 'artic'];
    if (data.interestedProducts && Array.isArray(data.interestedProducts)) {
        const invalidProducts = data.interestedProducts.filter((p: string) => !validProducts.includes(p));
        if (invalidProducts.length > 0) {
            errors.push(`Produtos inválidos: ${invalidProducts.join(', ')}`);
        }
    }
    
    return { isValid: errors.length === 0, errors };
};

// POST /api/leads - Criar novo lead
router.post('/', async (req, res) => {
    try {
        // Verificar validações
        const validation = validateLeadData(req.body);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Dados inválidos',
                details: validation.errors
            });
        }

        const leadData: LeadData = {
            name: req.body.name,
            email: req.body.email,
            company: req.body.company,
            phone: req.body.phone,
            message: req.body.message,
            source: req.body.source || 'website',
            interestedProducts: req.body.interestedProducts || [],
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date()
        };

        const result = await leadService.createLead(leadData);
        
        res.status(201).json({
            success: true,
            message: 'Lead criado com sucesso',
            data: {
                id: result.id,
                status: result.status
            }
        });

    } catch (error) {
        console.error('Erro ao criar lead:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: 'Não foi possível processar sua solicitação'
        });
    }
});

// GET /api/leads/stats - Estatísticas de leads (apenas para admin)
router.get('/stats', async (req, res) => {
    try {
        const stats = await leadService.getLeadStats();
        
        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar estatísticas'
        });
    }
});

// POST /api/leads/newsletter - Inscrição newsletter
router.post('/newsletter', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nome deve ter entre 2 e 100 caracteres')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Dados inválidos',
                details: errors.array()
            });
        }

        const newsletterData = {
            email: req.body.email,
            name: req.body.name || 'Assinante',
            source: 'newsletter',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date()
        };

        const result = await leadService.subscribeNewsletter(newsletterData);
        
        res.status(201).json({
            success: true,
            message: 'Inscrição realizada com sucesso',
            data: {
                email: result.email,
                status: result.status
            }
        });

    } catch (error) {
        console.error('Erro ao inscrever newsletter:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

export { router as leadRoutes };