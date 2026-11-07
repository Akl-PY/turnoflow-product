# 05. CONFIGURACIÓN DE OPENAI API

Si prefieres utilizar OpenAI o requieres redundancia frente a caídas de servicio, TurnoFlow AI cuenta con un adaptador nativo intercambiable que no requiere modificar los agentes ni los prompts.

---

## Modelos Compatibles y Recomendados
- **GPT-4o (`gpt-4o`)**: Capacidad multimodal y alta velocidad para orquestación y atención al cliente.
- **GPT-4o-mini (`gpt-4o-mini`)**: Modelo ultrarrápido y sumamente económico para clasificación de leads y detección de intenciones.

---

## Configuración en el Backend
En tu archivo `.env` en `/product/apps/api/.env`, define:
```env
AI_PROVIDER=openai
AI_MODEL=gpt-4o
OPENAI_API_KEY=sk-proj-...tu-clave-real...
AI_MAX_TOKENS=1024
AI_TEMPERATURE=0.2
```

---

## Arquitectura de Adaptadores Intercambiables
Gracias al patrón Adapter implementado en el backend de NestJS (`AiProviderInterface`), cambiar entre Anthropic y OpenAI requiere únicamente cambiar la variable `AI_PROVIDER` y reiniciar el contenedor o servicio.
Ambos adaptadores normalizan el formato de Tool Calling, el parseo de JSON Schema y el manejo de errores y reintentos automáticos.
