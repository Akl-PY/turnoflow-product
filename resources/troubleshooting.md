# GUÍA DE RESOLUCIÓN DE PROBLEMAS (TROUBLESHOOTING) — TURNOFLOW AI

Respuestas a los problemas más frecuentes durante la instalación y operación:

---

## 1. Webhook de WhatsApp no recibe mensajes o falla la verificación
- **Síntoma:** Meta arroja error *"The URL could not be validated"* al guardar el webhook.
- **Causa:** La URL no responde con el `hub.challenge` en texto plano o el `WHATSAPP_VERIFY_TOKEN` no coincide.
- **Solución:** Comprueba que tu túnel o dominio público HTTPS esté activo (ej. Cloudflare Tunnel, ngrok o VPS con Let's Encrypt). Revisa que el flujo n8n `incoming-messages.json` esté en estado **Activo** y responda en texto plano al método GET de verificación.

---

## 2. Los Agentes responden con mensajes vacíos o error de proveedor de IA
- **Síntoma:** En el Playground o en WhatsApp recibes un mensaje genérico de error de contingencia.
- **Causa:** Saldo insuficiente o API Key incorrecta en `ANTHROPIC_API_KEY` o `OPENAI_API_KEY`.
- **Solución:** Revisa los logs del backend NestJS:
  ```bash
  docker-compose logs -f api
  ```
  Si el proveedor devuelve HTTP 429 (Rate Limit) o HTTP 401 (Unauthorized), renueva la clave o recarga saldo en tu cuenta de desarrollador.

---

## 3. Discrepancia en la disponibilidad de turnos / Diferencia de Zonas Horarias
- **Síntoma:** El cliente pide un turno a las 15:00 pero en Google Calendar se agenda a las 18:00 o 12:00.
- **Causa:** Desajuste entre la zona horaria del servidor, la base de datos y la configuración del negocio.
- **Solución:** Asegúrate de especificar la zona horaria IANA correcta en el panel de configuración del negocio (ej. `America/Argentina/Buenos_Aires`, `America/Mexico_City`, `America/Santiago`). La API de TurnoFlow convierte todas las fechas a UTC internamente y las renderiza en la zona horaria configurada.

---

## 4. n8n no puede comunicarse con la API de TurnoFlow
- **Síntoma:** En la ejecución de n8n los nodos HTTP Request marcan `ECONNREFUSED` o `401 Unauthorized`.
- **Causa:** Si corres n8n y TurnoFlow en Docker Compose, utiliza el nombre de red interna de los contenedores (ej. `http://api:3000`) en vez de `localhost`. Comprueba que la cabecera `X-TurnoFlow-API-Key` coincida con la configurada en el `.env` del backend.
