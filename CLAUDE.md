# INSTRUCCIONES PARA CLAUDE CODE — TURNOFLOW AI

## Estructura del Monorepo
- `packages/shared`: Tipos, enums y schemas Zod compartidos entre frontend y backend.
- `apps/api`: Backend NestJS con TypeORM, PostgreSQL/SQLite y orquestador multi-agente.
- `apps/client`: Panel de administración en Expo / React Native Web.
- `automations`: 5 Workflows de n8n en JSON oficial.
- `prompts`: Especificaciones de prompts de los 5 agentes especializados.
- `documentation`: 13 Manuales paso a paso para el comprador.
- `dist`: Archivo descargable `TurnoFlow-AI-Complete.zip`.

## Comandos Esenciales
- Compilar todo: `npm run build:all`
- Ejecutar tests backend: `npm run test --workspace=@turnoflow/api`
- Sembrar datos de prueba: `npm run seed --workspace=@turnoflow/api`
- Iniciar backend en desarrollo: `npm run start:dev --workspace=@turnoflow/api`
- Iniciar Expo Web: `npm run web --workspace=@turnoflow/client`
- Compilar kit digital descargable: `npm run export:dist`

## Reglas de Codificación
- TypeScript estricto.
- Nunca hardcodear claves o secretos en frontend (`EXPO_PUBLIC_`).
- Utilizar el patrón Adapter (`AiProviderInterface`) para cualquier soporte de modelos LLM.
- Verificar disponibilidad real antes de confirmar turnos (`checkSlot`).
- Toda cotización debe sustentarse en el catálogo de servicios (`get_service_price`).
