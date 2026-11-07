# ARQUITECTURA DE AGENTES DE IA — TURNOFLOW AI

TurnoFlow AI no utiliza chatbots genéricos o estáticos. Implementa un sistema de 5 agentes altamente especializados que operan bajo un principio estricto de menor privilegio y uso de herramientas tipadas (Tool Calling).

---

## 1. Reception Agent (Agente Recepcionista)
- **Objetivo**: Brindar atención cálida, inmediata y concisa las 24 horas vía WhatsApp.
- **Herramientas Disponibles**:
  - `search_knowledge_base`: Busca en preguntas frecuentes, ubicación y políticas de cancelación.
  - `get_services`: Obtiene tratamientos por categoría.
  - `get_service_price`: Cotiza precio exacto, moneda y duración en minutos.
  - `get_business_hours`: Devuelve horarios de atención.
  - `get_business_location`: Retorna dirección física y enlace de Google Maps.
  - `create_lead`: Registra los datos de prospecto en el CRM.
  - `check_availability`: Consulta turnos disponibles para una fecha.
  - `handoff_to_human`: Pausa la IA y deriva al equipo humano.
- **Guardrails**:
  - No puede inventar precios fuera de `get_service_price`.
  - No puede brindar diagnósticos ni tratamientos médicos/dermatológicos.

---

## 2. Lead Intelligence Agent (Clasificador de Leads)
- **Objetivo**: Evaluar los mensajes entrantes y clasificar el interés comercial en segundo plano.
- **Salida**: Formato estrictamente estructurado en JSON validado con Zod:
  - `intent`: `HIGH`, `MEDIUM`, `LOW`, `INFORMATIONAL`, `URGENT`, `REQUIRES_HUMAN`.
  - `priority`: `HOT`, `WARM`, `COLD`.
  - `identifiedService`: Tratamiento solicitado o nulo.
  - `estimatedUrgency`: `low`, `medium`, `high`, `immediate`.
  - `suggestedAction`: Próxima acción recomendada para el equipo.
  - `requiresHumanHandoff`: Booleano para escalado inmediato.

---

## 3. Booking Agent (Agente de Reservas)
- **Objetivo**: Coordinar y asentar turnos en Google Calendar y la base de datos de TurnoFlow.
- **Herramientas Disponibles**:
  - `check_available_slots`: Consulta franjas libres según duración del servicio.
  - `confirm_appointment`: Asienta la cita de forma definitiva tras validación previa.
  - `cancel_appointment`: Libera un turno según la política de anticipación.
- **Regla Inviolable**:
  - NUNCA confirma una cita a un cliente sin haber recibido respuesta exitosa de la herramienta `confirm_appointment`.

---

## 4. Follow-Up Agent (Agente de Seguimiento)
- **Objetivo**: Recuperar prospectos que no finalizaron su reserva respetando las políticas del canal.
- **Reglas**:
  - Máximo 2 contactos si no hay respuesta.
  - Solo envía mensajes dentro del horario comercial (10:00 a 20:00 hs).
  - Prohibido inventar promociones falsas o descuentos no autorizados.

---

## 5. Supervisor / Orchestrator Agent
- **Objetivo**: Actuar como filtro de seguridad, enrutador de intenciones y guardián de calidad.
- **Responsabilidades**:
  - Interceptar ataques de Prompt Injection y desvíos de rol.
  - Validar permisos de herramientas de cada agente antes de su ejecución.
  - Verificar grounding de precios contra el catálogo del negocio antes de emitir la respuesta final.
