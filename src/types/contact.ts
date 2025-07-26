export interface ContactData {
    name: string;
    email: string;
    subject: string;
    message: string;
    company?: string;
    phone?: string;
    category: 'suporte' | 'comercial' | 'parceria' | 'imprensa' | 'outros';
    urgency: 'baixa' | 'media' | 'alta' | 'critica';
    ipAddress: string;
    userAgent?: string;
    timestamp: Date;
}

export interface Contact extends ContactData {
    id: string;
    status: 'novo' | 'em_andamento' | 'aguardando_cliente' | 'resolvido' | 'fechado';
    assignedTo?: string;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;
}

export interface DemoRequest {
    id: string;
    name: string;
    email: string;
    company: string;
    phone: string;
    product: 'portal' | 'oms' | 'tradia' | 'easis' | 'gisst' | 'artic';
    companySize?: '1-10' | '11-50' | '51-200' | '201-500' | '500+';
    preferredDate?: string;
    preferredTime?: string;
    message?: string;
    status: 'agendamento_pendente' | 'agendado' | 'realizado' | 'cancelado';
    scheduledDate?: Date;
    assignedTo?: string;
    ipAddress: string;
    userAgent?: string;
    timestamp: Date;
    createdAt: Date;
    updatedAt: Date;
}