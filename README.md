Portal TOIT
Este repositório é um monorepo contendo o backend (Node.js/Express) e o frontend (React) do Portal TOIT, com suporte a múltiplos ambientes (dev, qualidade, produção) e deploy automatizado na Railway.

Estrutura do Projeto
/
├── backend/
│   ├── src/
│   ├── package.json
│   └── ...
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
├── .github/
│   └── workflows/
│       └── ci-cd.yml
├── README.md
└── .gitignore


Ambientes
Dev: branch dev, ambiente Railway dev, banco dev
Qualidade: branch qualidade, ambiente Railway qualidade, banco qualidade
Produção: branch main, ambiente Railway produção, banco produção
Cada ambiente tem seu próprio arquivo .env (ou variáveis configuradas na Railway).

Como funciona o fluxo
Desenvolva na branch dev.
Teste e aprove na branch qualidade.
Faça merge para main para produção.
Deploy
Deploy automático via GitHub Actions para cada ambiente.
Cada ambiente Railway aponta para uma branch específica.
Variáveis de ambiente
backend/.env.example
frontend/.env.example
Banco de dados
1 banco para produção
1 banco para dev/qualidade (ou 1 para cada, se desejar)