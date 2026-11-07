# ESPECIFICACIÓN DE ENDPOINTS DE LA API — TURNOFLOW AI

La API sigue la convención RESTful y dispone de documentación interactiva Swagger en `/docs`.

## Autenticación y Cuentas
- `POST /api/auth/register`: Registro de nuevo administrador y organización.
- `POST /api/auth/login`: Autenticación con email/contraseña; devuelve token JWT con contexto de organización.
- `GET /api/auth/me`: Retorna los datos del usuario autenticado actual.

## Configuración Comercial y Base de Conocimiento
- `GET /api/business`: Obtiene el perfil de negocio, servicios y FAQs de la organización.
- `PUT /api/business`: Actualiza datos comerciales, horarios o políticas de cancelación.
- `POST /api/business/services`: Agrega un nuevo servicio al catálogo oficial.

## CRM de Prospectos (Leads)
- `GET /api/leads`: Lista de prospectos con soporte para filtros por estado (`NEW`, `INTERESTED`, `BOOKED`, etc.) y búsqueda por texto.
- `GET /api/leads/pending-followups`: Obtiene los prospectos que requieren recontacto (usado por n8n o triggers cron).
- `GET /api/leads/:id`: Detalle de un lead específico.
- `POST /api/leads`: Creación manual de un lead.
- `PATCH /api/leads/:id`: Actualización de estado o notas.
- `PATCH /api/leads/:id/mark-contacted`: Marca al prospecto como contactado.

## Agenda y Turnos (Appointments)
- `GET /api/appointments`: Lista de reservas de la organización.
- `POST /api/appointments/check-slot`: Verifica si un horario y servicio específico están libres en el calendario.
- `POST /api/appointments/confirm-booking`: Asienta un turno verificado en la base de datos y Google Calendar.
- `PATCH /api/appointments/:id/cancel`: Cancela un turno por solicitud del cliente.

## Conversaciones y Webhooks
- `POST /api/conversations/incoming-message`: Endpoint interno para recibir mensajes enviados desde n8n.
- `GET /api/conversations/whatsapp-webhook`: Endpoint oficial para verificación de desafío de Meta (`hub.challenge`).
- `POST /api/conversations/whatsapp-webhook`: Endpoint oficial para eventos de mensajes de WhatsApp Cloud API.
- `GET /api/conversations`: Lista de conversaciones activas.
- `GET /api/conversations/:id/messages`: Historial de mensajes de un hilo.
- `PATCH /api/conversations/:id/pause-ai`: Pausa la IA y deriva a atención humana.

## Motor de Inteligencia Artificial (Playground)
- `POST /api/ai/playground`: Endpoint para simular conversaciones con trazabilidad de herramientas.
- `POST /api/ai/classify-lead`: Ejecuta el agente clasificador sobre un mensaje específico.
- `GET /api/ai/scenarios`: Devuelve los escenarios de prueba predefinidos.

## Integraciones y Automatizaciones
- `GET /api/integrations/status`: Consulta el estado de conexión de WhatsApp, Google Calendar y n8n.
- `GET /api/automations`: Consulta el estado de los 5 flujos n8n.
- `PATCH /api/automations/:id/toggle`: Activa o pausa un flujo.

## Órdenes y Provisión Digital (Checkout & Fulfillment)
- `POST /api/orders/checkout-session`: Crea sesión de compra, registra la orden y emite un `downloadToken` criptográfico seguro.
- `GET /api/orders/verify-download/:token`: Valida existencia del token y límite de descargas (< 10), transmitiendo de forma segura el kit digital `TurnoFlow-AI-Complete.zip`.

## Distribución y Exportación
- `GET /api/export/manifest`: Manifiesto de versión y contenidos del paquete descargable.
- `GET /api/export/download-kit`: Descarga directa del archivo `TurnoFlow-AI-Complete.zip`.
