# 02. CONFIGURACIÓN DE CUENTAS EXTERNAS

Para que TurnoFlow AI opere de forma autónoma con tu propia infraestructura, necesitas habilitar las siguientes cuentas:

---

## 1. Cuenta de Proveedor de Inteligencia Artificial (Anthropic o OpenAI)
Puedes elegir uno de los dos o tener ambos configurados:
- **Anthropic Claude (Recomendado por su excelente redacción conversacional y seguimiento estricto de reglas)**:
  1. Crea una cuenta en [console.anthropic.com](https://console.anthropic.com/).
  2. Añade un método de pago y carga un saldo inicial (ej. $5 a $10 USD).
  3. Dirígete a **API Keys** y genera una clave nueva con el nombre `TurnoFlow-Production`.
  4. Guarda tu clave: la utilizaremos como `ANTHROPIC_API_KEY`.
- **OpenAI (Alternativa oficial de alto rendimiento con GPT-4o / GPT-4o-mini)**:
  1. Ingresa a [platform.openai.com](https://platform.openai.com/).
  2. Añade saldo en **Billing**.
  3. Crea una API Key en **API keys** y guárdala como `OPENAI_API_KEY`.

---

## 2. Cuenta de Meta Developers (WhatsApp Cloud API)
1. Ve a [developers.facebook.com](https://developers.facebook.com/) e inicia sesión con tu cuenta de Facebook Business.
2. Crea una app de tipo **Business** o **Other** y añade el producto **WhatsApp**.
3. En el panel de WhatsApp > **API Setup**:
   - Obtendrás un número de prueba inicial.
   - Encontrarás tu `Phone Number ID` y `WhatsApp Business Account ID`.
   - Genera un **System User Token** permanente en Meta Business Settings con permisos `whatsapp_business_management` y `whatsapp_business_messaging`.
   - Copia el `App Secret` de tu aplicación en Ajustes Básicos.

---

## 3. Cuenta de Google Cloud Platform (Calendar y Sheets)
1. Ingresa a [console.cloud.google.com](https://console.cloud.google.com/) y crea un proyecto llamado `TurnoFlow-Automations`.
2. En la biblioteca de APIs, habilita:
   - **Google Calendar API**
   - **Google Sheets API**
3. En **Pantalla de consentimiento de OAuth**, selecciona tipo "Externo" y completa los campos básicos.
4. En **Credenciales**, crea un ID de cliente OAuth 2.0 (Aplicación web) o una Cuenta de Servicio (Service Account) según tu preferencia de despliegue.
