// services/authService.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  ToitJWTPayload,
  LoginCredentials,
  AuthResponse,
  SessionData,
  Tenant,
  ToitSystem,
  UserRole
} from '../types/auth';

export class AuthService {
  private redis: Redis;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.jwtSecret = process.env.JWT_SECRET || 'toit-jwt-secret-key';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'toit-refresh-secret-key';
  }

  /**
   * Login principal do SSO
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, cpf, password, tenant_slug, ip_address, user_agent } = credentials;
    
    // 1. Encontrar tenant
    const tenant = await this.findTenantBySlug(tenant_slug);
    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new Error('Tenant not found or inactive');
    }
    
    // 2. Encontrar usuário
    const user = await this.findUser({
      tenant_id: tenant.id,
      ...(email && { email }),
      ...(cpf && { cpf }),
      status: 'ACTIVE'
    });
    
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      throw new Error('Invalid credentials');
    }
    
    // 3. Buscar sistemas e permissões do usuário
    const userSystems = await this.getUserSystems(user.id, tenant.id);
    
    // 4. Criar session no Redis
    const sessionId = uuidv4();
    const sessionData: SessionData = {
      user_id: user.id,
      tenant_id: tenant.id,
      created_at: new Date(),
      ip_address,
      user_agent,
      last_activity: new Date()
    };
    
    await this.redis.setex(
      `session:${sessionId}`,
      8 * 60 * 60, // 8 horas
      JSON.stringify(sessionData)
    );
    
    // 5. Gerar tokens JWT
    const jwtId = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 8 * 60 * 60; // 8 horas
    
    const jwtPayload: ToitJWTPayload = {
      user_id: user.id,
      email: user.email,
      name: user.name,
      cpf: user.cpf,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan
      },
      systems: userSystems,
      iat: now,
      exp: now + expiresIn,
      iss: 'toit-auth',
      sub: user.id,
      jti: jwtId,
      session_id: sessionId,
      ip_address,
      user_agent
    };
    
    const accessToken = jwt.sign(jwtPayload, this.jwtSecret);
    const refreshToken = jwt.sign(
      { 
        user_id: user.id, 
        session_id: sessionId,
        tenant_id: tenant.id
      },
      this.jwtRefreshSecret,
      { expiresIn: '30d' }
    );
    
    // 6. Salvar token para controle de revogação
    await this.redis.setex(
      `token:${jwtId}`,
      expiresIn,
      JSON.stringify({
        user_id: user.id,
        tenant_id: tenant.id,
        status: 'active',
        created_at: new Date()
      })
    );
    
    // 7. Auditoria
    await this.logActivity(user.id, tenant.id, 'LOGIN', {
      ip_address,
      user_agent,
      systems: Object.keys(userSystems)
    });
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenant: tenant.name
      },
      systems: Object.keys(userSystems)
    };
  }

  /**
   * Validar token JWT (usado por todos os sistemas)
   */
  async validateToken(token: string): Promise<ToitJWTPayload | null> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as ToitJWTPayload;
      
      // Verificar se token não foi revogado
      const tokenData = await this.redis.get(`token:${payload.jti}`);
      if (!tokenData) {
        return null;
      }
      
      const tokenInfo = JSON.parse(tokenData);
      if (tokenInfo.status !== 'active') {
        return null;
      }
      
      // Verificar se session ainda existe
      const sessionData = await this.redis.get(`session:${payload.session_id}`);
      if (!sessionData) {
        return null;
      }
      
      // Atualizar última atividade
      const session: SessionData = JSON.parse(sessionData);
      session.last_activity = new Date();
      await this.redis.setex(
        `session:${payload.session_id}`,
        8 * 60 * 60, // Renovar TTL
        JSON.stringify(session)
      );
      
      return payload;
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  /**
   * Logout (revoga token e session)
   */
  async logout(token: string): Promise<void> {
    const payload = await this.validateToken(token);
    if (payload) {
      // Revogar token
      await this.redis.del(`token:${payload.jti}`);
      
      // Revogar session
      await this.redis.del(`session:${payload.session_id}`);
      
      // Auditoria
      await this.logActivity(payload.user_id, payload.tenant.id, 'LOGOUT', {
        ip_address: payload.ip_address
      });
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;
      
      // Verificar se session ainda existe
      const sessionData = await this.redis.get(`session:${payload.session_id}`);
      if (!sessionData) {
        throw new Error('Session expired');
      }
      
      // Buscar dados atualizados do usuário
      const user = await this.findUserById(payload.user_id);
      const tenant = await this.findTenantById(payload.tenant_id);
      
      if (!user || !tenant) {
        throw new Error('User or tenant not found');
      }
      
      // Regenerar access token
      return this.login({
        email: user.email,
        password: '', // Skip password validation for refresh
        tenant_slug: tenant.slug,
        ip_address: JSON.parse(sessionData).ip_address,
        user_agent: JSON.parse(sessionData).user_agent
      });
      
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Revogar todas as sessões de um usuário
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    // Buscar todas as sessões do usuário
    const sessionKeys = await this.redis.keys('session:*');
    const pipeline = this.redis.pipeline();
    
    for (const key of sessionKeys) {
      const sessionData = await this.redis.get(key);
      if (sessionData) {
        const session: SessionData = JSON.parse(sessionData);
        if (session.user_id === userId) {
          pipeline.del(key);
          
          // Também revogar tokens relacionados (seria necessário um mapping)
          // Por simplicidade, vamos invalidar pela expiração natural
        }
      }
    }
    
    await pipeline.exec();
  }

  /**
   * Verificar permissão específica
   */
  hasPermission(payload: ToitJWTPayload, systemCode: string, permission: string): boolean {
    const systemAccess = payload.systems[systemCode];
    if (!systemAccess) {
      return false;
    }
    
    // Admin tem todas as permissões
    if (systemAccess.role === 'ADMIN' || systemAccess.permissions.includes('*')) {
      return true;
    }
    
    return systemAccess.permissions.includes(permission);
  }

  /**
   * Métodos privados para database (temporários - depois vão para models)
   */
  private async findTenantBySlug(slug: string): Promise<Tenant | null> {
    // TODO: Implementar query real no PostgreSQL
    // Por enquanto, mock para Blue World
    if (slug === 'blueworld') {
      return {
        id: 'tenant-blueworld-uuid',
        slug: 'blueworld',
        name: 'Blue World Ltda',
        status: 'ACTIVE',
        plan: 'PREMIUM',
        created_at: new Date(),
        updated_at: new Date(),
        settings: {},
        branding: {
          logo: '/blueworld-logo.png',
          primaryColor: '#1e40af'
        },
        limits: {}
      };
    }
    return null;
  }

  private async findTenantById(id: string): Promise<Tenant | null> {
    // TODO: Implementar query real
    if (id === 'tenant-blueworld-uuid') {
      return this.findTenantBySlug('blueworld');
    }
    return null;
  }

  private async findUser(criteria: any): Promise<any | null> {
    // TODO: Integrar com UserModel existente
    // Por enquanto, usuário mock Blue World
    return {
      id: 'user-blueworld-admin',
      email: 'admin@blueworld.com.br',
      cpf: '123.456.789-00',
      name: 'Administrador Blue World',
      password_hash: await bcrypt.hash('123456', 10), // Senha temporária
      status: 'ACTIVE'
    };
  }

  private async findUserById(id: string): Promise<any | null> {
    // TODO: Implementar busca real
    if (id === 'user-blueworld-admin') {
      return this.findUser({ id });
    }
    return null;
  }

  private async getUserSystems(userId: string, tenantId: string): Promise<any> {
    // TODO: Buscar do banco real
    // Mock para Blue World com OMS + Portal
    return {
      oms: {
        system_id: 'system-oms-uuid',
        role: 'ADMIN',
        permissions: ['*'] // Todas permissões OMS
      },
      portal: {
        system_id: 'system-portal-uuid',
        role: 'USER',
        permissions: [
          'tickets.create',
          'tickets.read',
          'tickets.update',
          'profile.read',
          'profile.update'
        ]
      }
    };
  }

  private async logActivity(userId: string, tenantId: string, action: string, details: any): Promise<void> {
    // TODO: Salvar no audit_logs table
    console.log(`[AUDIT] User ${userId} (Tenant ${tenantId}): ${action}`, details);
  }
}