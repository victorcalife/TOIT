# 🏢 ARQUITETURA MULTI-TENANT - ECOSSISTEMA TOIT

## 🎯 VISÃO GERAL

Sistema unificado que suporta **múltiplos clientes** usando **múltiplos sistemas** da TOIT de forma isolada e escalável.

---

## 🏗️ ESTRUTURA MULTI-TENANT

### 📊 MODELO DE DADOS ESCALÁVEL

```sql
-- === CORE TENANT MANAGEMENT ===

-- Tabela principal de clientes/organizações
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,           -- blueworld, empresa-abc
  name VARCHAR(200) NOT NULL,                 -- "Blue World Ltda"
  domain VARCHAR(100),                        -- blueworld.toit.com (opcional)
  status VARCHAR(20) DEFAULT 'ACTIVE',        -- ACTIVE, SUSPENDED, TRIAL
  plan VARCHAR(50) DEFAULT 'BASIC',           -- BASIC, PREMIUM, ENTERPRISE
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Configurações específicas do tenant
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',               -- logo, cores, etc.
  limits JSONB DEFAULT '{}'                  -- limits por plano
);

-- Sistemas/produtos TOIT disponíveis
CREATE TABLE toit_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,          -- 'oms', 'tradia', 'easis'
  name VARCHAR(100) NOT NULL,                -- 'OMS Blue World', 'Trad.ia'
  description TEXT,
  version VARCHAR(20),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Quais sistemas cada tenant tem acesso
CREATE TABLE tenant_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  system_id UUID REFERENCES toit_systems(id),
  status VARCHAR(20) DEFAULT 'ACTIVE',       -- ACTIVE, SUSPENDED, TRIAL
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,                      -- Para trials/subscriptions
  settings JSONB DEFAULT '{}',               -- Configurações específicas
  
  UNIQUE(tenant_id, system_id)
);

-- === USER MANAGEMENT MULTI-TENANT ===

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  email VARCHAR(255),
  cpf VARCHAR(14),                           -- Para clientes brasileiros
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Email único globalmente, CPF único por tenant
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_cpf_tenant_unique UNIQUE (tenant_id, cpf)
);

-- Perfis/roles por sistema por tenant
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  system_id UUID REFERENCES toit_systems(id),
  role VARCHAR(50) NOT NULL,                 -- ADMIN, USER, MANAGER, VIEWER
  permissions JSONB DEFAULT '[]',            -- Permissões granulares
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, tenant_id, system_id)
);

-- === SISTEMA DE TICKETS MULTI-TENANT ===

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  system_id UUID REFERENCES toit_systems(id), -- Ticket relacionado a qual sistema
  user_id UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),      -- TOIT staff
  
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'ABERTO',        -- ABERTO, EM_ANDAMENTO, RESOLVIDO, FECHADO
  prioridade VARCHAR(20) DEFAULT 'MEDIA',     -- BAIXA, MEDIA, ALTA, CRITICA
  categoria VARCHAR(50),                      -- SUPORTE, BUG, FEATURE, DUVIDA
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  
  -- Índices para performance
  INDEX idx_tickets_tenant_status (tenant_id, status),
  INDEX idx_tickets_assigned (assigned_to, status),
  INDEX idx_tickets_system (system_id, status)
);

CREATE TABLE ticket_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id),
  user_id UUID REFERENCES users(id),
  tipo VARCHAR(20) DEFAULT 'MENSAGEM',        -- MENSAGEM, STATUS_CHANGE, ASSIGNMENT
  conteudo TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- === SISTEMA DE BILLING/USAGE ===

CREATE TABLE tenant_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  month DATE NOT NULL,                        -- 2025-01-01
  
  -- Usage metrics por sistema
  oms_usage JSONB DEFAULT '{}',              -- usuarios ativos, ordens, etc
  tradia_usage JSONB DEFAULT '{}',           -- trades, backtests, etc  
  easis_usage JSONB DEFAULT '{}',            -- transações, relatórios, etc
  portal_usage JSONB DEFAULT '{}',           -- tickets, dashboards, etc
  
  total_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'PENDING',       -- PENDING, PAID, OVERDUE
  
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, month)
);

-- === SISTEMA DE LOGS/AUDITORIA ===

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  system_id UUID REFERENCES toit_systems(id),
  user_id UUID REFERENCES users(id),
  
  action VARCHAR(100) NOT NULL,               -- LOGIN, CREATE_TICKET, etc
  resource_type VARCHAR(50),                  -- TICKET, USER, ORDER, etc
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices para queries de auditoria
  INDEX idx_audit_tenant_date (tenant_id, created_at),
  INDEX idx_audit_user_date (user_id, created_at)
);
```

---

## 🔧 ARQUITETURA DE APLICAÇÃO

### 🌐 ROUTING STRATEGY

```javascript
// Estratégia de subdomínios
https://blueworld.toit.com          // Portal Blue World
https://empresa-abc.toit.com        // Portal Empresa ABC  
https://app.toit.com               // Portal TOIT (admin)
https://api.toit.com               // API unificada

// OU estratégia de paths (mais simples para MVP)
https://portal.toit.com/blueworld   // Portal Blue World
https://portal.toit.com/empresa-abc // Portal Empresa ABC
https://portal.toit.com/admin      // Portal TOIT admin
```

### 🎛️ MIDDLEWARE TENANT RESOLUTION

```typescript
// middleware/tenantResolver.ts
export const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  let tenantSlug: string;
  
  // Estratégia 1: Subdomain
  const subdomain = req.subdomains[0];
  if (subdomain && subdomain !== 'www') {
    tenantSlug = subdomain;
  }
  
  // Estratégia 2: Path-based  
  if (!tenantSlug && req.path.startsWith('/tenant/')) {
    tenantSlug = req.path.split('/')[2];
  }
  
  // Estratégia 3: Header (para API)
  if (!tenantSlug) {
    tenantSlug = req.headers['x-tenant-slug'] as string;
  }
  
  if (!tenantSlug) {
    return res.status(400).json({ error: 'Tenant not specified' });
  }
  
  // Buscar tenant no database
  const tenant = await Tenant.findBySlug(tenantSlug);
  if (!tenant || tenant.status !== 'ACTIVE') {
    return res.status(404).json({ error: 'Tenant not found or inactive' });
  }
  
  // Adicionar ao request context
  req.tenant = tenant;
  next();
};
```

### 🔐 SISTEMA DE PERMISSÕES

```typescript
// middleware/permissions.ts
export const requirePermission = (system: string, permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { user, tenant } = req;
    
    // Verificar se usuário tem acesso ao sistema no tenant
    const userRole = await UserRole.findOne({
      user_id: user.id,
      tenant_id: tenant.id,
      system_id: system
    });
    
    if (!userRole || !userRole.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Uso nas rotas
app.get('/api/tickets', 
  resolveTenant,
  authenticate,
  requirePermission('portal', 'tickets.read'),
  getTickets
);
```

---

## 🚀 APIS MULTI-TENANT

### 📋 TICKETS API

```typescript
// routes/tickets.ts
export const ticketRoutes = Router();

// Listar tickets do tenant
ticketRoutes.get('/', async (req: Request, res: Response) => {
  const { tenant, user } = req;
  
  const tickets = await Ticket.find({
    tenant_id: tenant.id,
    // Se não for admin, só vê próprios tickets
    ...(user.role !== 'ADMIN' && { user_id: user.id })
  });
  
  res.json(tickets);
});

// Criar ticket
ticketRoutes.post('/', async (req: Request, res: Response) => {
  const { tenant, user } = req;
  const { system_id, titulo, descricao, prioridade } = req.body;
  
  // Verificar se tenant tem acesso ao sistema
  const tenantSystem = await TenantSystem.findOne({
    tenant_id: tenant.id,
    system_id,
    status: 'ACTIVE'
  });
  
  if (!tenantSystem) {
    return res.status(400).json({ error: 'System not available for this tenant' });
  }
  
  const ticket = await Ticket.create({
    tenant_id: tenant.id,
    system_id,
    user_id: user.id,
    titulo,
    descricao,
    prioridade
  });
  
  // Notificar equipe TOIT
  await notifyToitTeam(ticket);
  
  res.status(201).json(ticket);
});
```

---

## 🎨 FRONTEND MULTI-TENANT

### 🖼️ COMPONENTE TENANT PROVIDER

```tsx
// contexts/TenantContext.tsx
export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Detectar tenant do URL/subdomain
    const detectTenant = async () => {
      const tenantSlug = window.location.hostname.split('.')[0];
      
      try {
        const response = await api.get(`/tenants/${tenantSlug}`);
        setTenant(response.data);
      } catch (error) {
        // Redirecionar para página de erro ou TOIT principal
        window.location.href = 'https://toit.com/not-found';
      } finally {
        setLoading(false);
      }
    };
    
    detectTenant();
  }, []);
  
  if (loading) return <LoadingScreen />;
  
  return (
    <TenantContext.Provider value={{ tenant, setTenant }}>
      <ThemeProvider theme={tenant?.branding || defaultTheme}>
        {children}
      </ThemeProvider>
    </TenantContext.Provider>
  );
};
```

### 🎯 DASHBOARD CONTEXTUALIZADO

```tsx
// components/TenantDashboard.tsx
export const TenantDashboard = () => {
  const { tenant } = useTenant();
  const { user } = useAuth();
  
  // Buscar sistemas disponíveis para este tenant
  const { data: availableSystems } = useQuery(['tenant-systems'], () =>
    api.get('/tenant-systems')
  );
  
  return (
    <div className="dashboard">
      <Header 
        logo={tenant.branding.logo || '/toit-logo.png'}
        title={`Portal ${tenant.name}`}
      />
      
      <SystemsGrid>
        {availableSystems?.map(system => (
          <SystemCard 
            key={system.id}
            system={system}
            tenant={tenant}
          />
        ))}
      </SystemsGrid>
      
      <QuickActions tenant={tenant} />
      <RecentActivity tenant={tenant} />
    </div>
  );
};
```

---

## 🔄 PROCESSO DE ONBOARDING

### 📝 TENANT REGISTRATION

```typescript
// services/tenantService.ts
export const createTenant = async (data: {
  name: string;
  slug: string;
  systems: string[];  // ['oms', 'tradia']
  admin_user: {
    name: string;
    email: string;
    cpf?: string;
  };
}) => {
  const transaction = await db.transaction();
  
  try {
    // 1. Criar tenant
    const tenant = await Tenant.create({
      name: data.name,
      slug: data.slug,
      status: 'TRIAL'  // 30 dias trial
    }, { transaction });
    
    // 2. Adicionar sistemas solicitados
    for (const systemCode of data.systems) {
      const system = await ToitSystem.findByCode(systemCode);
      await TenantSystem.create({
        tenant_id: tenant.id,
        system_id: system.id,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
      }, { transaction });
    }
    
    // 3. Criar usuário admin
    const adminUser = await User.create({
      tenant_id: tenant.id,
      ...data.admin_user,
      status: 'ACTIVE'
    }, { transaction });
    
    // 4. Dar permissões admin
    for (const systemCode of data.systems) {
      const system = await ToitSystem.findByCode(systemCode);
      await UserRole.create({
        user_id: adminUser.id,
        tenant_id: tenant.id,
        system_id: system.id,
        role: 'ADMIN',
        permissions: ['*'] // All permissions
      }, { transaction });
    }
    
    await transaction.commit();
    
    // 5. Setup inicial (databases, configs, etc)
    await setupTenantInfrastructure(tenant);
    
    // 6. Enviar emails de boas-vindas
    await sendWelcomeEmail(tenant, adminUser);
    
    return tenant;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
```

---

## 📊 SISTEMA DE BILLING

### 💰 USAGE TRACKING

```typescript
// services/usageTracker.ts
export const trackUsage = async (
  tenantId: string, 
  systemId: string, 
  metric: string, 
  value: number = 1
) => {
  const month = new Date().toISOString().slice(0, 7) + '-01';
  
  await TenantBilling.upsert({
    tenant_id: tenantId,
    month,
    [`${systemId}_usage`]: db.literal(`
      COALESCE(${systemId}_usage, '{}')::jsonb || 
      jsonb_build_object('${metric}', 
        COALESCE((${systemId}_usage->>'${metric}')::int, 0) + ${value}
      )
    `)
  });
};

// Uso nas APIs
export const createTicket = async (req: Request, res: Response) => {
  // ... criar ticket ...
  
  // Track usage
  await trackUsage(req.tenant.id, 'portal', 'tickets_created');
  
  res.json(ticket);
};
```

---

## 🎯 ROADMAP DE IMPLEMENTAÇÃO

### 🔥 FASE 1: CORE MULTI-TENANT (1-2 semanas)
- [ ] Database schema multi-tenant
- [ ] Middleware tenant resolution
- [ ] Sistema de permissões básico
- [ ] API tickets multi-tenant
- [ ] Frontend tenant-aware

### 🚀 FASE 2: PORTAL BLUE WORLD (1 semana)
- [ ] Onboarding Blue World como primeiro tenant
- [ ] Migração dados existentes
- [ ] Interface tickets customizada
- [ ] Testes com usuário real

### 📈 FASE 3: ESCALABILIDADE (2-3 semanas)  
- [ ] Sistema de billing/usage
- [ ] Onboarding automatizado
- [ ] Dashboard admin TOIT
- [ ] Monitoring e alertas

### 🎨 FASE 4: ADVANCED FEATURES (1 mês)
- [ ] Custom branding por tenant
- [ ] API webhooks
- [ ] Integrações externas
- [ ] Mobile app tenant-aware

---

## ✅ BENEFÍCIOS DA ARQUITETURA

### 🔒 **ISOLAMENTO**
- Dados completamente isolados por tenant
- Configurações independentes
- Billing separado

### 📊 **ESCALABILIDADE** 
- Onboarding automatizado
- Performance otimizada
- Usage tracking preciso

### 🎨 **CUSTOMIZAÇÃO**
- Branding personalizado
- Funcionalidades específicas
- Permissões granulares

### 💼 **BUSINESS**
- Modelo SaaS robusto
- Multiple revenue streams
- Customer success tracking

---

*Esta arquitetura suporta o crescimento da TOIT de 1 para 100+ clientes usando múltiplos sistemas de forma escalável e sustentável.*