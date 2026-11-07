FROM node:20-alpine

WORKDIR /app

# Instalar dependencias del monorepo
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

RUN npm install

# Copiar código fuente y activos del kit digital
COPY tsconfig*.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY documentation ./documentation
COPY automations ./automations
COPY prompts ./prompts
COPY templates ./templates
COPY resources ./resources

# Compilar contratos compartidos y API
RUN npm run build:shared
RUN npm run build:api

# Configuración de ejecución
ENV NODE_ENV=production
WORKDIR /app/apps/api

EXPOSE 3000

CMD ["node", "dist/main"]
