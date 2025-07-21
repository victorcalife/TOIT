// types/auth.ts
export interface ToitJWTPayload {
  // Identificação do usuário
  user_id: string;
  email: string;
  name: string;
  cpf?: string;
  
  // Contexto do tenant
  tenant: {
    id: string;
    slug: string;        // blueworld
    name: string;        // "Blue World Ltda"
    plan: string;        // BASIC, PREMIUM, ENTERPRISE
  };
  
  // Sistemas e permissões
  systems: {
    [systemCode: string]: {  // oms, tradia, easis, portal
      system_id: string;
      role: string;          // ADMIN, USER, MANAGER
      permissions: string[]; // ['tickets.read', 'orders.create']
      expires_at?: string;   // Para trials
    };
  };
  
  // Metadados do token
  iat: number;    // Issued at
  exp: number;    // Expires at (8 horas)
  iss: string;    // "toit-auth"
  sub: string;    // user_id
  jti: string;    // JWT ID para revogação
  
  // Session info
  session_id: string;
  ip_address: string;
  user_agent: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  plan: 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  created_at: Date;
  updated_at: Date;
  settings: any;
  branding: any;
  limits: any;
}

export interface ToitSystem {
  id: string;
  code: string;
  name: string;
  description: string;
  version: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface UserRole {
  id: string;
  user_id: string;
  tenant_id: string;
  system_id: string;
  role: string;
  permissions: string[];
  created_at: Date;
  expires_at?: Date;
}

export interface LoginCredentials {
  email?: string;
  cpf?: string;
  password: string;
  tenant_slug: string;
  ip_address: string;
  user_agent: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    name: string;
    email: string;
    tenant: string;
  };
  systems: string[];
}

export interface SessionData {
  user_id: string;
  tenant_id: string;
  created_at: Date;
  ip_address: string;
  user_agent: string;
  last_activity?: Date;
}