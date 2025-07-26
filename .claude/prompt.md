# PROMPT PARA IA - GESTÃO DE CLAUDE.md

## 🤖 INSTRUÇÕES OBRIGATÓRIAS PARA IA

### PROTOCOLO DE ATUALIZAÇÃO AUTOMÁTICA

**ANTES DE QUALQUER AÇÃO:**
1. **LER** o arquivo CLAUDE.md atual
2. **IDENTIFICAR** módulos que serão afetados pela mudança
3. **ANALISAR** impacto global nas regras de negócio
4. **VERIFICAR** dependências que podem quebrar
5. **PLANEJAR** todas as alterações necessárias
6. **EXECUTAR** mudanças de forma coordenada
7. **ATUALIZAR** CLAUDE.md IMEDIATAMENTE

### TRIGGERS OBRIGATÓRIOS PARA ATUALIZAÇÃO

**A CADA MUDANÇA SIGNIFICATIVA:**
- ✅ Edição de arquivos → Atualizar módulo correspondente
- ✅ Nova funcionalidade → Verificar dependências + regras
- ✅ Alteração BD → Atualizar esquema + módulos relacionados
- ✅ Novo endpoint → Atualizar APIs consolidadas
- ✅ Mudança regra negócio → Verificar impacto global
- ✅ Bug encontrado → Adicionar ao contexto crítico
- ✅ Decisão técnica → Documentar em decisões arquiteturais

### ANÁLISE DE IMPACTO OBRIGATÓRIA

**PERGUNTA OBRIGATÓRIA ANTES DE CADA MUDANÇA:**
```
1. Que módulos serão afetados por esta mudança?
2. Que regras de negócio podem ser impactadas?
3. Que dependências podem quebrar?
4. Que outras alterações são necessárias?
5. Como isso afeta o roadmap atual?
```

### ESTRUTURA DE RESPOSTA PADRÃO

**SEMPRE RESPONDER:**
```
📊 ANÁLISE DE IMPACTO:
- Módulos afetados: [lista]
- Regras impactadas: [lista]
- Dependências: [lista]
- Alterações necessárias: [lista]

🚀 PLANO DE EXECUÇÃO:
1. [ação_1]
2. [ação_2]
3. [ação_3]

⚠️ RISCOS IDENTIFICADOS:
- [risco_1]
- [risco_2]
```

### REGRAS DE OURO

1. **NUNCA** implementar sem analisar impacto global
2. **SEMPRE** atualizar CLAUDE.md na mesma sessão
3. **JAMAIS** repetir informações já documentadas
4. **SEMPRE** evoluir informações existentes
5. **OBRIGATÓRIO** incrementar versão a cada mudança
6. **CRÍTICO** manter histórico de evolução
7. **ESSENCIAL** documentar decisões arquiteturais

### FORMATO DE VERSIONING

```
vX.Y.Z onde:
X = Mudança arquitetural major
Y = Nova funcionalidade ou módulo
Z = Correção, melhoria ou atualização menor
```

### TEMPLATE DE ATUALIZAÇÃO

**SEMPRE USAR:**
```
📝 ATUALIZAÇÃO CLAUDE.md:
- Versão: v[X.Y.Z]
- Data: [YYYY-MM-DD HH:MM]
- Mudança: [descrição_breve]
- Módulos: [lista_módulos_afetados]
- Impacto: [análise_impacto]
```

---

## 🎯 EXEMPLO DE FLUXO CORRETO

### Solicitação: "Implementar backend Express para substituir PHP"

**1. ANÁLISE DE IMPACTO:**
- Módulos afetados: AUTH, PORTAL_BLUEWORLD, LANDING_EASIS, Backend (novo)
- Regras impactadas: RN_001 (Auth CPF), RN_002 (Leads), RN_004 (Deploy)
- Dependências: Frontend login.html, portal redirecionamento, MySQL → PostgreSQL
- Alterações necessárias: Express setup, JWT auth, API endpoints, hash senhas

**2. PLANO DE EXECUÇÃO:**
1. Criar estrutura Backend/ com Express + PostgreSQL
2. Implementar auth JWT substituindo login.php  
3. Criar endpoints API (/auth, /dashboard, /contact)
4. Migrar dados MySQL → PostgreSQL
5. Atualizar frontend para consumir API
6. Configurar Railway para novo backend

**3. ATUALIZAÇÃO claude-project.md:**
```
v1.4.0 - 2025-07-21 - Backend Express implementado
- Backend/: Status vazio → 🟢 (Express + PostgreSQL + JWT)
- MOD_002: AUTH Status 🟡 → 🟢 (PHP eliminado, JWT seguro)
- Segurança: Senhas hash bcrypt implementado
- API: 8 endpoints REST funcionais
- Deploy: Railway backend ativo
```

---

## ⚠️ ALERTAS CRÍTICOS

### NÃO FAZER:
- ❌ Implementar sem análise prévia
- ❌ Atualizar CLAUDE.md apenas no final
- ❌ Repetir informações já documentadas
- ❌ Esquecer de incrementar versão
- ❌ Não documentar decisões técnicas

### FAZER SEMPRE:
- ✅ Analisar impacto global ANTES
- ✅ Atualizar CLAUDE.md A CADA mudança
- ✅ Evoluir informações existentes
- ✅ Incrementar versão adequadamente
- ✅ Documentar contexto crítico

---

**LEMBRETE:** O sucesso do projeto depende da disciplina na documentação viva e análise de impacto!
