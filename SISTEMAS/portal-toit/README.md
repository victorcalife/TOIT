# Portal TOIT

Portal principal da empresa TOIT - The One in Tech.

## 📋 Descrição

Portal empresarial que concentra:
- Autenticação centralizada
- Dashboard principal
- Acesso às soluções TOIT
- Gestão de usuários e perfis

## 🏗️ Estrutura

```
portal/
├── frontend/          # React application
├── backend/           # Express API  
├── docs/              # Documentação específica
└── package.json       # Configurações do app
```

## 🚀 Desenvolvimento

```bash
# Desenvolvimento completo (frontend + backend)
npm run dev

# Apenas frontend
npm run dev:frontend

# Apenas backend  
npm run dev:backend

# Build para produção
npm run build

# Testes
npm run test

# Lint
npm run lint
```

## 🔗 Dependências

- **@toit/ui-components:** Componentes reutilizáveis
- **@toit/design-system:** Sistema de design TOIT
- **@toit/auth-lib:** Biblioteca de autenticação
- **@toit/utils:** Utilitários compartilhados

## 📊 Status

- **Frontend:** ✅ HTML/CSS completo → Migrar para React
- **Backend:** ⏳ Express planejado
- **Autenticação:** ⚠️ PHP temporário → Migrar para JWT
- **Deploy:** Railway configurado

## 🎯 Próximos Passos

1. Migrar frontend HTML para React
2. Implementar backend Express
3. Integrar autenticação JWT
4. Aplicar design system TOIT