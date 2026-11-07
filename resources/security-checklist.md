# GUÍA Y CHECKLIST DE SEGURIDAD — TURNOFLOW AI

La seguridad y privacidad de los datos de clientes en TurnoFlow AI se basan en una arquitectura de defensa en profundidad:

---

## 1. Aislamiento Multi-Tenant de Datos
- **Contexto de Organización Obligatorio**: Cada consulta en el backend (PostgreSQL/TypeORM) inyecta obligatoriamente `organizationId` a través de decoradores y middleware de autenticación.
- **Protección Horizontal (IDOR)**: Las rutas no permiten acceder ni modificar registros (`/api/leads/:id`, `/api/appointments/:id`) cuyo `organizationId` difiera del token del usuario solicitante.

---

## 2. Protección de Webhooks y APIs Externas
- **Firma Criptográfica SHA-256**: Todo webhook entrante de Meta WhatsApp Cloud API es verificado contra la cabecera `X-Hub-Signature-256` utilizando el `WHATSAPP_APP_SECRET`.
- **Idempotencia de Mensajes**: Cada `messageId` de Meta es indexado en caché o base de datos. Si WhatsApp reintenta una entrega duplicada dentro de los 5 minutos, la llamada se procesa de forma idempotente sin emitir respuestas repetidas al usuario.
- **Rate Limiting**: Throttling configurado en 60 peticiones por minuto por IP para prevenir ataques de denegación de servicio (DoS).

---

## 3. Gestión y Protección de Secretos
- **Cero Secretos en el Frontend**: En ningún caso se deben definir variables que comiencen con `EXPO_PUBLIC_` para almacenar API Keys de OpenAI, Claude, Meta o contraseñas de bases de datos.
- **Validación al Iniciar**: El backend de NestJS valida al arrancar mediante `Joi` o `Zod` que todas las variables mandatorias de `.env` estén presentes; de lo contrario aborta el inicio para evitar estados inconsistentes.

---

## 4. Guardrails de Modelos de IA
- **Sanitización de Inputs**: Los mensajes de usuarios se escanean buscando inyecciones de prompt (`ignore previous instructions`, `reveal system prompt`).
- **Verificación de Herramientas**: Los agentes de IA solo pueden invocar herramientas explícitamente habilitadas en su configuración de base de datos (`allowedTools`).
- **Filtro de Alucinaciones**: El Supervisor intercepta confirmaciones de reservas sin ID de cita y bloquea cotizaciones no sustentadas en la base de datos de servicios.
