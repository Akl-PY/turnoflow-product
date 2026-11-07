# POLÍTICAS DE SEGURIDAD Y PRIVACIDAD — TURNOFLOW AI

TurnoFlow AI implementa una postura de seguridad por diseño (Security by Design):

---

## 1. Aislamiento Multi-Tenant y Prevención de Fugas de Datos
- Todas las consultas a la base de datos se ejecutan dentro del contexto del `organizationId` extraído del token JWT criptográfico.
- Las rutas de mutación (`/api/leads/:id`, `/api/appointments/:id`) validan que el recurso pertenezca estrictamente a la organización del usuario solicitante, impidiendo vulnerabilidades de referencia directa insegura a objetos (IDOR).

---

## 2. Protección Criptográfica de Webhooks
- Los webhooks de Meta WhatsApp Cloud API son verificados mediante firma HMAC-SHA256 (`X-Hub-Signature-256`) utilizando comparación de tiempo constante (`crypto.timingSafeEqual`) para neutralizar ataques de temporización (timing attacks).
- Se implementa verificación de longitud de buffers previa a la comparación criptográfica.
- Idempotencia estricta para descartar mensajes reintentados por Meta.

---

## 3. Mitigación de Prompt Injection y Jailbreaks
- El Agente Supervisor analiza el texto del usuario antes de invocar los modelos de lenguaje, descartando patrones de anulación de instrucciones ("ignore previous instructions", "reveal system prompt", "DAN mode").
- Tool Calling con listas blancas explícitas (`allowedTools`): un agente no puede invocar herramientas fuera de sus permisos asignados.

---

## 4. Grounding y Bloqueo de Alucinaciones Financieras
- Los precios mencionados por los agentes deben provenir exclusivamente de herramientas que consultan la tabla oficial de servicios del negocio (`get_service_price`).
- El Agente Supervisor intercepta cualquier respuesta saliente que intente cotizar tarifas ficticias o descuentos arbitrarios no autorizados.

---

## 5. Cero Secretos en el Frontend
- Ninguna API Key de Anthropic, OpenAI, Meta o credencial de Google se expone en la aplicación cliente Expo.
- La comunicación entre el frontend y los modelos de IA se realiza exclusivamente a través de los endpoints autenticados del backend NestJS.
