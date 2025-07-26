import { v4 as uuidv4 } from 'uuid';
import { LeadData, Lead } from '../types/lead';
import { EmailService } from './emailService';

export class LeadService {
    private emailService: EmailService;
    
    constructor() {
        this.emailService = new EmailService();
    }

    async createLead(leadData: LeadData): Promise<{ id: string; status: string }> {
        try {
            const lead: Lead = {
                id: uuidv4(),
                ...leadData,
                status: 'novo',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Aqui você integraria com banco de dados
            // Por enquanto, vamos simular e enviar por email
            
            // Enviar notificação por email
            await this.emailService.sendLeadNotification(lead);
            
            // Log para desenvolvimento
            console.log('📝 Novo lead criado:', {
                id: lead.id,
                name: lead.name,
                email: lead.email,
                company: lead.company,
                source: lead.source,
                products: lead.interestedProducts
            });

            return {
                id: lead.id,
                status: 'processado'
            };

        } catch (error) {
            console.error('Erro ao criar lead:', error);
            throw new Error('Falha ao processar lead');
        }
    }

    async subscribeNewsletter(data: any): Promise<{ email: string; status: string }> {
        try {
            const subscription = {
                id: uuidv4(),
                email: data.email,
                name: data.name,
                source: 'newsletter',
                subscribedAt: new Date(),
                status: 'ativo'
            };

            // Enviar email de boas-vindas
            await this.emailService.sendNewsletterWelcome(subscription);
            
            console.log('📧 Nova inscrição newsletter:', {
                email: subscription.email,
                name: subscription.name
            });

            return {
                email: subscription.email,
                status: 'inscrito'
            };

        } catch (error) {
            console.error('Erro ao inscrever newsletter:', error);
            throw new Error('Falha ao processar inscrição');
        }
    }

    async getLeadStats(): Promise<any> {
        try {
            // Estatísticas simuladas - integrar com banco depois
            return {
                total: 247,
                thisMonth: 23,
                conversion: 18.5,
                topSources: [
                    { source: 'website', count: 156, percentage: 63.2 },
                    { source: 'social', count: 45, percentage: 18.2 },
                    { source: 'referral', count: 28, percentage: 11.3 },
                    { source: 'ads', count: 18, percentage: 7.3 }
                ],
                topProducts: [
                    { product: 'Portal TOIT', interest: 89, percentage: 36.0 },
                    { product: 'OMS Blue World', interest: 67, percentage: 27.1 },
                    { product: 'Trad.IA', interest: 45, percentage: 18.2 },
                    { product: 'EASIS ERP', interest: 32, percentage: 13.0 },
                    { product: 'GISST', interest: 14, percentage: 5.7 }
                ],
                recentActivity: [
                    {
                        date: new Date(),
                        action: 'new_lead',
                        details: 'Lead interessado em Portal TOIT'
                    },
                    {
                        date: new Date(Date.now() - 3600000),
                        action: 'newsletter_signup',
                        details: 'Nova inscrição newsletter'
                    }
                ]
            };
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            throw new Error('Falha ao buscar estatísticas');
        }
    }
}