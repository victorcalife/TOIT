# 🚀 SETUP E TESTE - SISTEMA SSO PORTAL TOIT

## 📋 PRÉ-REQUISITOS

### 🛠️ Softwares Necessários
- **Node.js** 18+ 
- **PostgreSQL** 14+
- **Redis** 6+
- **Git**

### 🔧 Instalação dos Pré-requisitos (Windows)

```bash
# PostgreSQL
# Baixar e instalar: https://www.postgresql.org/download/windows/

# Redis (usando Docker)
docker run -d --name redis -p 6379:6379 redis:alpine

# OU Redis nativo Windows
# Baixar: https://github.com/tporadowski/redis/releases
```

---

## ⚙️ CONFIGURAÇÃO DO AMBIENTE

### 1. 🔧 Setup do Backend

```bash
cd "C:\Users\victo\Desktop\Dodumentos Pessoais\Victor\TOIT\SISTEMAS\portal-toit\backend"

# Instalar dependências
npm install

# Criar arquivo .env
cp .env.example .env
```

### 2. 📝 Configurar .env

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/toit_portal
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=123456
DB_NAME=toit_portal

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=toit-super-secret-jwt-key-2025-very-long-and-secure
JWT_REFRESH_SECRET=toit-refresh-secret-key-2025-also-very-long-and-secure

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. 🗄️ Setup do Banco de Dados

```bash
# Conectar no PostgreSQL
psql -U postgres

# Criar database
CREATE DATABASE toit_portal;
\c toit_portal

# Executar schema padrão
\i src/database/schema-padrao.sql
```

### 4. ▶️ Iniciar Backend

```bash
npm run dev
```

**Servidor rodando em:** `http://localhost:3001`

---

## 🧪 TESTANDO O SISTEMA SSO

### 1. 🔑 Teste de Login

#### Acessar Página de Login
```
http://localhost:3001/login
```

#### Credenciais de Teste (Blue World)
```
Tenant: blueworld (auto-detectado)
CPF: 123.456.789-00
Senha: 123456
```

### 2. 📡 Teste das APIs

#### Health Check
```bash
curl http://localhost:3001/api/auth/health
```

#### Login via API
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: blueworld" \
  -d '{
    "cpf": "12345678900",
    "password": "123456"
  }'
```

#### Verificar Token
```bash
# Substituir TOKEN_AQUI pelo token recebido
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer TOKEN_AQUI"
```

### 3. 🖥️ Teste do Frontend

#### Página de Login
- ✅ Interface moderna carrega
- ✅ Seleção CPF/Email funciona
- ✅ Máscara CPF aplicada
- ✅ Validação de campos
- ✅ Loading state durante login

#### Fluxo Completo
1. **Acesso:** `http://localhost:3001/login`
2. **Login:** CPF `123.456.789-00` + senha `123456`
3. **Sucesso:** Redirecionamento para `/portal/blueworld`
4. **Token:** Salvo em cookie `toit_access_token`

---

## 🔍 DEBUGGING E LOGS

### 1. 📊 Monitorar Logs

```bash
# Backend logs
npm run dev

# Redis logs (se usando Docker)
docker logs redis

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-14-main.log
```

### 2. 🔧 Verificar Estado

#### Redis Sessions
```bash
redis-cli
KEYS "session:*"
GET "session:UUID_DA_SESSAO"
```

#### PostgreSQL
```sql
-- Verificar tenants
SELECT * FROM tenants;

-- Verificar usuários
SELECT * FROM users;

-- Verificar sistemas
SELECT * FROM toit_systems;

-- Verificar logs de auditoria
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

### 3. 🚨 Troubleshooting

#### Erro "Database connection failed"
```bash
# Verificar se PostgreSQL está rodando
pg_isready -h localhost -p 5432

# Verificar permissões do usuário
psql -U postgres -c "SELECT current_user;"
```

#### Erro "Redis connection failed"
```bash
# Verificar Redis
redis-cli ping
# Resposta esperada: PONG
```

#### Erro "JWT Secret not found"
```bash
# Verificar se .env existe e tem as variáveis
cat .env | grep JWT_SECRET
```

---

## 🧪 TESTES AUTOMATIZADOS

### 1. 🧪 Criar Testes

```typescript
// tests/auth.test.ts
describe('Sistema SSO', () => {
  test('Login com CPF deve funcionar', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        cpf: '12345678900',
        password: '123456',
        tenant_slug: 'blueworld'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });
  
  test('Token JWT deve conter contexto multi-tenant', async () => {
    // ... teste de validação do token
  });
});
```

### 2. ▶️ Executar Testes

```bash
npm test
```

---

## 🌐 INTEGRAÇÃO COM OMS BLUE WORLD

### 1. 🔗 Preparar OMS para SSO

#### Adicionar Middleware SSO no OMS
```typescript
// oms-blueworld/backend/middleware/sso.ts
import { ssoMiddleware } from '@toit/portal-backend';

export const omsAuth = ssoMiddleware('oms');

// Aplicar em todas as rotas
app.use('/api', omsAuth);
```

#### Página de Login no OMS
```html
<!-- oms-blueworld/frontend/login.html -->
<!-- Redirecionar para Portal TOIT -->
<script>
  const returnUrl = encodeURIComponent(window.location.href);
  window.location.href = `http://localhost:3001/login?returnUrl=${returnUrl}`;
</script>
```

### 2. 🔄 Fluxo SSO OMS

1. **Usuário acessa OMS:** `oms.blueworld.com`
2. **OMS verifica auth:** Sem token válido
3. **Redirect para Portal:** `portal.toit.com/login?returnUrl=...`
4. **Login no Portal:** Usuário faz login
5. **Redirect de volta:** Com token JWT no cookie
6. **OMS valida token:** Via middleware SSO
7. **Acesso liberado:** Usuário entra no OMS

---

## 📊 DASHBOARD DE MONITORAMENTO

### 1. 🔍 Sessions Ativas

```sql
-- Buscar sessões ativas
SELECT 
    s.session_id,
    u.name,
    t.name as tenant,
    s.ip_address,
    s.last_activity
FROM sessions s
JOIN users u ON s.user_id = u.id
JOIN tenants t ON u.tenant_id = t.id
WHERE s.expires_at > NOW()
ORDER BY s.last_activity DESC;
```

### 2. 📈 Métricas de Uso

```sql
-- Logins por dia
SELECT 
    DATE(created_at) as dia,
    COUNT(*) as logins
FROM audit_logs 
WHERE action = 'LOGIN'
    AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY dia DESC;
```

---

## 🔒 SEGURANÇA

### 1. ✅ Checklist de Segurança

- [x] JWT tokens com expiração (8h)
- [x] Refresh tokens HttpOnly (30 dias)
- [x] CSRF protection via SameSite cookies
- [x] Rate limiting (100 req/15min)
- [x] Password hashing com bcrypt
- [x] Session revocation no logout
- [x] Audit log de todas as ações
- [x] IP address tracking
- [x] Input validation e sanitização

### 2. 🛡️ Configurações de Produção

```env
# .env.production
NODE_ENV=production
JWT_SECRET=MUITO-MAIS-SEGURO-E-LONGO-EM-PRODUCAO
REDIS_URL=rediss://usuario:senha@redis-server:6380
DATABASE_URL=postgresql://user:pass@db-server:5432/toit_prod

# CORS restritivo
CORS_ORIGIN=https://blueworld.toit.com,https://portal.toit.com

# SSL obrigatório
FORCE_HTTPS=true
SECURE_COOKIES=true
```

---

## 🚀 DEPLOY

### 1. 🐳 Docker (Opcional)

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

### 2. ☁️ Railway Deploy

```bash
# railway.toml já configurado no projeto
railway login
railway link
railway deploy
```

---

## ✅ CHECKLIST FINAL

### 📋 Pré-Deploy
- [ ] Testes passando
- [ ] .env.production configurado
- [ ] Banco de dados criado
- [ ] Redis configurado
- [ ] SSL certificates
- [ ] DNS apontando corretamente

### 🔧 Pós-Deploy
- [ ] Health checks funcionando
- [ ] Login testado em produção
- [ ] Logs sendo coletados
- [ ] Monitoring ativo
- [ ] Backup automatizado

---

## 🆘 SUPORTE

### 📞 Contatos
- **Dev Team:** dev@toit.com
- **Infrastructure:** ops@toit.com
- **Emergência:** +55 11 9999-9999

### 📚 Documentação
- **Arquitetura:** `/DOCS/ARQUITETURA_MULTITENANT_TOIT.md`
- **SSO Detalhado:** `/DOCS/SISTEMA_SSO_PORTAL_TOIT.md`
- **Schema DB:** `/backend/src/database/schema-padrao.sql`

---

**🎯 Sistema SSO TOIT implementado com sucesso!**

*Login único para todo o ecossistema Blue World → OMS, Portal, Tradia, Easis ERP*