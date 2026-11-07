# 07. CONFIGURACIÓN DE GOOGLE SHEETS

La integración con Google Sheets permite tener un espejo en tiempo real de todos los prospectos y consultas para que el dueño o recepcionista pueda auditar los contactos cómodamente desde su teléfono móvil o computadora.

---

## 1. Crear la Planilla Modelo
1. Entra a [sheets.new](https://sheets.new) en tu cuenta de Google.
2. Nombra la planilla: `TurnoFlow - Registro de Leads y Consultas`.
3. En la primera fila (encabezados), copia las columnas de nuestra plantilla:
   - `Fecha` | `Nombre` | `Teléfono` | `Servicio de Interés` | `Intención` | `Prioridad` | `Fuente` | `Notas`

---

## 2. Vincular con n8n
1. En n8n, abre el flujo `lead-management.json`.
2. En el nodo de Google Sheets, selecciona tus credenciales de Google OAuth2 o Service Account.
3. Elige la planilla recién creada y la hoja correspondiente.
4. Mapea los campos JSON extraídos por TurnoFlow a las columnas de la hoja.
5. Guarda y activa el workflow.
