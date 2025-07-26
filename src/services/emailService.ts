import nodemailer from 'nodemailer';
import { Lead } from '../types/lead';
import { Contact } from '../types/contact';

export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        // Configurar transporter (usar variáveis de ambiente em produção)
        this.transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    async sendLeadNotification(lead: Lead): Promise<void> {
        try {
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #0099ff;">🚀 Novo Lead - TOIT Site</h2>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>Informações do Lead:</h3>
                        <p><strong>Nome:</strong> ${lead.name}</p>
                        <p><strong>Email:</strong> ${lead.email}</p>
                        <p><strong>Empresa:</strong> ${lead.company || 'Não informado'}</p>
                        <p><strong>Telefone:</strong> ${lead.phone || 'Não informado'}</p>
                        <p><strong>Origem:</strong> ${lead.source}</p>
                        <p><strong>Produtos de Interesse:</strong> ${lead.interestedProducts?.join(', ') || 'Não especificado'}</p>
                    </div>
                    
                    ${lead.message ? `
                        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h4>Mensagem:</h4>
                            <p>${lead.message}</p>
                        </div>
                    ` : ''}
                    
                    <div style="background: #f1f3f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h4>Detalhes Técnicos:</h4>
                        <p><strong>IP:</strong> ${lead.ipAddress}</p>
                        <p><strong>Data/Hora:</strong> ${lead.timestamp.toLocaleString('pt-BR')}</p>
                        <p><strong>User Agent:</strong> ${lead.userAgent}</p>
                    </div>
                </div>
            `;

            await this.transporter.sendMail({
                from: `"TOIT Site" <${process.env.SMTP_USER}>`,
                to: 'toit@comercial.toit.com.br',
                subject: `🚀 Novo Lead: ${lead.name} - ${lead.company || 'Site Institucional'}`,
                html: htmlContent
            });

            console.log('✅ Email de notificação de lead enviado');

        } catch (error) {
            console.error('❌ Erro ao enviar email de notificação:', error);
            // Não falhar o processo por erro de email
        }
    }

    async sendContactNotification(contact: Contact): Promise<void> {
        try {
            const urgencyEmoji = {
                'critica': '🚨',
                'alta': '⚡',
                'media': '📝',
                'baixa': '📋'
            };

            const categoryEmoji = {
                'suporte': '🛠️',
                'comercial': '💼',
                'parceria': '🤝',
                'imprensa': '📰',
                'outros': '💬'
            };

            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #0099ff;">
                        ${urgencyEmoji[contact.urgency as keyof typeof urgencyEmoji]} 
                        Nova Mensagem de Contato - TOIT
                    </h2>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>
                            ${categoryEmoji[contact.category as keyof typeof categoryEmoji]} 
                            ${contact.category.toUpperCase()}
                        </h3>
                        <p><strong>Nome:</strong> ${contact.name}</p>
                        <p><strong>Email:</strong> ${contact.email}</p>
                        <p><strong>Empresa:</strong> ${contact.company || 'Não informado'}</p>
                        <p><strong>Telefone:</strong> ${contact.phone || 'Não informado'}</p>
                        <p><strong>Urgência:</strong> ${contact.urgency.toUpperCase()}</p>
                    </div>
                    
                    <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h4>Assunto:</h4>
                        <p style="font-size: 16px; font-weight: bold;">${contact.subject}</p>
                    </div>
                    
                    <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h4>Mensagem:</h4>
                        <p style="white-space: pre-wrap; line-height: 1.6;">${contact.message}</p>
                    </div>
                    
                    <div style="background: #f1f3f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Data/Hora:</strong> ${contact.timestamp.toLocaleString('pt-BR')}</p>
                        <p><strong>IP:</strong> ${contact.ipAddress}</p>
                    </div>
                </div>
            `;

            const targetEmail = this.getContactEmail(contact.category);

            await this.transporter.sendMail({
                from: `"TOIT Site" <${process.env.SMTP_USER}>`,
                to: targetEmail,
                subject: `${urgencyEmoji[contact.urgency as keyof typeof urgencyEmoji]} [${contact.category.toUpperCase()}] ${contact.subject}`,
                html: htmlContent,
                replyTo: contact.email
            });

            console.log(`✅ Email de contato enviado para ${targetEmail}`);

        } catch (error) {
            console.error('❌ Erro ao enviar email de contato:', error);
        }
    }

    async sendContactConfirmation(contact: Contact): Promise<void> {
        try {
            const responseTime = this.getResponseTime(contact.urgency);
            
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #00ff88;">✅ Mensagem Recebida - TOIT</h2>
                    
                    <p>Olá <strong>${contact.name}</strong>,</p>
                    
                    <p>Recebemos sua mensagem e agradecemos o contato! Nossa equipe analisará sua solicitação e retornará em breve.</p>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>Resumo da sua mensagem:</h3>
                        <p><strong>Assunto:</strong> ${contact.subject}</p>
                        <p><strong>Categoria:</strong> ${contact.category}</p>
                        <p><strong>Urgência:</strong> ${contact.urgency}</p>
                        <p><strong>Tempo estimado de resposta:</strong> ${responseTime}</p>
                    </div>
                    
                    <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h4>Canais de Contato Direto:</h4>
                        <p>📧 <strong>Comercial:</strong> toit@comercial.toit.com.br</p>
                        <p>🛠️ <strong>Suporte:</strong> toit@suporte.toit.com.br</p>
                        <p>🌐 <strong>Portal:</strong> <a href="https://portal.toit.com.br">portal.toit.com.br</a></p>
                    </div>
                    
                    <p>Atenciosamente,<br>
                    <strong>Equipe TOIT - The One in Tech</strong></p>
                </div>
            `;

            await this.transporter.sendMail({
                from: `"TOIT - The One in Tech" <${process.env.SMTP_USER}>`,
                to: contact.email,
                subject: '✅ Mensagem Recebida - TOIT',
                html: htmlContent
            });

            console.log('✅ Email de confirmação enviado ao cliente');

        } catch (error) {
            console.error('❌ Erro ao enviar confirmação:', error);
        }
    }

    async sendNewsletterWelcome(subscription: any): Promise<void> {
        try {
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #0099ff;">🚀 Bem-vindo ao Futuro Tecnológico!</h2>
                    
                    <p>Olá <strong>${subscription.name}</strong>,</p>
                    
                    <p>Você acaba de embarcar em uma jornada dimensional conosco! 🌌</p>
                    
                    <div style="background: linear-gradient(135deg, #0099ff, #00ff88); padding: 30px; border-radius: 12px; margin: 30px 0; color: white; text-align: center;">
                        <h3 style="margin: 0;">◆ TOIT - THE ONE IN TECH ◆</h3>
                        <p style="margin: 10px 0 0 0;">Portal Dimensional Tecnológico</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>O que você receberá:</h3>
                        <ul>
                            <li>🔥 Novidades sobre nossos produtos revolucionários</li>
                            <li>💡 Insights tecnológicos e tendências do futuro</li>
                            <li>🎯 Cases de sucesso e transformações empresariais</li>
                            <li>⚡ Convites exclusivos para demos e eventos</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://portal.toit.com.br" style="background: linear-gradient(45deg, #0099ff, #00ff88); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                            🌐 Explorar Portal TOIT
                        </a>
                    </div>
                    
                    <p>Prepare-se para descobrir dimensões tecnológicas que você nem sabia que existiam!</p>
                    
                    <p>Tecnologicamente,<br>
                    <strong>Equipe TOIT</strong></p>
                </div>
            `;

            await this.transporter.sendMail({
                from: `"TOIT - The One in Tech" <${process.env.SMTP_USER}>`,
                to: subscription.email,
                subject: '🚀 Bem-vindo ao Portal Dimensional TOIT!',
                html: htmlContent
            });

            console.log('✅ Email de boas-vindas newsletter enviado');

        } catch (error) {
            console.error('❌ Erro ao enviar boas-vindas newsletter:', error);
        }
    }

    async sendDemoRequest(demo: any): Promise<void> {
        try {
            const productEmojis = {
                'portal': '🌐',
                'oms': '📊',
                'tradia': '📈',
                'easis': '👁️',
                'gisst': '🧠',
                'artic': '❄️'
            };

            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #0099ff;">
                        🎯 Nova Solicitação de Demo - ${productEmojis[demo.product as keyof typeof productEmojis]} ${demo.product.toUpperCase()}
                    </h2>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>Informações do Cliente:</h3>
                        <p><strong>Nome:</strong> ${demo.name}</p>
                        <p><strong>Email:</strong> ${demo.email}</p>
                        <p><strong>Empresa:</strong> ${demo.company}</p>
                        <p><strong>Telefone:</strong> ${demo.phone}</p>
                        <p><strong>Tamanho:</strong> ${demo.companySize || 'Não informado'} funcionários</p>
                    </div>
                    
                    <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>Detalhes da Demo:</h3>
                        <p><strong>Produto:</strong> ${demo.product.toUpperCase()}</p>
                        <p><strong>Data Preferida:</strong> ${demo.preferredDate || 'Flexível'}</p>
                        <p><strong>Horário Preferido:</strong> ${demo.preferredTime || 'Flexível'}</p>
                    </div>
                    
                    ${demo.message ? `
                        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h4>Mensagem Adicional:</h4>
                            <p>${demo.message}</p>
                        </div>
                    ` : ''}
                    
                    <div style="background: #f1f3f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Data/Hora:</strong> ${demo.timestamp.toLocaleString('pt-BR')}</p>
                        <p><strong>IP:</strong> ${demo.ipAddress}</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <p><strong>⚡ AÇÃO NECESSÁRIA: Entrar em contato para agendar a demonstração!</strong></p>
                    </div>
                </div>
            `;

            await this.transporter.sendMail({
                from: `"TOIT Site" <${process.env.SMTP_USER}>`,
                to: 'toit@comercial.toit.com.br',
                subject: `🎯 Demo ${demo.product.toUpperCase()} - ${demo.company} (${demo.name})`,
                html: htmlContent,
                replyTo: demo.email
            });

            console.log('✅ Email de solicitação de demo enviado');

        } catch (error) {
            console.error('❌ Erro ao enviar solicitação de demo:', error);
        }
    }

    async sendDemoConfirmation(demo: any): Promise<void> {
        try {
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #00ff88;">🎯 Solicitação de Demo Recebida!</h2>
                    
                    <p>Olá <strong>${demo.name}</strong>,</p>
                    
                    <p>Recebemos sua solicitação de demonstração do <strong>${demo.product.toUpperCase()}</strong> e estamos muito animados para mostrar como nossa tecnologia pode transformar a ${demo.company}! 🚀</p>
                    
                    <div style="background: linear-gradient(135deg, #0099ff, #00ff88); padding: 20px; border-radius: 8px; margin: 20px 0; color: white;">
                        <h3 style="margin: 0 0 10px 0;">◆ Próximos Passos:</h3>
                        <ul style="margin: 0; padding-left: 20px;">
                            <li>Nossa equipe comercial entrará em contato em até 4 horas</li>
                            <li>Agendaremos a demo conforme sua disponibilidade</li>
                            <li>Prepararemos uma apresentação personalizada para sua empresa</li>
                        </ul>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>Resumo da Solicitação:</h3>
                        <p><strong>Produto:</strong> ${demo.product.toUpperCase()}</p>
                        <p><strong>Data Preferida:</strong> ${demo.preferredDate || 'A combinar'}</p>
                        <p><strong>Horário:</strong> ${demo.preferredTime || 'A combinar'}</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <p><strong>Dúvidas? Entre em contato:</strong></p>
                        <p>📧 toit@comercial.toit.com.br</p>
                        <p>🌐 <a href="https://portal.toit.com.br">portal.toit.com.br</a></p>
                    </div>
                    
                    <p>Prepare-se para descobrir uma nova dimensão tecnológica!</p>
                    
                    <p>Atenciosamente,<br>
                    <strong>Equipe Comercial TOIT</strong></p>
                </div>
            `;

            await this.transporter.sendMail({
                from: `"TOIT Comercial" <${process.env.SMTP_USER}>`,
                to: demo.email,
                subject: `🎯 Demo ${demo.product.toUpperCase()} - Solicitação Recebida!`,
                html: htmlContent
            });

            console.log('✅ Email de confirmação de demo enviado');

        } catch (error) {
            console.error('❌ Erro ao enviar confirmação de demo:', error);
        }
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

    private getResponseTime(urgency: string): string {
        const responseTimes = {
            'critica': '1-4 horas',
            'alta': '4-24 horas',
            'media': '24-48 horas',
            'baixa': '48-72 horas'
        };
        
        return responseTimes[urgency as keyof typeof responseTimes] || '24-48 horas';
    }
}