# 10. CONFIGURACIÓN DE AGENTES Y BASE DE CONOCIMIENTO

TurnoFlow AI separa con total nitidez el **código de la aplicación** de los **datos y la personalidad del negocio**, permitiendo al usuario final ajustar su estética o salón sin tocar una sola línea de código fuente.

---

## 1. Ajuste desde el Panel de Control Web
Accede a `/knowledge-base` en tu panel de administración Expo:
1. **Datos del Negocio**: Nombre del salón, dirección exacta, enlace de Google Maps y teléfono de atención.
2. **Catálogo de Servicios**: Carga los tratamientos, duración exacta en minutos y precio final con moneda.
3. **Horarios de Atención**: Marca los días y franjas de atención matutina y vespertina.
4. **Preguntas Frecuentes**: Agrega respuestas a dudas sobre estacionamiento, formas de pago, señas o políticas de tolerancia.
5. **Políticas de Cancelación**: Define las horas de anticipación requeridas para reprogramar o cancelar.

---

## 2. Ajuste de Agentes en `/agents`
Desde la sección de Agentes puedes:
- Alternar entre **Claude** y **OpenAI** para cada agente individual.
- Activar o pausar agentes con un switch.
- Ajustar la temperatura del modelo (0.0 para respuestas hiper-precisas; 0.3 para mayor soltura conversacional).
- Configurar las palabras clave de escape para handoff humano (ej: *"humano"*, *"persona"*, *"recepcionista"*, *"queja"*).
