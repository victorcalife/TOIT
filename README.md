# 🚀 TOIT Site Backend

Backend épico para captação de leads e contatos do site institucional.

## 🎯 Features
- 📧 Sistema de leads com email automático
- 📞 Contatos categorizados por urgência  
- 🛡️ Rate limiting e segurança
- 🚂 Deploy Railway otimizado

## 🚂 Railway Config
- **Root:** `SITE/backend`
- **Build:** `npm install && npm run build`
- **Start:** `npm start`

## 📡 Endpoints
- `GET /health` - Health check
- `POST /api/leads` - Criar lead
- `POST /api/contact` - Enviar contato
- `POST /api/contact/demo` - Solicitar demo

## 🔧 Development
```bash
cd SITE/backend
npm install
npm run dev
```

**🧠 TOIT - The One in Tech**