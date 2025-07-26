import { v4 as uuidv4 } from 'uuid';
import { ContactData, Contact } from '../types/contact';
import { EmailService } from './emailService';

export class ContactService {
    private emailService: EmailService;
    
    constructor() {
        this.emailService = new EmailService();
    }

    async sendContact(contactData: ContactData): Promise<{ id: string; status: string; estimatedResponse: string }> {
        try {
            const contact: Contact = {
                id: uuidv4(),
                ...contactData,
                status: 'novo',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Definir tempo de resposta baseado na urgência
            const responseTime = this.getResponseTime(contact.urgency);
            
            // Enviar notificação por email para equipe
            await this.emailService.sendContactNotification(contact);
            
            // Enviar confirmação para cliente
            await this.emailService.sendContactConfirmation(contact);

            console.log('📞 Nova mensagem de contato:', {
                id: contact.id,
                name: contact.name,
                email: contact.email,
                category: contact.category,
                urgency: contact.urgency,
                subject: contact.subject
            });

            return {
                id: contact.id,
                status: 'recebido',
                estimatedResponse: responseTime
            };

        } catch (error) {
            console.error('Erro ao processar contato:', error);
            throw new Error('Falha ao enviar mensagem');
        }
    }

    async requestDemo(demoData: any): Promise<{ id: string; status: string; scheduledDate?: string }> {
        try {
            const demo = {
                id: uuidv4(),
                ...demoData,
                type: 'demo_request',
                status: 'agendamento_pendente',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Processar data preferida
            let scheduledDate;
            if (demo.preferredDate && demo.preferredTime) {
                scheduledDate = `${demo.preferredDate} às ${demo.preferredTime}`;
            }

            // Enviar notificação para equipe comercial
            await this.emailService.sendDemoRequest(demo);
            
            // Enviar confirmação para cliente
            await this.emailService.sendDemoConfirmation(demo);

            console.log('🎯 Nova solicitação de demo:', {
                id: demo.id,
                name: demo.name,
                company: demo.company,
                product: demo.product,
                preferredDate: demo.preferredDate,
                preferredTime: demo.preferredTime
            });

            return {
                id: demo.id,
                status: 'agendamento_iniciado',
                scheduledDate
            };

        } catch (error) {
            console.error('Erro ao processar demo:', error);
            throw new Error('Falha ao solicitar demonstração');
        }
    }

    private getResponseTime(urgency: string): string {
        const responseTimes = {
            'critica': '1-4 horas',
            'alta': '4-24 horas',
            'media': '24-48 horas',
            'baixa': '48-72 horas'
        };
        
        return responseTimes[urgency as keyof typeof responseTimes] || '24-48 horas';
    }

    private getContactEmail(category: string): string {
        const emails = {
            'suporte': 'toit@suporte.toit.com.br',
            'comercial': 'toit@comercial.toit.com.br',
            'parceria': 'toit@comercial.toit.com.br',
            'imprensa': 'toit@comercial.toit.com.br',
            'outros': 'toit@comercial.toit.com.br'
        };
        
        return emails[category as keyof typeof emails] || 'toit@comercial.toit.com.br';
    }
}