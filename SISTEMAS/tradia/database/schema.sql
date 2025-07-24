-- ============================================================
-- TRADIA DATABASE SCHEMA - Seguindo Padrão TOIT
-- ============================================================

-- Importar esquema padrão TOIT primeiro
-- \i schema-padrao.sql

-- ============================================================
-- TABELAS ESPECÍFICAS TRADIA
-- ============================================================

-- === TABELA USUÁRIOS TRADIA ===
SELECT create_toit_table('tradia_users', '
    -- Dados básicos do usuário (seguindo padrão TOIT)
    email VARCHAR(255),
    cpf VARCHAR(14),
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    
    -- Campos específicos TRADia
    capital_inicial DECIMAL(15,2) DEFAULT 0,
    capital_atual DECIMAL(15,2) DEFAULT 0,
    broker VARCHAR(100),
    conta_broker VARCHAR(100),
    risk_profile VARCHAR(20) DEFAULT ''MODERADO'',
    
    -- Preferências de trading
    strategies_enabled JSONB DEFAULT ''["swing", "gap", "pairs"]''::jsonb,
    notification_preferences JSONB DEFAULT ''{
        "whatsapp": true,
        "email": true,
        "push": true,
        "sms": false
    }''::jsonb,
    
    -- Status e controle
    status VARCHAR(20) DEFAULT ''ACTIVE'',
    subscription_plan VARCHAR(50) DEFAULT ''BASIC'',
    subscription_status VARCHAR(20) DEFAULT ''TRIAL'',
    subscription_expires_at TIMESTAMP,
    last_login TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    
    -- Performance tracking
    total_return DECIMAL(10,4) DEFAULT 0,
    monthly_return DECIMAL(10,4) DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    max_drawdown DECIMAL(5,2) DEFAULT 0,
    sharpe_ratio DECIMAL(8,4) DEFAULT 0,
    
    -- Onboarding e configuração
    onboarding_completed BOOLEAN DEFAULT FALSE,
    terms_accepted_at TIMESTAMP,
    privacy_accepted_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT tradia_users_email_unique UNIQUE (email),
    CONSTRAINT tradia_users_cpf_tenant_unique UNIQUE (tenant_id, cpf),
    CONSTRAINT tradia_users_email_or_cpf_required CHECK (email IS NOT NULL OR cpf IS NOT NULL),
    CONSTRAINT tradia_users_capital_positive CHECK (capital_inicial >= 0 AND capital_atual >= 0)
');

-- === TABELA SINAIS ===
SELECT create_toit_table('tradia_signals', '
    -- Identificação do sinal
    signal_id VARCHAR(50) UNIQUE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    strategy VARCHAR(50) NOT NULL,
    
    -- Dados da operação
    action VARCHAR(10) NOT NULL CHECK (action IN (''BUY'', ''SELL'', ''SHORT'')),
    price DECIMAL(10,2) NOT NULL,
    target_price DECIMAL(10,2),
    stop_loss DECIMAL(10,2),
    
    -- Timing e prazo
    signal_time TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    expected_duration_days INTEGER,
    
    -- Análise e confiança
    confidence DECIMAL(5,2) NOT NULL,
    reasoning TEXT NOT NULL,
    technical_analysis JSONB DEFAULT ''{}''::jsonb,
    
    -- Gestão de risco
    risk_level VARCHAR(20) DEFAULT ''MEDIUM'',
    max_position_size DECIMAL(5,2) DEFAULT 5.0,
    sector VARCHAR(50),
    
    -- Status do sinal
    status VARCHAR(20) DEFAULT ''ACTIVE'',
    priority VARCHAR(20) DEFAULT ''NORMAL'',
    is_urgent BOOLEAN DEFAULT FALSE,
    
    -- Resultados (quando fechado)
    closed_at TIMESTAMP,
    close_price DECIMAL(10,2),
    result_percent DECIMAL(8,4),
    result_status VARCHAR(20), -- WIN, LOSS, BREAK_EVEN
    
    -- Métricas de engajamento
    views_count INTEGER DEFAULT 0,
    executions_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    
    -- Índices específicos
    INDEX idx_tradia_signals_symbol_time (symbol, signal_time),
    INDEX idx_tradia_signals_strategy_status (strategy, status),
    INDEX idx_tradia_signals_expires (expires_at) WHERE status = ''ACTIVE''
');

-- === TABELA POSIÇÕES DOS USUÁRIOS ===
SELECT create_toit_table('tradia_positions', '
    user_id UUID REFERENCES tradia_users(id) ON DELETE CASCADE,
    signal_id UUID REFERENCES tradia_signals(id) ON DELETE CASCADE,
    
    -- Dados da execução
    symbol VARCHAR(20) NOT NULL,
    action VARCHAR(10) NOT NULL,
    quantity INTEGER NOT NULL,
    entry_price DECIMAL(10,2) NOT NULL,
    entry_time TIMESTAMP DEFAULT NOW(),
    
    -- Valores calculados
    position_value DECIMAL(15,2) NOT NULL,
    position_percent DECIMAL(5,2) NOT NULL, -- % do capital
    
    -- Status da posição
    status VARCHAR(20) DEFAULT ''OPEN'', -- OPEN, CLOSED, PARTIAL
    
    -- Saída (quando fechada)
    exit_price DECIMAL(10,2),
    exit_time TIMESTAMP,
    exit_reason VARCHAR(50), -- TARGET, STOP, MANUAL, EXPIRED
    
    -- Resultados
    realized_pnl DECIMAL(15,2),
    realized_percent DECIMAL(8,4),
    fees DECIMAL(10,2) DEFAULT 0,
    
    -- Execução manual vs automática
    execution_type VARCHAR(20) DEFAULT ''MANUAL'',
    broker_order_id VARCHAR(100),
    
    -- Constraints
    CONSTRAINT tradia_positions_quantity_positive CHECK (quantity > 0),
    CONSTRAINT tradia_positions_prices_positive CHECK (entry_price > 0),
    UNIQUE(user_id, signal_id, entry_time)
');

-- === TABELA PERFORMANCE DOS USUÁRIOS ===
SELECT create_toit_table('tradia_performance', '
    user_id UUID REFERENCES tradia_users(id) ON DELETE CASCADE,
    
    -- Período da performance
    period_type VARCHAR(20) NOT NULL, -- DAILY, WEEKLY, MONTHLY, YEARLY
    period_date DATE NOT NULL,
    
    -- Capital e retornos
    starting_capital DECIMAL(15,2) NOT NULL,
    ending_capital DECIMAL(15,2) NOT NULL,
    return_amount DECIMAL(15,2) NOT NULL,
    return_percent DECIMAL(8,4) NOT NULL,
    
    -- Métricas de trading
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Métricas de risco
    max_drawdown DECIMAL(5,2) DEFAULT 0,
    volatility DECIMAL(8,4) DEFAULT 0,
    sharpe_ratio DECIMAL(8,4) DEFAULT 0,
    
    -- Comparação com benchmark
    benchmark_return DECIMAL(8,4) DEFAULT 0, -- IBOV return
    alpha DECIMAL(8,4) DEFAULT 0,
    
    -- Adesão aos sinais
    signals_received INTEGER DEFAULT 0,
    signals_executed INTEGER DEFAULT 0,
    adherence_rate DECIMAL(5,2) DEFAULT 0,
    
    UNIQUE(user_id, period_type, period_date)
');

-- === TABELA NOTIFICAÇÕES ===
SELECT create_toit_table('tradia_notifications', '
    user_id UUID REFERENCES tradia_users(id) ON DELETE CASCADE,
    signal_id UUID REFERENCES tradia_signals(id) ON DELETE SET NULL,
    
    -- Conteúdo da notificação
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- SIGNAL, ALERT, UPDATE, NEWS
    priority VARCHAR(20) DEFAULT ''NORMAL'',
    
    -- Canais de envio
    send_whatsapp BOOLEAN DEFAULT TRUE,
    send_email BOOLEAN DEFAULT TRUE,
    send_push BOOLEAN DEFAULT TRUE,
    send_sms BOOLEAN DEFAULT FALSE,
    
    -- Status de envio
    whatsapp_sent BOOLEAN DEFAULT FALSE,
    whatsapp_sent_at TIMESTAMP,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    push_sent BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMP,
    sms_sent BOOLEAN DEFAULT FALSE,
    sms_sent_at TIMESTAMP,
    
    -- Interação do usuário
    read_at TIMESTAMP,
    clicked_at TIMESTAMP,
    dismissed_at TIMESTAMP,
    
    -- Metadados
    data JSONB DEFAULT ''{}''::jsonb,
    external_ids JSONB DEFAULT ''{}''::jsonb, -- IDs de APIs externas
    
    INDEX idx_tradia_notifications_user_read (user_id, read_at),
    INDEX idx_tradia_notifications_type_priority (notification_type, priority)
');

-- === TABELA PLANOS E BILLING ===
SELECT create_toit_table('tradia_subscriptions', '
    user_id UUID REFERENCES tradia_users(id) ON DELETE CASCADE,
    
    -- Dados do plano
    plan_code VARCHAR(50) NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    plan_price DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(20) DEFAULT ''MONTHLY'',
    
    -- Status da assinatura
    status VARCHAR(20) DEFAULT ''ACTIVE'',
    starts_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    
    -- Histórico de pagamentos
    last_payment_at TIMESTAMP,
    next_payment_at TIMESTAMP,
    payment_method VARCHAR(50),
    
    -- Limites do plano
    limits JSONB DEFAULT ''{
        "signals_per_month": 1000,
        "notifications_per_day": 50,
        "api_calls_per_hour": 100
    }''::jsonb,
    
    -- Métricas de uso
    current_usage JSONB DEFAULT ''{}''::jsonb,
    
    UNIQUE(user_id, starts_at)
');

-- === TABELA BACKTEST RESULTS ===
SELECT create_toit_table('tradia_backtests', '
    -- Identificação do backtest
    strategy VARCHAR(50) NOT NULL,
    symbol VARCHAR(20),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Configurações
    initial_capital DECIMAL(15,2) DEFAULT 100000,
    position_sizing VARCHAR(20) DEFAULT ''KELLY'',
    commission DECIMAL(5,4) DEFAULT 0.0025,
    
    -- Resultados gerais
    total_return DECIMAL(8,4) NOT NULL,
    annualized_return DECIMAL(8,4) NOT NULL,
    volatility DECIMAL(8,4) NOT NULL,
    sharpe_ratio DECIMAL(8,4) NOT NULL,
    max_drawdown DECIMAL(5,2) NOT NULL,
    
    -- Métricas de trades
    total_trades INTEGER NOT NULL,
    winning_trades INTEGER NOT NULL,
    losing_trades INTEGER NOT NULL,
    win_rate DECIMAL(5,2) NOT NULL,
    avg_win DECIMAL(8,4) NOT NULL,
    avg_loss DECIMAL(8,4) NOT NULL,
    profit_factor DECIMAL(8,4) NOT NULL,
    
    -- Resultados detalhados
    trades_detail JSONB DEFAULT ''[]''::jsonb,
    equity_curve JSONB DEFAULT ''[]''::jsonb,
    monthly_returns JSONB DEFAULT ''[]''::jsonb,
    
    -- Metadados
    parameters JSONB DEFAULT ''{}''::jsonb,
    execution_time_ms INTEGER,
    
    INDEX idx_tradia_backtests_strategy_period (strategy, period_start, period_end)
');

-- === TABELA MARKET DATA CACHE ===
SELECT create_toit_table('tradia_market_data', '
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL, -- 1D, 1H, 5M, etc.
    timestamp TIMESTAMP NOT NULL,
    
    -- OHLCV data
    open_price DECIMAL(10,4) NOT NULL,
    high_price DECIMAL(10,4) NOT NULL,
    low_price DECIMAL(10,4) NOT NULL,
    close_price DECIMAL(10,4) NOT NULL,
    volume BIGINT DEFAULT 0,
    
    -- Indicadores técnicos calculados
    sma_20 DECIMAL(10,4),
    sma_50 DECIMAL(10,4),
    rsi_14 DECIMAL(5,2),
    macd DECIMAL(10,6),
    macd_signal DECIMAL(10,6),
    bollinger_upper DECIMAL(10,4),
    bollinger_lower DECIMAL(10,4),
    
    -- Source e qualidade dos dados
    data_source VARCHAR(50) DEFAULT ''YAHOO'',
    quality_score DECIMAL(3,2) DEFAULT 1.0,
    
    UNIQUE(symbol, timeframe, timestamp),
    INDEX idx_tradia_market_data_symbol_time (symbol, timestamp),
    INDEX idx_tradia_market_data_timeframe (timeframe, timestamp)
');

-- ============================================================
-- VIEWS ESPECÍFICAS TRADIA
-- ============================================================

-- View para dashboard dos usuários
CREATE OR REPLACE VIEW tradia_user_dashboard AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    u.capital_inicial,
    u.capital_atual,
    u.total_return,
    u.win_rate,
    u.subscription_plan,
    u.subscription_status,
    
    -- Posições abertas
    COUNT(p.id) FILTER (WHERE p.status = 'OPEN') as open_positions,
    SUM(p.position_value) FILTER (WHERE p.status = 'OPEN') as total_exposure,
    
    -- Performance últimos 30 dias
    perf.return_percent as monthly_return,
    perf.adherence_rate,
    
    -- Últimos sinais
    COUNT(s.id) FILTER (WHERE s.created_at >= NOW() - INTERVAL '7 days') as signals_last_week
    
FROM tradia_users u
LEFT JOIN tradia_positions p ON u.id = p.user_id AND p.deleted_at IS NULL
LEFT JOIN tradia_performance perf ON u.id = perf.user_id 
    AND perf.period_type = 'MONTHLY'
    AND perf.period_date = DATE_TRUNC('month', NOW())::DATE
LEFT JOIN tradia_signals s ON s.created_at >= NOW() - INTERVAL '7 days'
WHERE u.deleted_at IS NULL AND u.active = TRUE
GROUP BY u.id, u.name, u.email, u.capital_inicial, u.capital_atual, 
         u.total_return, u.win_rate, u.subscription_plan, u.subscription_status,
         perf.return_percent, perf.adherence_rate;

-- View para sinais ativos
CREATE OR REPLACE VIEW tradia_active_signals AS
SELECT 
    s.*,
    COUNT(p.id) as executions_count,
    AVG(p.position_percent) as avg_position_size,
    (s.created_at + INTERVAL '1 hour' * s.expected_duration_days * 24) as estimated_close
FROM tradia_signals s
LEFT JOIN tradia_positions p ON s.id = p.signal_id AND p.deleted_at IS NULL
WHERE s.status = 'ACTIVE' 
  AND s.deleted_at IS NULL 
  AND (s.expires_at IS NULL OR s.expires_at > NOW())
GROUP BY s.id
ORDER BY s.is_urgent DESC, s.priority DESC, s.confidence DESC;

-- ============================================================
-- FUNÇÕES ESPECÍFICAS TRADIA
-- ============================================================

-- Função para calcular performance do usuário
CREATE OR REPLACE FUNCTION calculate_user_performance(
    p_user_id UUID,
    p_period_start DATE DEFAULT NULL,
    p_period_end DATE DEFAULT NULL
) RETURNS TABLE(
    return_percent DECIMAL,
    win_rate DECIMAL,
    total_trades INTEGER,
    sharpe_ratio DECIMAL
) AS $$
BEGIN
    IF p_period_start IS NULL THEN
        p_period_start := DATE_TRUNC('month', NOW())::DATE;
    END IF;
    
    IF p_period_end IS NULL THEN
        p_period_end := NOW()::DATE;
    END IF;
    
    RETURN QUERY
    SELECT 
        COALESCE(SUM(p.realized_percent), 0) as return_percent,
        CASE 
            WHEN COUNT(p.id) > 0 THEN 
                ROUND(COUNT(p.id) FILTER (WHERE p.realized_percent > 0) * 100.0 / COUNT(p.id), 2)
            ELSE 0
        END as win_rate,
        COUNT(p.id)::INTEGER as total_trades,
        COALESCE(
            CASE 
                WHEN STDDEV(p.realized_percent) > 0 THEN
                    AVG(p.realized_percent) / STDDEV(p.realized_percent)
                ELSE 0
            END, 0
        ) as sharpe_ratio
    FROM tradia_positions p
    WHERE p.user_id = p_user_id
      AND p.status = 'CLOSED'
      AND p.exit_time::DATE BETWEEN p_period_start AND p_period_end
      AND p.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar capital do usuário
CREATE OR REPLACE FUNCTION update_user_capital(
    p_user_id UUID,
    p_new_capital DECIMAL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE tradia_users 
    SET capital_atual = p_new_capital,
        updated_at = NOW(),
        version = version + 1
    WHERE id = p_user_id AND deleted_at IS NULL;
    
    -- Log da alteração
    INSERT INTO audit_logs (
        tenant_id, perfil, model, aplicacao, contexto,
        user_id, action, resource_type, resource_id,
        new_values, created_by
    ) SELECT 
        tenant_id, 'AUDIT', 'AuditLog', 'tradia', 'capital_update',
        p_user_id, 'UPDATE_CAPITAL', 'tradia_users', p_user_id,
        jsonb_build_object('new_capital', p_new_capital),
        p_user_id
    FROM tradia_users WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- DADOS INICIAIS TRADIA
-- ============================================================

-- Inserir sistema TRADia se não existir
INSERT INTO toit_systems (code, name, description, perfil, model, aplicacao, contexto) 
VALUES ('tradia', 'TRADia Platform', 'Plataforma de Sinais de Trading com IA', 'SISTEMA', 'ToitSystem', 'tradia', 'core')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================

-- Índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_tradia_signals_active_priority 
ON tradia_signals (status, priority, confidence) 
WHERE status = 'ACTIVE' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tradia_positions_user_open 
ON tradia_positions (user_id, status) 
WHERE status = 'OPEN' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tradia_notifications_unread 
ON tradia_notifications (user_id, read_at) 
WHERE read_at IS NULL AND deleted_at IS NULL;

-- ============================================================
-- TRIGGERS ESPECÍFICOS
-- ============================================================

-- Trigger para atualizar performance automaticamente quando posição for fechada
CREATE OR REPLACE FUNCTION update_user_performance_on_position_close()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'CLOSED' AND OLD.status != 'CLOSED' THEN
        -- Atualizar métricas do usuário
        WITH user_stats AS (
            SELECT 
                NEW.user_id,
                COUNT(*) as total_trades,
                COUNT(*) FILTER (WHERE realized_percent > 0) as winning_trades,
                AVG(realized_percent) as avg_return,
                SUM(realized_pnl) as total_pnl
            FROM tradia_positions 
            WHERE user_id = NEW.user_id 
              AND status = 'CLOSED' 
              AND deleted_at IS NULL
        )
        UPDATE tradia_users u SET
            total_return = u.total_return + NEW.realized_percent,
            win_rate = CASE 
                WHEN s.total_trades > 0 THEN 
                    ROUND(s.winning_trades * 100.0 / s.total_trades, 2)
                ELSE 0 
            END,
            capital_atual = u.capital_atual + NEW.realized_pnl,
            updated_at = NOW()
        FROM user_stats s
        WHERE u.id = s.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_performance_on_position_close
    AFTER UPDATE ON tradia_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_performance_on_position_close();

-- ============================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================

COMMENT ON TABLE tradia_users IS 'Usuários da plataforma TRADia com dados de trading';
COMMENT ON TABLE tradia_signals IS 'Sinais de trading gerados pela IA';
COMMENT ON TABLE tradia_positions IS 'Posições executadas pelos usuários';
COMMENT ON TABLE tradia_performance IS 'Métricas de performance dos usuários';
COMMENT ON TABLE tradia_notifications IS 'Notificações enviadas aos usuários';
COMMENT ON TABLE tradia_subscriptions IS 'Planos e assinaturas dos usuários';
COMMENT ON TABLE tradia_backtests IS 'Resultados de backtests das estratégias';
COMMENT ON TABLE tradia_market_data IS 'Cache de dados de mercado';

COMMENT ON COLUMN tradia_users.capital_inicial IS 'Capital inicial informado pelo usuário';
COMMENT ON COLUMN tradia_users.capital_atual IS 'Capital atual calculado baseado nas operações';
COMMENT ON COLUMN tradia_signals.confidence IS 'Nível de confiança do sinal (0-100)';
COMMENT ON COLUMN tradia_positions.position_percent IS 'Percentual do capital alocado na posição';
