# Backend TRADia

API Express para autenticação, cadastro, login, integração Stripe, e gerenciamento de usuários.

## Scripts

- `npm run dev` - Inicia em modo desenvolvimento
- `npm run build` - Compila TypeScript para produção
- `npm start` - Inicia servidor em produção

## Variáveis de ambiente

Veja `.env.example` para configuração.

## Endpoints principais

- `/register` - Cadastro completo
- `/login` - Login por CPF, email ou telefone
- `/subscription` - Consulta assinatura

## Testes

- `npm run test` - Executa testes automatizados

## Deploy

Utilize Dockerfile e workflow CI/CD para deploy automático Railway.
