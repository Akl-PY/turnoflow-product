# 03. INSTALACIÓN Y CONFIGURACIÓN DE N8N

n8n es el motor de orquestación visual que procesa los webhooks de WhatsApp, programa los seguimientos y conecta los servicios externos con la API de TurnoFlow.

---

## Opción A: Despliegue con Docker Compose (Recomendado para producción)
El archivo `docker-compose.yml` incluido en la raíz de `/product` ya contiene n8n preconfigurado con persistencia de datos:

```yaml
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=n8n.tu-dominio.com
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - WEBHOOK_URL=https://n8n.tu-dominio.com/
      - GENERIC_TIMEZONE=America/Argentina/Buenos_Aires
    volumes:
      - n8n_data:/home/node/.n8n
```

Para iniciarlo junto con la base de datos y la API:
```bash
docker-compose up -d n8n
```

---

## Opción B: n8n Cloud o Instancia Existente
Si ya dispones de una cuenta en [n8n.cloud](https://n8n.cloud) o un servidor propio:
1. Asegúrate de tener habilitado el soporte de webhooks HTTPS.
2. Añade las siguientes variables de entorno en **Settings > Environments** de n8n:
   - `TURNOFLOW_API_URL`: URL base de tu backend (ej. `https://api.tu-dominio.com` o `http://api:3000`).
   - `TURNOFLOW_API_KEY`: Clave secreta que colocaste en el `.env` del backend para validar peticiones internas.
   - `ADMIN_ALERT_PHONE`: Número de teléfono con código de país para alertas de handoff urgente.
