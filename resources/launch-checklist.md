# CHECKLIST DE LANZAMIENTO A PRODUCCIÓN (GO-LIVE) — TURNOFLOW AI

Sigue estos pasos el día de lanzamiento oficial para garantizar una experiencia sin fallos:

## 1. Verificación de Seguridad y Entorno
- [ ] Asegurarse de que el panel web de Expo esté compilado y servido bajo dominio con HTTPS (`https://app.tu-dominio.com`).
- [ ] Verificar que no existan variables de entorno secretas expuestas en el cliente frontend (no usar prefijos `EXPO_PUBLIC_` para API keys de IA o WhatsApp).
- [ ] Habilitar rate-limiting en los endpoints de la API (`@nestjs/throttler`).
- [ ] Verificar que la firma de webhooks de Meta (`X-Hub-Signature-256`) se valide rigurosamente en cada mensaje recibido.

## 2. Configuración Comercial del Negocio
- [ ] Revisar que los servicios cargados en `/knowledge-base` tengan precios y duraciones 100% actualizadas.
- [ ] Confirmar la política de cancelación y tolerancia horaria.
- [ ] Comprobar que los horarios de atención y días no laborables estén bien reflejados en la zona horaria del negocio.
- [ ] Añadir respuestas para las 10 preguntas más frecuentes de tus clientes.

## 3. Pruebas de Estrés en Playground
- [ ] Simular consultas de clientes en el Playground integrado de TurnoFlow.
- [ ] Probar intentos deliberados de regateo para comprobar que el agente no descuente tarifas sin autorización.
- [ ] Probar consultas médicas y verificar que active la transferencia a un operador humano.
- [ ] Probar agendamiento de un turno y corroborar que el evento aparezca inmediatamente en Google Calendar.

## 4. Activación del Canal WhatsApp
- [ ] En Meta for Developers, configurar la URL del Webhook apuntando a tu n8n o backend de TurnoFlow.
- [ ] Ingresar el Verify Token y validar la suscripción a eventos `messages`.
- [ ] Enviar un mensaje real desde un teléfono personal al número comercial de WhatsApp.
- [ ] Verificar que la respuesta automática llegue en menos de 3 segundos.
- [ ] Comprobar que el lead quede registrado en el módulo de CRM de TurnoFlow.

## 5. Monitoreo Post-Lanzamiento
- [ ] Revisar el dashboard durante las primeras 48 horas.
- [ ] Supervisar las alertas de escalado humano para responder a tiempo.
- [ ] Analizar los motivos de handoff para nutrir la base de conocimiento con nuevas preguntas frecuentes.
