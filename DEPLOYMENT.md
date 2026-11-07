# GUÍA DE DESPLIEGUE EN PRODUCCIÓN — TURNOFLOW AI

Instrucciones para desplegar TurnoFlow AI en entornos productivos mediante Docker Compose o servidores dedicados.

---

## 1. Despliegue con Docker Compose (Recomendado)
El archivo `docker-compose.yml` en la raíz de `/product` orquesta la base de datos PostgreSQL 16, el backend NestJS y el servidor n8n:

```bash
# 1. Configurar variables de entorno
cp .env.example .env
nano .env

# 2. Levantar servicios en segundo plano
docker-compose up -d --build

# 3. Comprobar que los contenedores estén saludables
docker-compose ps
```

---

## 2. Configuración de Proxy Inverso (Nginx o Caddy)
Para exponer la API y los webhooks de forma segura con certificados SSL gratuitos (Let's Encrypt):

### Ejemplo con Caddy:
```caddy
api.tu-dominio.com {
    reverse_proxy localhost:3000
}

n8n.tu-dominio.com {
    reverse_proxy localhost:5678
}

app.tu-dominio.com {
    root * /var/www/turnoflow-web
    file_server
    try_files {path} /index.html
}
```

---

## 3. Compilación de la Aplicación Web Expo
Para generar los archivos estáticos optimizados del panel de administración:
```bash
cd apps/client
npx expo export -p web
```
Los archivos HTML/JS/CSS resultantes en `apps/client/dist` pueden alojarse en Vercel, Netlify, Cloudflare Pages o cualquier servidor web estático.

---

## 4. Monitoreo y Logs
```bash
# Ver logs en vivo del backend
docker-compose logs -f api

# Ver logs de ejecuciones en n8n
docker-compose logs -f n8n
```
