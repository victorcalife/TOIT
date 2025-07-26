export interface LeadData {
    name: string;
    email: string;
    company?: string;
    phone?: string;
    message?: string;
    source: 'website' | 'portal' | 'social' | 'referral' | 'ads';
    interestedProducts?: ('portal' | 'oms' | 'tradia' | 'easis' | 'gisst' | 'artic')[];
    ipAddress: string;
    userAgent?: string;
    timestamp: Date;
}

export interface Lead extends LeadData {
    id: string;
    status: 'novo' | 'contatado' | 'qualificado' | 'convertido' | 'perdido';
    createdAt: Date;
    updatedAt: Date;
}

export interface NewsletterSubscription {
    id: string;
    email: string;
    name: string;
    source: string;
    status: 'ativo' | 'inativo' | 'cancelado';
    subscribedAt: Date;
    ipAddress: string;
    userAgent?: string;
}