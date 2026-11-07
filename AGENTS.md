# GUÍA DE AGENTES DE DESARROLLO — TURNOFLOW AI

Este repositorio está preparado para ser mantenido y extendido mediante agentes de codificación autónomos (Google Antigravity, Claude Code, OpenAI Codex).

## Reglas de Colaboración entre Agentes
1. **Separación de Responsabilidades**:
   - `Expo Frontend Agent`: Modifica exclusivamente `/product/apps/client`. Mantiene compatibilidad con Expo SDK 52, React Native Web y TypeScript estricto.
   - `NestJS Backend Agent`: Trabaja en `/product/apps/api`. No expone secretos, mantiene migraciones y respeta contratos multi-tenant.
   - `AI Agents Architect`: Mantiene la lógica en `/product/apps/api/src/modules/ai` y los prompts en `/product/prompts`. Garantiza la validación Zod y el grounding estricto.
   - `n8n Automation Agent`: Edita los flujos en `/product/automations`. No inventa tipos de nodos; usa solo nodos oficiales probados.
   - `Security & QA Agent`: Supervisa los tests en `product/apps/api/src/*.spec.ts` y audita que no haya API keys filtradas en `.env.example` o frontend.
   - `Documentation Agent`: Mantiene actualizadas las 13 guías en `/product/documentation` alineadas con el código real.
2. **Coordinación y Cero Colisiones**:
   - Dos agentes no deben editar simultáneamente los mismos archivos sin previo acuerdo de tipos en `packages/shared`.
   - Cualquier cambio de contrato de datos debe registrarse primero en `@turnoflow/shared` y compilarse con `npm run build:shared`.
