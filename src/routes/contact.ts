import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { ContactService } from '../services/contactService';
import { ContactData } from '../types/contact';

// Validação simples
const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    return phoneRegex.test(phone);
};

const router = Router();
const contactService = new ContactService();

// Validação manual para contato
const validateContactData = (data: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!data.name || data.name.length < 2 || data.name.length > 100) {
        errors.push('Nome deve ter entre 2 e 100 caracteres');
    }
    
    if (!data.email || !validateEmail(data.email)) {
        errors.push('Email inválido');
    }
    
    if (!data.subject || data.subject.length < 5 || data.subject.length > 200) {
        errors.push('Assunto deve ter entre 5 e 200 caracteres');
    }
    
    if (!data.message || data.message.length < 10 || data.message.length > 2000) {
        errors.push('Mensagem deve ter entre 10 e 2000 caracteres');
    }
    
    if (data.phone && !validatePhone(data.phone)) {
        errors.push('Telefone inválido');
    }
    
    const validCategories = ['suporte', 'comercial', 'parceria', 'imprensa', 'outros'];
    if (data.category && !validCategories.includes(data.category)) {
        errors.push('Categoria inválida');
    }
    
    const validUrgencies = ['baixa', 'media', 'alta', 'critica'];
    if (data.urgency && !validUrgencies.includes(data.urgency)) {
        errors.push('Urgência inválida');
    }
    
    return { isValid: errors.length === 0, errors };
};

// POST /api/contact - Enviar mensagem de contato
router.post('/', async (req, res) => {
    try {
        // Verificar validações
        const validation = validateContactData(req.body);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Dados inválidos',
                details: validation.errors
            });
        }

        const contactData: ContactData = {
            name: req.body.name,
            email: req.body.email,
            subject: req.body.subject,
            message: req.body.message,
            company: req.body.company,
            phone: req.body.phone,
            category: req.body.category || 'outros',
            urgency: req.body.urgency || 'media',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date()
        };

        const result = await contactService.sendContact(contactData);
        
        res.status(201).json({
            success: true,
            message: 'Mensagem enviada com sucesso',
            data: {
                id: result.id,
                status: result.status,
                estimatedResponse: result.estimatedResponse
            }
        });

    } catch (error) {
        console.error('Erro ao enviar contato:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: 'Não foi possível enviar sua mensagem'
        });
    }
});

// POST /api/contact/demo - Solicitar demonstração
router.post('/demo', [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nome obrigatório'),
    
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    
    body('company')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nome da empresa obrigatório'),
    
    body('phone')
        .isMobilePhone('pt-BR')
        .withMessage('Telefone obrigatório'),
    
    body('product')
        .isIn(['portal', 'oms', 'tradia', 'easis', 'gisst', 'artic'])
        .withMessage('Produto inválido'),
    
    body('companySize')
        .optional()
        .isIn(['1-10', '11-50', '51-200', '201-500', '500+'])
        .withMessage('Tamanho da empresa inválido'),
    
    body('preferredDate')
        .optional()
        .isISO8601()
        .withMessage('Data inválida'),
    
    body('preferredTime')
        .optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Horário inválido (formato HH:MM)')
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

        const demoData = {
            name: req.body.name,
            email: req.body.email,
            company: req.body.company,
            phone: req.body.phone,
            product: req.body.product,
            companySize: req.body.companySize,
            preferredDate: req.body.preferredDate,
            preferredTime: req.body.preferredTime,
            message: req.body.message || '',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date()
        };

        const result = await contactService.requestDemo(demoData);
        
        res.status(201).json({
            success: true,
            message: 'Solicitação de demonstração enviada com sucesso',
            data: {
                id: result.id,
                status: result.status,
                scheduledDate: result.scheduledDate
            }
        });

    } catch (error) {
        console.error('Erro ao solicitar demo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/contact/categories - Listar categorias disponíveis
router.get('/categories', (req, res) => {
    res.json({
        success: true,
        data: {
            categories: [
                { value: 'suporte', label: 'Suporte Técnico', email: 'toit@suporte.toit.com.br' },
                { value: 'comercial', label: 'Comercial/Vendas', email: 'toit@comercial.toit.com.br' },
                { value: 'parceria', label: 'Parcerias', email: 'toit@comercial.toit.com.br' },
                { value: 'imprensa', label: 'Imprensa', email: 'toit@comercial.toit.com.br' },
                { value: 'outros', label: 'Outros Assuntos', email: 'toit@comercial.toit.com.br' }
            ],
            urgencyLevels: [
                { value: 'baixa', label: 'Baixa', responseTime: '48-72h' },
                { value: 'media', label: 'Média', responseTime: '24-48h' },
                { value: 'alta', label: 'Alta', responseTime: '4-24h' },
                { value: 'critica', label: 'Crítica', responseTime: '1-4h' }
            ]
        }
    });
});

export { router as contactRoutes };