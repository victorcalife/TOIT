# 🚀 TOIT - The One in Tech

**Site Institucional Épico** - Página de captação e conversão de leads

## 🎯 Propósito

Site institucional moderno e irresistível para captação de leads e showcase dos produtos TOIT:

### 🌟 Produtos Destacados
- **Portal TOIT**: Gateway SSO empresarial
- **OMS Blue World**: Gestão de ordens de serviço  
- **Trad.IA**: Sistema de trading com inteligência artificial
- **EASIS ERP**: Gestão empresarial integrada
- **GISST**: Gestão inteligente de serviços
- **ARTIC**: Análise e relatórios corporativos

## 🏗️ Arquitetura do Site

### 📁 Estrutura
```
SITE/
├── frontend/           # Site institucional estático
│   ├── index.html     # Página principal épica
│   └── assets/        # Recursos visuais
└── backend/           # API para leads e contatos
    ├── src/           # Backend TypeScript
    └── dist/          # Build compilado
```

### 🚀 Deploy Railway
- **Frontend Root**: `SITE/frontend`
- **Backend Root**: `SITE/backend`
- **Domain**: toit.com.br → Frontend estático

## 🎨 Features Implementadas

### ✅ Frontend Épico
- **Neural Network Background**: Animação de rede neural conectada
- **Hero Section**: Apresentação TOIT com gradientes dimensionais
- **Product Showcase**: 6 produtos com hover effects irresistíveis  
- **CTA Buttons**: Chamadas épicas para ação (Demo, Contato)
- **Responsive Design**: Funciona em todos os dispositivos
- **Interactive Modals**: Formulários flutuantes para captação

### ✅ Backend Profissional  
- **Lead Capture API**: `/api/leads` - Captação com validação
- **Contact System**: `/api/contact` - Sistema de contatos categorizados
- **Demo Requests**: `/api/contact/demo` - Solicitações de demonstração
- **Email Integration**: Templates HTML corporativos
- **Rate Limiting**: Proteção contra spam
- **Validation**: Dados validados com express-validator

## 🌐 URLs de Produção

### 🎯 Site Principal
- **PROD**: https://toit.com.br (DNS A Record configurado)
- **Railway**: https://toitsite.up.railway.app

### 📡 API Endpoints
```
GET  /health                    # Health check
POST /api/leads                 # Criar lead
POST /api/contact               # Enviar contato  
POST /api/contact/demo          # Solicitar demo
GET  /api/contact/categories    # Listar categorias
```

## 🔧 Configuração Técnica

### 🚂 Railway Setup
```yaml
# Frontend (Estático)
Root Directory: SITE/frontend
Build Command: # Static files only
Start Command: # Serve static files

# Backend (API)
Root Directory: SITE/backend  
Build Command: npm install && npm run build
Start Command: npm start
Environment Variables:
  - NODE_ENV=production
  - SMTP_HOST=*
  - SMTP_USER=*
  - SMTP_PASS=*
```

### 🌐 DNS Hostinger
```
Type: A
Name: @
Value: [Railway Static IP]
TTL: 1 Hour
```

## 📧 Sistema de Contatos

### 📋 Categorias
- **Suporte**: toit@suporte.toit.com.br
- **Comercial**: toit@comercial.toit.com.br  
- **Parcerias**: toit@comercial.toit.com.br
- **Imprensa**: toit@comercial.toit.com.br

### ⚡ Níveis de Urgência
- **Crítica**: 1-4h resposta
- **Alta**: 4-24h resposta
- **Média**: 24-48h resposta  
- **Baixa**: 48-72h resposta

## 🎯 Formulários de Captação

### 📝 Lead Capture
- Nome, Email, Empresa, Telefone
- Produtos de interesse (múltiplos)
- Source tracking automático
- IP e User-Agent logging

### 🎬 Demo Request  
- Dados básicos + produto específico
- Tamanho da empresa
- Data/horário preferido
- Mensagem personalizada

### ✉️ Newsletter
- Email + nome opcional
- Segmentação automática
- Templates personalizados

## 🚀 Deploy Instructions

### Development
```bash
cd SITE/backend
npm install
npm run dev
```

### Production  
```bash
# Push para ativar deploy automático
git add SITE/
git commit -m "feat: Site institucional épico"
git push origin main
```

## 📊 Monitoramento

### Health Checks
- Site: https://toit.com.br
- API: https://toit.com.br/health (via Railway backend)

### Analytics
- Google Analytics (configurar)
- Lead conversion tracking
- Form submission rates
- Traffic sources

## 🛡️ Segurança

- Rate limiting (100 req/15min por IP)
- Input validation em todos os formulários
- CORS configurado
- Helmet security headers
- Email spam protection

## 📞 Dados da Empresa

### 🏢 TOIT Tecnologia
- **CNPJ**: 61.919.714/0001-92
- **Email Comercial**: toit@comercial.toit.com.br
- **Email Suporte**: toit@suporte.toit.com.br
- **Site**: https://toit.com.br

---

**🎯 TOIT - The One in Tech**  
*Transformando visões em realidade tecnológica*
