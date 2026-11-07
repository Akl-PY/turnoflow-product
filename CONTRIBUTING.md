# GUÍA DE CONTRIBUCIÓN — TURNOFLOW AI

Agradecemos las contribuciones a la plataforma TurnoFlow AI. Por favor sigue estas directrices para asegurar la calidad y estabilidad del código:

---

## 1. Convenciones de Ramas y Commits
- `feat/nombre-funcionalidad`: Nuevas características o mejoras en agentes.
- `fix/descripcion-bug`: Corrección de errores en backend, webhooks o interfaz.
- `docs/tema`: Mejoras en la documentación o manuales.

---

## 2. Flujo de Trabajo
1. Crea una rama a partir de `main`.
2. Si modificas contratos de datos o schemas, actualízalos primero en `packages/shared/src`.
3. Ejecuta `npm run build:shared` para compilar los tipos compartidos.
4. Si realizas cambios en el backend NestJS, añade o actualiza las pruebas en `apps/api/src/*.spec.ts`.
5. Ejecuta la suite de pruebas obligatoria:
   ```bash
   npm run test --workspace=@turnoflow/api
   ```
6. Verifica que TypeScript compile sin errores en el cliente Expo:
   ```bash
   cd apps/client && npx tsc --noEmit
   ```
7. Asegúrate de regenerar el archivo ZIP descargable si alteras plantillas o flujos:
   ```bash
   npm run export:dist
   ```
