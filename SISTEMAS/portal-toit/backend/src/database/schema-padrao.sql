-- ============================================================
-- PADRÃO DE CAMPOS OBRIGATÓRIOS PARA TODAS AS TABELAS TOIT
-- ============================================================

-- Campos que TODA tabela deve ter:

/*
=== CAMPOS DE CONTEXTO OBRIGATÓRIOS ===
perfil          VARCHAR(50)     -- ADMIN, USER, CLIENTE, TOIT, etc.
model           VARCHAR(100)    -- Nome do model/entidade (User, Ticket, Order, etc.)
aplicacao       VARCHAR(50)     -- oms, tradia, easis, portal
contexto        VARCHAR(100)    -- Contexto específico (blueworld, empresa-abc, etc.)

=== CAMPOS GENÉRICOS PARA FUTURAS NECESSIDADES ===
campo1          VARCHAR(255)    -- Campo genérico texto
campo2          VARCHAR(255)    -- Campo genérico texto
campo3          JSONB          -- Campo genérico estruturado
campo4          DECIMAL(15,2)   -- Campo genérico numérico
campo5          TIMESTAMP       -- Campo genérico de data/hora

=== CAMPOS DE AUDITORIA OBRIGATÓRIOS ===
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id       UUID REFERENCES tenants(id)
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
deleted_at      TIMESTAMP       -- Para soft delete
created_by      UUID            -- ID do usuário que criou
updated_by      UUID            -- ID do usuário que atualizou
deleted_by      UUID            -- ID do usuário que deletou
version         INTEGER DEFAULT 1    -- Para versionamento otimista
active          BOOLEAN DEFAULT TRUE -- Status ativo/inativo
*/

-- ============================================================
-- FUNÇÃO PARA CRIAR TABELA COM PADRÃO TOIT
-- ============================================================

CREATE OR REPLACE FUNCTION create_toit_table(
    table_name TEXT,
    additional_columns TEXT DEFAULT ''
) RETURNS TEXT AS $$
DECLARE
    sql_command TEXT;
BEGIN
    sql_command := format('
        CREATE TABLE IF NOT EXISTS %I (
            -- === IDENTIFICAÇÃO ===
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
            
            -- === CAMPOS DE CONTEXTO OBRIGATÓRIOS ===
            perfil VARCHAR(50) NOT NULL,
            model VARCHAR(100) NOT NULL DEFAULT ''%I'',
            aplicacao VARCHAR(50) NOT NULL DEFAULT ''portal'',
            contexto VARCHAR(100),
            
            -- === CAMPOS GENÉRICOS PARA FUTURAS NECESSIDADES ===
            campo1 VARCHAR(255),
            campo2 VARCHAR(255), 
            campo3 JSONB DEFAULT ''{}''::jsonb,
            campo4 DECIMAL(15,2),
            campo5 TIMESTAMP,
            
            -- === CAMPOS DE AUDITORIA ===
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            deleted_at TIMESTAMP,
            created_by UUID,
            updated_by UUID,
            deleted_by UUID,
            version INTEGER DEFAULT 1,
            active BOOLEAN DEFAULT TRUE
            
            %s
        );
        
        -- Índices padrão
        CREATE INDEX IF NOT EXISTS idx_%I_tenant_id ON %I(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_%I_perfil ON %I(perfil);
        CREATE INDEX IF NOT EXISTS idx_%I_aplicacao ON %I(aplicacao);
        CREATE INDEX IF NOT EXISTS idx_%I_contexto ON %I(contexto);
        CREATE INDEX IF NOT EXISTS idx_%I_created_at ON %I(created_at);
        CREATE INDEX IF NOT EXISTS idx_%I_active ON %I(active);
        CREATE INDEX IF NOT EXISTS idx_%I_deleted_at ON %I(deleted_at) WHERE deleted_at IS NULL;
        
        -- Trigger para updated_at automático
        CREATE TRIGGER trigger_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    ', 
    table_name, table_name, 
    CASE WHEN additional_columns != '''' THEN '', '' || additional_columns ELSE '''' END,
    table_name, table_name,
    table_name, table_name,
    table_name, table_name,
    table_name, table_name,
    table_name, table_name,
    table_name, table_name,
    table_name, table_name,
    table_name, table_name);
    
    EXECUTE sql_command;
    
    RETURN 'Tabela ' || table_name || ' criada com padrão TOIT';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNÇÃO PARA ATUALIZAR updated_at AUTOMATICAMENTE
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABELAS PRINCIPAIS COM PADRÃO TOIT
-- ============================================================

-- === TABELA TENANTS ===
SELECT create_toit_table('tenants', '
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    status VARCHAR(20) DEFAULT ''ACTIVE'',
    plan VARCHAR(50) DEFAULT ''BASIC'',
    settings JSONB DEFAULT ''{}''::jsonb,
    branding JSONB DEFAULT ''{}''::jsonb,
    limits JSONB DEFAULT ''{}''::jsonb
');

-- === TABELA SISTEMAS TOIT ===
SELECT create_toit_table('toit_systems', '
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    version VARCHAR(20) DEFAULT ''1.0.0'',
    status VARCHAR(20) DEFAULT ''ACTIVE'',
    config JSONB DEFAULT ''{}''::jsonb
');

-- === TABELA USUÁRIOS ===
SELECT create_toit_table('users', '
    email VARCHAR(255),
    cpf VARCHAR(14),
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT ''ACTIVE'',
    last_login TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    preferences JSONB DEFAULT ''{}''::jsonb,
    
    -- Constraints
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_cpf_tenant_unique UNIQUE (tenant_id, cpf),
    CONSTRAINT users_email_or_cpf_required CHECK (email IS NOT NULL OR cpf IS NOT NULL)
');

-- === TABELA TENANT SYSTEMS ===
SELECT create_toit_table('tenant_systems', '
    system_id UUID REFERENCES toit_systems(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT ''ACTIVE'',
    started_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    settings JSONB DEFAULT ''{}''::jsonb,
    
    UNIQUE(tenant_id, system_id)
');

-- === TABELA USER ROLES ===
SELECT create_toit_table('user_roles', '
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    system_id UUID REFERENCES toit_systems(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    permissions JSONB DEFAULT ''[]''::jsonb,
    expires_at TIMESTAMP,
    
    UNIQUE(user_id, tenant_id, system_id)
');

-- === TABELA TICKETS ===
SELECT create_toit_table('tickets', '
    system_id UUID REFERENCES toit_systems(id),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id),
    
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT NOT NULL,
    status VARCHAR(20) DEFAULT ''ABERTO'',
    prioridade VARCHAR(20) DEFAULT ''MEDIA'',
    categoria VARCHAR(50),
    tags JSONB DEFAULT ''[]''::jsonb,
    
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    
    -- Índices específicos
    INDEX idx_tickets_status (status),
    INDEX idx_tickets_prioridade (prioridade),
    INDEX idx_tickets_assigned (assigned_to, status)
');

-- === TABELA TICKET MENSAGENS ===
SELECT create_toit_table('ticket_mensagens', '
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    
    tipo VARCHAR(20) DEFAULT ''MENSAGEM'',
    conteudo TEXT NOT NULL,
    attachments JSONB DEFAULT ''[]''::jsonb,
    is_internal BOOLEAN DEFAULT FALSE,
    
    INDEX idx_ticket_mensagens_ticket (ticket_id, created_at)
');

-- === TABELA TENANT BILLING ===
SELECT create_toit_table('tenant_billing', '
    month DATE NOT NULL,
    
    -- Usage metrics por sistema
    oms_usage JSONB DEFAULT ''{}''::jsonb,
    tradia_usage JSONB DEFAULT ''{}''::jsonb,
    easis_usage JSONB DEFAULT ''{}''::jsonb,
    portal_usage JSONB DEFAULT ''{}''::jsonb,
    
    total_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT ''PENDING'',
    paid_at TIMESTAMP,
    due_date DATE,
    
    UNIQUE(tenant_id, month)
');

-- === TABELA AUDIT LOGS ===
SELECT create_toit_table('audit_logs', '
    system_id UUID REFERENCES toit_systems(id),
    user_id UUID REFERENCES users(id),
    
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    
    -- Índices para performance
    INDEX idx_audit_tenant_date (tenant_id, created_at),
    INDEX idx_audit_user_date (user_id, created_at),
    INDEX idx_audit_action (action, created_at)
');

-- === TABELA NOTIFICACOES ===
SELECT create_toit_table('notificacoes', '
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    system_id UUID REFERENCES toit_systems(id),
    
    titulo VARCHAR(200) NOT NULL,
    mensagem TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT ''INFO'',
    categoria VARCHAR(50),
    
    read_at TIMESTAMP,
    clicked_at TIMESTAMP,
    
    -- Dados para envio
    email_sent BOOLEAN DEFAULT FALSE,
    sms_sent BOOLEAN DEFAULT FALSE,
    push_sent BOOLEAN DEFAULT FALSE,
    
    -- Metadados
    data JSONB DEFAULT ''{}''::jsonb,
    
    INDEX idx_notificacoes_user_read (user_id, read_at),
    INDEX idx_notificacoes_tipo (tipo, created_at)
');

-- === TABELA SESSIONS (para Redis backup/auditoria) ===
SELECT create_toit_table('sessions', '
    session_id UUID UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    ip_address INET,
    user_agent TEXT,
    last_activity TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    
    -- Session data
    data JSONB DEFAULT ''{}''::jsonb,
    
    INDEX idx_sessions_user (user_id, expires_at),
    INDEX idx_sessions_expires (expires_at)
');

-- ============================================================
-- DADOS INICIAIS
-- ============================================================

-- Tenant Blue World
INSERT INTO tenants (slug, name, status, plan, perfil, model, aplicacao, contexto, created_by) 
VALUES (
    'blueworld', 
    'Blue World Ltda', 
    'ACTIVE', 
    'PREMIUM',
    'CLIENTE',
    'Tenant',
    'portal',
    'production',
    'system'
) ON CONFLICT (slug) DO NOTHING;

-- Sistemas TOIT
INSERT INTO toit_systems (code, name, description, perfil, model, aplicacao, contexto) VALUES 
('oms', 'OMS - Order Management System', 'Sistema de Gestão de Ordens de Serviço', 'SISTEMA', 'ToitSystem', 'oms', 'core'),
('portal', 'Portal TOIT', 'Portal principal de acesso', 'SISTEMA', 'ToitSystem', 'portal', 'core'),
('tradia', 'Trad.ia', 'Sistema de Trading com IA', 'SISTEMA', 'ToitSystem', 'tradia', 'core'),
('easis', 'Easis ERP', 'Sistema ERP Empresarial', 'SISTEMA', 'ToitSystem', 'easis', 'core')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

-- View para dados ativos (sem soft delete)
CREATE OR REPLACE VIEW active_records AS
SELECT 
    'tenants' as table_name, id, tenant_id, perfil, model, aplicacao, contexto, created_at, updated_at
FROM tenants WHERE deleted_at IS NULL AND active = TRUE
UNION ALL
SELECT 
    'users' as table_name, id, tenant_id, perfil, model, aplicacao, contexto, created_at, updated_at
FROM users WHERE deleted_at IS NULL AND active = TRUE
UNION ALL
SELECT 
    'tickets' as table_name, id, tenant_id, perfil, model, aplicacao, contexto, created_at, updated_at
FROM tickets WHERE deleted_at IS NULL AND active = TRUE;

-- View para auditoria por tenant
CREATE OR REPLACE VIEW tenant_activity AS
SELECT 
    t.slug as tenant_slug,
    t.name as tenant_name,
    al.action,
    al.resource_type,
    al.created_at,
    u.name as user_name,
    al.ip_address
FROM audit_logs al
JOIN tenants t ON al.tenant_id = t.id
LEFT JOIN users u ON al.user_id = u.id
WHERE al.deleted_at IS NULL
ORDER BY al.created_at DESC;

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

-- Função para soft delete
CREATE OR REPLACE FUNCTION soft_delete(
    table_name TEXT,
    record_id UUID,
    user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    sql_command TEXT;
BEGIN
    sql_command := format('
        UPDATE %I 
        SET deleted_at = NOW(), 
            deleted_by = %L,
            active = FALSE
        WHERE id = %L AND deleted_at IS NULL
    ', table_name, user_id, record_id);
    
    EXECUTE sql_command;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar registros por contexto
CREATE OR REPLACE FUNCTION get_by_context(
    table_name TEXT,
    tenant_slug TEXT,
    app_name TEXT DEFAULT 'portal'
) RETURNS TABLE(id UUID, data JSONB) AS $$
BEGIN
    RETURN QUERY EXECUTE format('
        SELECT r.id, row_to_json(r)::jsonb as data
        FROM %I r
        JOIN tenants t ON r.tenant_id = t.id
        WHERE t.slug = %L 
          AND r.aplicacao = %L
          AND r.deleted_at IS NULL
          AND r.active = TRUE
        ORDER BY r.created_at DESC
    ', table_name, tenant_slug, app_name);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================

COMMENT ON TABLE tenants IS 'Clientes/organizações do sistema multi-tenant';
COMMENT ON TABLE toit_systems IS 'Sistemas/produtos disponíveis na plataforma TOIT';
COMMENT ON TABLE users IS 'Usuários do sistema com contexto multi-tenant';
COMMENT ON TABLE tickets IS 'Sistema de tickets de suporte multi-tenant';
COMMENT ON TABLE audit_logs IS 'Log de auditoria para todas as ações do sistema';

COMMENT ON COLUMN tenants.perfil IS 'Tipo de tenant: CLIENTE, PARCEIRO, INTERNO';
COMMENT ON COLUMN tenants.modelo IS 'Model/entidade: Tenant';
COMMENT ON COLUMN tenants.aplicacao IS 'Sistema origem: portal, oms, tradia, easis';
COMMENT ON COLUMN tenants.contexto IS 'Contexto específico: production, staging, test';

-- ============================================================
-- GRANTS E PERMISSÕES
-- ============================================================

-- Criar role para aplicações TOIT
CREATE ROLE toit_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO toit_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO toit_app;

-- ============================================================
-- SCRIPT DE VERIFICAÇÃO
-- ============================================================

-- Verificar se todas as tabelas têm os campos padrão
DO $$
DECLARE
    table_record RECORD;
    missing_columns TEXT[];
BEGIN
    FOR table_record IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        -- Verificar campos obrigatórios
        SELECT ARRAY_AGG(col) INTO missing_columns
        FROM UNNEST(ARRAY['perfil', 'model', 'aplicacao', 'contexto', 'campo1', 'campo2', 'campo3', 'campo4', 'campo5', 'created_at', 'updated_at', 'active']) AS col
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = table_record.table_name 
            AND column_name = col
        );
        
        IF array_length(missing_columns, 1) > 0 THEN
            RAISE NOTICE 'Tabela % está faltando campos: %', table_record.table_name, array_to_string(missing_columns, ', ');
        END IF;
    END LOOP;
END $$;