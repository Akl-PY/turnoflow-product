# GUÍA DE WORKFLOWS N8N — TURNOFLOW AI

Los 5 flujos incluidos en `/product/automations/` son JSON válidos construidos con nodos estándar de n8n, testeados para operar en n8n Community y n8n Cloud.

---

## 1. `incoming-messages.json` (Recepción de Mensajes WhatsApp)
- **Trigger**: `n8n-nodes-base.webhook` (Path: `turnoflow-incoming-whatsapp`).
- **Nodos Clave**:
  - `Code Node`: Identifica solicitudes GET de Meta para responder el `hub.challenge` inmediatamente o extrae el payload del mensaje entrante.
  - `If Node`: Discrimina eventos de estado de entrega para responder HTTP 200 sin procesar.
  - `HTTP Request`: Reenvía el mensaje a la API de TurnoFlow (`/api/conversations/incoming-message`) con cabecera `X-TurnoFlow-API-Key`.
  - `Respond to Webhook`: Devuelve 200 OK a Meta en menos de 2 segundos.

---

## 2. `lead-management.json` (Captura y Clasificación de Leads)
- **Trigger**: Webhook disparado ante cada nuevo prospecto registrado.
- **Acciones**:
  - Si el lead es de prioridad `HOT`, dispara alerta urgente de WhatsApp al número del dueño/operador (`ADMIN_ALERT_PHONE`).
  - Sincroniza la fila con datos del cliente a la hoja de Google Sheets.

---

## 3. `follow-up.json` (Seguimiento Inteligente)
- **Trigger**: `n8n-nodes-base.scheduleTrigger` (Ejecución cada 4 horas).
- **Acciones**:
  - Consulta los prospectos pendientes en `/api/leads/pending-followups`.
  - Filtra para respetar horario comercial (10:00 a 20:00).
  - Envía el mensaje de recontacto personalizado vía WhatsApp.
  - Actualiza el estado del lead a `CONTACTED` en el CRM de TurnoFlow.

---

## 4. `booking-management.json` (Gestión de Reservas)
- **Trigger**: Webhook disparado cuando el cliente solicita un turno.
- **Acciones**:
  - Llama a `/api/appointments/check-slot` para comprobar Google Calendar.
  - Si está disponible, invoca `/api/appointments/confirm-booking` y responde confirmación.
  - Si no está disponible, responde HTTP 409 ofreciendo turnos alternativos.

---

## 5. `human-handoff.json` (Transferencia a Persona)
- **Trigger**: Webhook disparado por `handoff_to_human`.
- **Acciones**:
  - Pausa automáticamente las respuestas automáticas de la IA en la conversación (`/api/conversations/:id/pause-ai`).
  - Envía notificación WhatsApp al operador humano con el motivo y el último mensaje del cliente.
