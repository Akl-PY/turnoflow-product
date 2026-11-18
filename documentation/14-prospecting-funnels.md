# Guía 14: Embudos de Prospección y Respuestas en Seguidilla

TurnoFlow AI incorpora un **Motor de Prospección Conversacional Determinístico** que permite a cualquier negocio diseñar flujos guiados paso a paso para convertir consultas frecuentes en reservas y ventas.

---

## 1. ¿Cómo funciona la Seguidilla de Mensajes?

En lugar de delegar el 100% de la conversación a la creatividad del modelo de lenguaje, los **Embudos de Prospección** permiten definir rutas exactas de ventas:

1. **Disparador Inicial (Trigger):**
   - **Contacto Nuevo:** Se dispara en el momento exacto en que un número desconocido escribe por primera vez.
   - **Palabras Clave:** Se dispara cuando el cliente menciona términos clave (ej. `precio`, `costo`, `promo`, `cuanto sale`, `láser`, `uñas`).
2. **Paso 1 (Mensaje Inicial e Indagación):**
   - El bot envía de inmediato un mensaje pre-configurado presentando opciones claras (ej. `1) Tratamiento A`, `2) Tratamiento B`).
3. **Paso 2 (Seguidilla / Branching Condicional):**
   - Si el cliente responde con la opción `1` (o palabras asociadas como `laser`, `soprano`), el sistema avanza al **Paso 2A**.
   - Si responde con la opción `2` (o palabras como `facial`, `limpieza`), avanza al **Paso 2B**.
4. **Paso 3 (Oferta Comercial y Cierre de Turno):**
   - El bot presenta la oferta concreta (ej. *"Tenemos una promo 2x1 en esa zona a $15.000. ¿Te gustaría reservar para este jueves o viernes?"*).
   - Actualiza automáticamente el CRM con el servicio de interés del cliente y cambia su estado a `INTERESTED` o `BOOKED`.

---

## 2. Configuración desde el Panel Administrativo

Podés acceder al constructor desde el menú lateral: **Embudos & Prospección** (`/prospecting`).

### Crear un Embudo Nuevo:
1. Hacé clic en **"Crear Nuevo Embudo"** (o seleccioná una plantilla pre-diseñada).
2. Asigná un **Nombre** representativo (ej. *Prospección Depilación Láser*).
3. Seleccioná el disparador:
   - *Palabras Clave:* escribí términos separados por coma (`precio, costo, promo, depilacion`).
   - *Cada Contacto Nuevo:* ideal para mensajes de bienvenida y menú institucional.
4. Diseñá los **Pasos y Seguidillas**:
   - En cada paso podés definir qué opciones esperás del cliente (`keywords: ["1", "laser"]`) y a qué paso deben redirigir.
   - Podés marcar un paso como **"Paso Final"** para concluir el embudo.
5. Hacé clic en **"Guardar Embudo"**.

---

## 3. Pruebas y Simulación en Vivo

En la misma pantalla podés hacer clic en **"Probar en Simulador"** en cualquiera de tus embudos.
- Podés chatear con el simulador escribiendo como cliente (`"Hola, qué sale?"` ➔ `"1"` ➔ `"Axilas"`).
- Podés observar cómo se transiciona de un paso al siguiente y verificar que las respuestas sean exactamente las deseadas antes de ponerlo en producción en WhatsApp.
