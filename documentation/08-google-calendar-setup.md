# 08. CONFIGURACIÓN DE GOOGLE CALENDAR

La integración con Google Calendar es el corazón del sistema de reservas: previene la sobreventa de citas y mantiene la agenda sincronizada con los calendarios de las profesionales en sus teléfonos personales.

---

## 1. Crear el Calendario Dedicado
1. Abre [calendar.google.com](https://calendar.google.com/).
2. En el panel izquierdo, haz clic en el botón `+` junto a "Otros calendarios" > **Crear nuevo calendario**.
3. Nombra el calendario: `TurnoFlow - Citas Confirmadas`.
4. En la configuración del calendario, copia el **ID del calendario** (ej. `c_abc123@group.calendar.google.com`).
5. Asegúrate de que la zona horaria del calendario coincida exactamente con la zona horaria configurada en TurnoFlow (ej. `America/Argentina/Buenos_Aires`).

---

## 2. Variables de Configuración en el Backend
En `/product/apps/api/.env`:
```env
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-tu_secreto_google
GOOGLE_CALENDAR_ID=c_abc123@group.calendar.google.com
GOOGLE_REDIRECT_URI=https://api.tu-dominio.com/api/integrations/google/callback
```

---

## 3. Lógica de Verificación de Disponibilidad (Slot Checking)
Antes de proponer o confirmar un turno, el Booking Agent consulta la API de Google Calendar:
1. Revisa los eventos existentes en la franja solicitada.
2. Contempla el tiempo de desinfección/limpieza entre turnos (`buffer_between_appointments_minutes`).
3. Comprueba que el salón esté dentro de su horario de atención configurado.
4. Solo si se verifican todos los criterios, emite el evento en Google Calendar y devuelve el comprobante.
