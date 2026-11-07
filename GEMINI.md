# GUÍA PARA GOOGLE ANTIGRAVITY / GEMINI — TURNOFLOW AI

## Rol y Convenciones
- TurnoFlow AI es un producto digital SaaS completo valorado en USD 49 pago único para centros de estética, peluquerías y salones de belleza.
- Todo desarrollo se concentra exclusivamente bajo `/product`. No modificar archivos fuera de este árbol (como `/landing`).
- Los flujos n8n deben ser JSON sintácticamente válidos con nodos oficiales (`webhook`, `httpRequest`, `if`, `code`, `respondToWebhook`).
- El backend NestJS implementa aislamiento multi-tenant estricto mediante `organizationId`.
- El frontend Expo prioriza la versión Web (`react-native-web`) con estética moderna de Linear/Vercel (zinc, dark mode, acentos púrpura/esmeralda).

## Validación y QA
- Cada cambio en la API debe ser validado con `npm run test --workspace=@turnoflow/api`.
- La suite de tests incluye pruebas con `MockAiProvider` que garantizan cero costo de tokens en CI/CD.
- El archivo `dist/TurnoFlow-AI-Complete.zip` debe regenerarse con `npm run export:dist` siempre que se actualicen las guías, prompts o plantillas.
