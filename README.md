# TurnoFlow AI — Recepción Inteligente 24/7 🚀

Plataforma integral SaaS y Kit de Implementación Digital para centros de estética, salones de belleza, estudios de uñas y profesionales independientes.

TurnoFlow AI automatiza la recepción de consultas en WhatsApp, califica prospectos comerciales, coordina reservas verificando disponibilidad real en Google Calendar y realiza seguimientos respetuosos sin intervención humana constante.

---

## 💎 Propuesta de Valor y Modelo Comercial
- **Precio Comercial de Referencia:** USD 49 (Pago único por el kit de implementación y código fuente completo).
- **Sin Dependencias Ocultas:** El comprador es dueño de su infraestructura y configura sus propias cuentas en Meta WhatsApp Cloud API, Anthropic / OpenAI y Google Cloud Platform, asumiendo únicamente sus costes reales por consumo directo.

---

## 🏗️ Arquitectura y Componentes
El producto se divide en dos grandes bloques dentro de `/product`:

```text
/product
├── apps/
│   ├── api/            # Backend NestJS, PostgreSQL/TypeORM, orquestador de agentes y webhooks
│   └── client/         # Panel de control Expo / React Native Web (Linear SaaS aesthetic)
├── packages/
│   └── shared/         # Tipos, enums y esquemas Zod compartidos
├── automations/        # 5 Workflows oficiales para n8n (JSON descargable)
├── prompts/            # Prompts blindados para los 5 agentes especializados
├── templates/          # Plantillas CSV modelo (servicios, configuración, FAQs, leads)
├── resources/          # Checklists de pre-instalación, seguridad y biblioteca de mensajes
├── documentation/      # 13 Manuales paso a paso de implementación (START-HERE.md)
├── scripts/            # Scripts de exportación y sembrado de datos
└── dist/               # TurnoFlow-AI-Complete.zip listo para entrega comercial
```

---

## ⚡ Inicio Rápido (Desarrollo Local)

### 1. Requisitos
- Node.js v20+ o v24+
- npm v10+
- Docker y Docker Compose (opcional para PostgreSQL y n8n)

### 2. Instalación y Construcción
```bash
# Desde la carpeta /product
npm install
npm run build:shared
npm run build:api
```

### 3. Sembrado de Base de Datos y Demo
```bash
npm run seed --workspace=@turnoflow/api
```
Esto inicializará la base de datos (SQLite local o PostgreSQL) con:
- Organización demo: *TurnoFlow Beauty Studio*
- Usuario admin: `admin@turnoflow.com` / `TurnoFlow2026!`
- Catálogo de 5 servicios estéticos con precios oficiales.
- 5 Agentes de IA configurados.
- 5 Workflows de automatización inicializados.

### 4. Ejecutar el Backend NestJS
```bash
npm run start:dev --workspace=@turnoflow/api
```
- API REST: `http://localhost:3000/api`
- Swagger / OpenAPI Docs: `http://localhost:3000/docs`

### 5. Ejecutar el Panel Expo Web
```bash
npm run web --workspace=@turnoflow/client
```
Abre en tu navegador `http://localhost:8081` para interactuar con el Dashboard, CRM, Agenda y Playground de IA.

### 6. Ejecutar la Suite de Pruebas Automatizadas
```bash
npm run test --workspace=@turnoflow/api
```
Ejecuta 12 pruebas automatizadas sin coste de tokens (utiliza el adaptador `MockAiProvider`), verificando:
- Cotización exacta contra el catálogo (Grounding).
- Rechazo de intentos de regateo y ofertas falsas.
- Detección de síntomas médicos y derivación humana obligatoria.
- Clasificación estructurada JSON de leads.
- Aislamiento estricto multi-tenant entre organizaciones.
- Idempotencia y descarte de mensajes de WhatsApp duplicados.
- Verificación criptográfica HMAC-SHA256 de webhooks de Meta.

### 7. Generar el ZIP de Distribución Digital
```bash
npm run export:dist
```
Genera `dist/TurnoFlow-AI-Complete.zip` libre de secretos y listo para descarga de compradores.

---

## 📚 Documentación Técnica Detallada
- [`ARCHITECTURE.md`](./ARCHITECTURE.md): Diagramas de flujo y arquitectura interna.
- [`API.md`](./API.md): Especificación de endpoints y contratos REST.
- [`AI-AGENTS.md`](./AI-AGENTS.md): Detalle de los 5 agentes especializados y tool-calling.
- [`N8N-WORKFLOWS.md`](./N8N-WORKFLOWS.md): Manual de importación y topología de nodos n8n.
- [`SECURITY.md`](./SECURITY.md): Políticas de seguridad, aislamiento multi-tenant y guardrails.
- [`DEPLOYMENT.md`](./DEPLOYMENT.md): Guía de despliegue en Docker, VPS y Cloud.
- [`documentation/START-HERE.md`](./documentation/START-HERE.md): Manual para el comprador del producto.
