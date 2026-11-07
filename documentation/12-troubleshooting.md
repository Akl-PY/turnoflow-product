# 12. RESOLUCIÓN DE INCIDENCIAS TÉCNICAS

Diagnóstico rápido ante incidentes comunes en la operación diaria de TurnoFlow AI:

---

## 1. El agente responde "Hubo un inconveniente temporal"
- **Diagnóstico:** Revisa el archivo de log en el contenedor de la API (`docker logs turnoflow-api`).
- **Solución más común:** API Key de OpenAI o Anthropic expirada, sin crédito suficiente o límite de concurrencia alcanzado.

---

## 2. Meta WhatsApp marca error 500 al recibir mensajes
- **Diagnóstico:** El webhook está tardando más de 3 segundos en responder el HTTP 200 OK a Meta.
- **Solución:** Comprueba que en n8n o en la API la respuesta a Meta sea inmediata (modo asíncrono o ACK instantáneo) mientras el procesamiento del agente de IA se ejecuta en segundo plano.

---

## 3. Google Calendar marca error de autenticación 401
- **Diagnóstico:** El token de actualización (Refresh Token) expiró o la aplicación de Google Cloud quedó en estado "Testing" (lo cual caduca los tokens cada 7 días).
- **Solución:** En la consola de Google Cloud, pasa la pantalla de consentimiento de OAuth al estado **En Producción** (In Production) para que el Refresh Token sea permanente.
