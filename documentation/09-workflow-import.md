# 09. IMPORTACIÓN DE FLUJOS EN N8N

El kit descargable incluye 5 archivos de flujos de trabajo profesionales en formato JSON estructurado, listos para ser importados en tu servidor n8n con solo unos clics.

---

## Flujos Incluidos en `/product/automations/`
1. `incoming-messages.json`: Recepción de WhatsApp, verificación de desafío Meta, normalización de mensajes y reenvío seguro a TurnoFlow.
2. `lead-management.json`: Disparado ante cada lead nuevo, sincroniza a Google Sheets y envía alerta WhatsApp a dueña/o ante leads calientes.
3. `follow-up.json`: Cron cada 4 horas que evalúa leads pendientes dentro de horario comercial y dispara mensajes de recontacto no invasivos.
4. `booking-management.json`: Verificación de disponibilidad de horarios, creación de reservas y confirmación instantánea.
5. `human-handoff.json`: Pausa automática de la IA y alerta inmediata a los operadores del negocio.

---

## Procedimiento de Importación
1. Inicia sesión en tu instancia de n8n.
2. En el menú superior izquierdo, haz clic en **Workflows > Import from File** (o atajo `Ctrl+O`).
3. Selecciona el archivo JSON deseado desde la carpeta `automations/`.
4. Una vez cargado el lienzo, revisa los nodos HTTP Request y confirma que apunten a tu variable `$env.TURNOFLOW_API_URL`.
5. Haz clic en **Save** y enciende el interruptor **Active** en la esquina superior derecha.
