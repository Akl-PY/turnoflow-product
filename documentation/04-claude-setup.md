# 04. CONFIGURACIÓN DE ANTHROPIC CLAUDE API

Anthropic Claude es el proveedor recomendado por defecto en TurnoFlow AI gracias a su sobresaliente capacidad de razonamiento contextual, redacción natural en español y estricto respeto de directivas de seguridad.

---

## Modelos Compatibles y Recomendados
- **Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`)**: Recomendado para el Agente Supervisor, Agente Recepcionista y Booking Agent, donde se requiere máxima precisión conversacional y tool-calling.
- **Claude 3.5 Haiku (`claude-3-5-haiku-20241022`)**: Ideal para tareas de alta velocidad y bajo costo, como el Agente Clasificador de Leads o el evaluador de seguimientos.

---

## Configuración en el Backend
En tu archivo `.env` en `/product/apps/api/.env`, coloca:
```env
AI_PROVIDER=anthropic
AI_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=sk-ant-api03-...tu-clave-real...
AI_MAX_TOKENS=1024
AI_TEMPERATURE=0.2
```

---

## Control de Costos y Buenas Prácticas
1. **Límites de Saldo**: En el panel de Anthropic, define un límite de gasto mensual (ej. $20 USD) para evitar consumos imprevistos.
2. **Temperatura Baja (0.1 - 0.3)**: Mantiene las respuestas enfocadas en los hechos de la base de conocimiento y minimiza la variabilidad indeseada.
3. **Validación Zod**: El backend valida que la respuesta cumpla con la estructura requerida antes de guardarla o enviarla por WhatsApp.
