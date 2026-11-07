# LISTA DE VERIFICACIÓN DE INSTALACIÓN — TURNOFLOW AI

Utiliza este checklist antes de iniciar la puesta en marcha técnica:

## 1. Requisitos Previos de Infraestructura
- [ ] Node.js v20+ o v22+ LTS instalado en el entorno o servidor.
- [ ] Docker y Docker Compose instalados si se desplegará mediante contenedores.
- [ ] Instancia de PostgreSQL 15+ activa con credenciales de base de datos.
- [ ] Servidor n8n (Community self-hosted o n8n Cloud) accesible vía HTTPS.

## 2. Cuentas y Credenciales de Servicios Externos
- [ ] Cuenta de Meta for Developers creada y app de WhatsApp Cloud API configurada.
- [ ] Número de teléfono empresarial verificado en Meta Business Manager.
- [ ] Token permanente de WhatsApp Cloud API generado y guardado de forma segura.
- [ ] Cuenta de proveedor de IA con saldo activo:
  - Anthropic API Key (Claude 3.5 Sonnet / Haiku), o
  - OpenAI API Key (GPT-4o / GPT-4o-mini).
- [ ] Proyecto de Google Cloud Platform con APIs de Google Calendar y Google Sheets habilitadas.
- [ ] Credenciales OAuth 2.0 o Service Account de Google descargadas en formato seguro.

## 3. Configuración de Variables de Entorno
- [ ] Archivo `.env` creado a partir de `.env.example` en `/product/apps/api`.
- [ ] Clave de seguridad `JWT_SECRET` generada con al menos 32 caracteres criptográficos.
- [ ] Clave de webhook `TURNOFLOW_API_KEY` compartida entre n8n y la API de TurnoFlow.
- [ ] `AI_PROVIDER` configurado (`anthropic` u `openai`) junto con su API Key correspondiente.

## 4. Ejecución de Migraciones y Sembrado de Datos
- [ ] Ejecutar `npm run build` en el workspace.
- [ ] Ejecutar las migraciones de TypeORM para inicializar las tablas de PostgreSQL.
- [ ] Sembrar los datos base con `npm run seed` para crear la organización inicial y agentes.

## 5. Importación de Flujos n8n
- [ ] Importar `incoming-messages.json` y activar webhook.
- [ ] Importar `lead-management.json`.
- [ ] Importar `follow-up.json` y revisar programación del Trigger Cron.
- [ ] Importar `booking-management.json`.
- [ ] Importar `human-handoff.json`.
- [ ] Probar conexión de prueba enviando un webhook de ping.
