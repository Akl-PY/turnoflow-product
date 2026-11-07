# 06. CONFIGURACIÓN DE WHATSAPP CLOUD API (META)

TurnoFlow AI utiliza exclusivamente la API oficial de WhatsApp Cloud proporcionada por Meta, asegurando máxima estabilidad, cumplimiento con los términos de servicio y cero riesgo de bloqueos o baneos asociados a librerías no oficiales de WhatsApp Web.

---

## 1. Configuración de Variables en el Backend
En `/product/apps/api/.env`:
```env
WHATSAPP_PHONE_NUMBER_ID=109283746501928
WHATSAPP_ACCESS_TOKEN=EAAG...token_permanente...
WHATSAPP_VERIFY_TOKEN=tu_token_secreto_personalizado_1234
WHATSAPP_APP_SECRET=c91823746abcef01928347
WHATSAPP_API_VERSION=v20.0
```

---

## 2. Suscripción del Webhook en Meta Developers
1. En el panel de tu App en Meta for Developers, navega a **WhatsApp > Configuration**.
2. Haz clic en **Edit** en la sección **Webhook**:
   - **Callback URL:**
     `https://n8n.tu-dominio.com/webhook/turnoflow-incoming-whatsapp` (o la ruta directa del backend: `https://api.tu-dominio.com/api/conversations/whatsapp-webhook`).
   - **Verify Token:** El mismo texto que colocaste en `WHATSAPP_VERIFY_TOKEN`.
3. Haz clic en **Verify and Save**. Meta enviará una petición GET; n8n o la API responderán con el challenge de verificación.
4. En **Webhook fields**, suscríbete a:
   - `messages` (fundamental para recibir mensajes entrantes de clientes).

---

## 3. Verificación de Seguridad Criptográfica
Cada petición POST enviada por Meta incluye la cabecera:
```http
X-Hub-Signature-256: sha256=abcdef...
```
TurnoFlow AI calcula el hash HMAC-SHA256 del cuerpo recibido utilizando tu `WHATSAPP_APP_SECRET` y descarta cualquier paquete que no provenga legítimamente de los servidores de Meta.
