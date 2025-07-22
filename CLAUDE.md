# 🧠 CLAUDE MEMORY - TOIT ENTERPRISE PLATFORM

## 🎯 CONTEXTO DO PROJETO

**TOIT (The One in Tech)** é uma plataforma empresarial que agrega múltiplos sistemas:
- **Portal TOIT:** Gateway SSO centralizando autenticação
- **OMS Blue World:** Sistema de gestão de ordens de serviço (já desenvolvido)
- **Tradia:** Plataforma de trading com IA
- **Easis ERP:** Sistema ERP empresarial

## 🏗️ ARQUITETURA ATUAL

### **Monorepo + Deploy Independente**
```
Repository: https://github.com/victorcalife/TOIT
Estratégia: 1 monorepo → Múltiplos serviços Railway com Root Directory específico

TOIT/
├── SISTEMAS/
│   ├── portal-toit/ (Root: SISTEMAS/portal-toit/backend|frontend)
│   ├── oms-blueworld/ (Root: SISTEMAS/oms-blueworld/backend|frontend) 
│   ├── tradia/ (Root: SISTEMAS/tradia/backend|frontend)
│   └── easis-erp/ (Root: SISTEMAS/easis-erp/backend|frontend)
```

### **Railway Deploy Strategy**
- **Branch DEV** → Ambiente DEV
- **Branch TEST** → Ambiente QUALIDADE  
- **Branch MAIN** → Ambiente PRODUÇÃO

Cada sistema tem backend + frontend como serviços separados no Railway.

## 🔐 SSO MULTI-TENANT IMPLEMENTADO

### **JWT Token Structure**
```typescript
interface ToitJWTPayload {
  user_id: string;
  tenant: {
    id: string;
    slug: string; // blueworld, tradia, easis
    name: string;
    plan: string;
  };
  systems: {
    [systemCode: string]: {
      system_id: string;
      role: string;
      permissions: string[];
    };
  };
  session_id: string;
  issued_at: number;
  expires_at: number;
}
```

### **Database Schema Padrão**
Todos os sistemas devem ter campos:
- `perfil` (VARCHAR) - Identificador do usuário/perfil
- `model` (VARCHAR) - Tipo/modelo do registro  
- `aplicacao` (VARCHAR) - Sistema de origem
- `contexto` (VARCHAR) - Contexto/tenant
- `campo1-5` (VARCHAR) - Campos flexíveis por sistema

## 📊 STATUS ATUAL

### **Portal TOIT (🔄 EM DESENVOLVIMENTO)**
**Código Status:** ✅ Implementado
- AuthService com JWT + Redis ✅
- Middleware SSO universal ✅  
- Login page moderna ✅
- Multi-tenant database schema ✅

**Deploy Status:** 🔄 Em progresso
- Railway configurado ✅
- Bancos PG + Redis criados ✅
- Problema atual: Root Directory configuration

### **OMS Blue World (⏳ AGUARDANDO SSO)**
- Sistema funcional existente
- Integração SSO pendente
- Database schema precisa ajustes para padrão TOIT

### **Tradia + Easis (🔴 PLANEJADOS)**
- Estruturas criadas no monorepo
- Desenvolvimento após Portal SSO

## ⚡ PROBLEMA ATUAL - DEPLOY

### **Issue:** Railway Nixpacks "Is a directory (os error 21)"
**Causa:** Tentativa de deploy monorepo completo na raiz  
**Solução:** Configurar Root Directory específico

**Railway Config Correto:**
```
Serviço: portal-toit-backend
Root Directory: SISTEMAS/portal-toit/backend
Build: npm install && npm run build  
Start: npm start
```

## 🚨 LIÇÕES APRENDIDAS

### **❌ Não Funciona:**
- Deploy monorepo inteiro via Turbo/Nixpacks
- Dependências @toit/* sem packages criados
- npm ci sem package-lock.json

### **✅ Funciona:**
- Root Directory específico por sistema
- npm install (gera package-lock.json)
- Estrutura independente backend/frontend

## 🔧 COMANDOS ÚTEIS

### **Git & Deploy**
```bash
# Push para dev (dispara deploy DEV)
git push origin dev

# Push para test (dispara deploy TESTE)  
git push origin test

# Push para main (dispara deploy PROD)
git push origin main
```

### **Railway CLI**
```bash
# Conectar ao projeto
railway link

# Ver logs
railway logs

# Deploy manual
railway up
```

## 📝 NEXT ACTIONS

### **Imediato (esta sessão):**
1. Configurar Railway Root Directory: `SISTEMAS/portal-toit/backend`
2. Test deploy backend
3. Configurar frontend service
4. Validar SSO funcionando

### **Esta Semana:**
1. Finalizar Portal TOIT deploy
2. Integrar OMS Blue World
3. Testes end-to-end SSO

### **Próximas Semanas:**
1. Deploy OMS nos 3 ambientes
2. Iniciar desenvolvimento Tradia
3. Documentação completa usuário final

## 🎯 ARQUITETURA IDEAL CONFIRMADA

```
GitHub Repo: victorcalife/TOIT (monorepo)
├── 3 Branches: dev, test, main
├── Railway: 1 projeto, múltiplos serviços
├── Cada sistema: 2 serviços (backend + frontend)
└── Root específico: SISTEMAS/{sistema}/{backend|frontend}
```

**Esta arquitetura permite:**
- Código centralizado ✅
- Deploy independente ✅  
- Escalabilidade ✅
- Manutenibilidade ✅

---

**🧠 Este arquivo é a memória persistente do Claude**  
**📅 Atualizado:** 22 de Julho, 2025  
**🔄 Status:** Portal TOIT deploy em progresso