
# Etapa 1: Build do frontend
FROM node:20 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend ./
RUN npm run build



# Etapa 2: Build do backend
FROM node:20 AS backend-build
WORKDIR /app/backend
COPY backend/package.json ./
RUN npm install
COPY backend ./
RUN npm run build

# Copiar build do frontend para dentro do backend
COPY --from=frontend-build /app/frontend/public ./public

# Etapa final: rodar backend + servir frontend
EXPOSE 3002
CMD ["npm", "start"]
