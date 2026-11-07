# 11. GUÍA DE TESTING Y SIMULACIÓN

Antes de poner en producción el número de WhatsApp, es fundamental verificar la correcta respuesta de los agentes mediante el Playground integrado y la suite de pruebas automatizadas.

---

## 1. Uso del Playground de IA (`/playground`)
El panel de Expo incluye una consola de pruebas avanzada en la ruta `/playground` que te permite:
- Chatear directamente con cualquiera de los agentes especializados sin gastar mensajes de WhatsApp.
- Inspeccionar en tiempo real qué herramientas (`tools`) fueron invocadas en el backend con sus argumentos exactos.
- Probar escenarios difíciles con un solo clic:
  - *"Pregunta de Precios y Servicios"*
  - *"Intento de Regateo / Descuentos no autorizados"*
  - *"Consulta Médica o Dermatológica"*
  - *"Solicitud de Handoff Humano"*
  - *"Intento de Inyección de Prompt"*

---

## 2. Ejecución de la Suite de Pruebas Automatizadas
En el backend puedes correr las pruebas unitarias y de integración sin costo alguno (utilizan el adaptador `MockAiProvider`):

```bash
# Desde la carpeta /product
npm run test
```

Las pruebas verifican:
- Autenticación JWT y control de acceso.
- Aislamiento riguroso de datos entre organizaciones (multi-tenancy).
- Bloqueo de alucinaciones en cotizaciones de precios.
- Detección de solapamiento en reservas de Google Calendar.
- Descarte de peticiones de webhook duplicadas o con firma inválida.
