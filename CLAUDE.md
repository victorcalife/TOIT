# 🧠 CLAUDE MEMORY - TOIT ENTERPRISE PLATFORM

# CLAUDE-Standard.md

**Template Base para Novos Projetos**  
**Documentação Técnica, Processual e Histórica Consolidada**

---
**INTEREAÇÕES SEMPRE NO IDIOMA PORTUGUÊS**
**CASO EXISTA CI-CD É OBRIGATÓRIO GARANTIR E SEGUIR WORKFLOW A RISCA**
**AO COMANDO PUSH, REALIZE PUSH COMPLETO (GITHUB) CONFORME NECESSIDADE DAS ALTERAÇÕES REALIZADAS**
**É PROIBIDO ALTERAR NOMENCLATURAS INCLUISIVE MUDAR LETRAS MINÚSCULAS PARA MAIÚSCULAS OU MAIÚSCULAS PARA MINÚSCULAS**
**NUNCA ALTERE NADA QUE NÃO FOI SOLICITADO!!! CASO TENHA ALGUMA ALTERAÇÃO DE MELHORIA, SUGERIR E AGUARDAR DECISÃO**

## ⚠️ PROTOCOLO OBRIGATÓRIO - SEMPRE LEIA PRIMEIRO - OBRIGATÓRIO SIGNIFICA 100% DAS VEZES - REGRAS INCREBÁVEIS E OBRIGATÓRIAS

**ANTES DE QUALQUER AÇÃO:**
1. **IDIOMA**: SEMPRE responder e comunicar em português brasileiro (pt-BR)
2. **SEMPRE** criar e manter lista de acompanhamento de tarefas (TodoWrite)
3. **JAMAIS** implemente funcionalidades já existentes (consultar seção STATUS FUNCIONALIDADES)
4. **SEMPRE** preservar funcionalidades operacionais
5. **RESPEITAR** hierarquia de permissões do sistema
6. **SEGUIR** padrões de nomenclatura estabelecidos
7. **MANTER** este arquivo sempre atualizado com mudanças
8. **SEMPRE** atualizar este arquivo com regras de negócio, fluxos e processos operacionais
9. **SEMPRE** considerar, manter e atualizar todas as funcionalidades e seus relacionamentos mantendo clareza no entendimento sobre o projeto de forma global, garantindo análise, revisão e tomada de decisões baseadas no contexto global de processos e objetivos do projeto
10. **SEMPRE** que tiver dúvidas ou mais de um caminho a seguir no fluxo, tomar a decisão em conjunto comigo para definirmos cada caminho a seguir
11. **NUNCA** ALTERAR NOMENCLATURAS INCLUISIVE MUDAR LETRAS MINÚSCULAS PARA MAIÚSCULAS OU MAIÚSCULAS PARA MINÚSCULAS
12. **NUNCA** ALTERE NADA QUE NÃO FOI SOLICITADO!!! CASO TENHA ALGUMA ALTERAÇÃO DE MELHORIA, SUGERIR E AGUARDAR DECISÃO
13. **SEMPRE** Implemente uma solução do início ao final (processo end-to-end), garantindo funcionamento entre todos os arquivos necessários durante o desenvolvimento. 
14. **SEMPRE** Popular este arquivo ao final da codificação com a cadeia de relacionamento com outros arquivos
15. **SEMPRE** Popular este arquivo ao final da codificação com as variáveis e constantes criadas em cada arquivo
16. **SEMPRE** Priorize criar funções em arquivos distintos para que possam ser utilizados e chamados em arquivos que serão criados futuramente

## 🤖 PROTOCOLO DE ATUALIZAÇÃO AUTOMÁTICA DO CLAUDE.md

**TRIGGERS OBRIGATÓRIOS PARA ATUALIZAÇÃO:**
### 🔄 A CADA INTERAÇÃO - ATUALIZAÇÃO CONTÍNUA E IMEDIATA:

1. **AVALIAR IMPACTO:** Analisar se a mudança afeta:
   - Status de funcionalidades (seção STATUS ATUAL)
   - Regras de negócio ou processos operacionais
   - Arquitetura técnica ou dependências
   - Problemas conhecidos ou soluções
   - Próximas ações prioritárias
   - Analisar a cadeia como um todo, avaliando todos os arquivos que precisarão ser alterados para eficiência da tarefa solicitada
   - Implemente as alterações de código em todos os arquivos necessários para garantir o funcionamento da solução

2. **ATUALIZAR SEÇÕES RELEVANTES:**
   - ✅ **STATUS ATUAL**: Atualizar percentual e status de funcionalidades
   - 📊 **INFORMAÇÕES DO PROJETO**: Data da última atualização
   - 🚨 **PROBLEMAS CONHECIDOS**: Adicionar/resolver/atualizar problemas
   - 🎯 **PRÓXIMAS AÇÕES**: Mover itens entre pendente/progresso/concluído
   - 📈 **HISTÓRICO DE SESSÕES**: Documentar sessão atual quando relevante
   - 🔧 **COMANDOS**: Adicionar novos comandos descobertos/criados

3. **DOCUMENTAR MUDANÇAS:**
   - Registrar commits realizados
   - Documentar soluções implementadas
   - Atualizar dependências ou configurações
   - Registrar decisões técnicas tomadas

4. **VALIDAR CONSISTÊNCIA:**
   - Verificar se informações estão atualizadas
   - Confirmar se status reflete realidade atual
   - Validar se próximas ações fazem sentido
   - Checar se histórico está completo

**MOMENTO DA ATUALIZAÇÃO:**
- 🔥 **A CADA INTERAÇÃO** - Nunca aguardar fim de sessão
- ✅ **IMEDIATAMENTE** após qualquer mudança, por menor que seja
- ✅ **OBRIGATÓRIO** durante a resolução de problemas (não apenas ao final)
- ✅ **AUTOMÁTICO** ao descobrir qualquer nova informação
- ⚠️ **CRÍTICO:** Evitar perda de progresso entre sessões - atualizar SEMPRE

**CRITÉRIO "MUDANÇA SIGNIFICATIVA" (QUALQUER ITEM EXIGE ATUALIZAÇÃO):**
- ✅ Leitura de arquivos para entender estado atual
- ✅ Correção de bugs ou problemas (mesmo parciais)
- ✅ Implementação de funcionalidades (mesmo incompletas)
- ✅ Alteração em arquivos de configuração
- ✅ Deploy ou commits realizados
- ✅ Descoberta de novos problemas ou limitações
- ✅ Mudança em status de funcionalidades
- ✅ Alteração em processos ou regras de negócio
- ✅ Configuração de novas dependências/APIs
- ✅ Identificação de novos requisitos ou tarefas
- ✅ Análise de código ou arquitetura
- ✅ Teste de funcionalidades
- ⚠️ **REGRA:** Se duvidou se deve atualizar = DEVE ATUALIZAR

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