# Evidencia y Procedimiento CP-006 — Exportación e Importación `.ics` (RFC 5545)

> **Estado en Línea Base (`FUE-011`):** Exportación generada y validada sintácticamente (`tarea_v0.ics` y `tarea_v1.ics`); prueba manual de importación externa en Google Calendar y Mozilla Thunderbird programada para **Fase 2** (Responsable: C. Emir Lujan).

## Archivos Generados
- `tarea_v0.ics`: Exportado tras asignación inicial (`SEQUENCE:0`).
- `tarea_v1.ics`: Exportado tras aprobar prórroga de +4 días (`SEQUENCE:1`, mismo `UID:tarea-<id>@oficinaconecta.mx`).

## Procedimiento de Prueba en Aplicaciones Externas
1. **Google Calendar (Web):** Abrir *Configuración > Importar y exportar > Seleccionar archivo* -> elegir `tarea_v0.ics` e importar en un calendario dedicado (p. ej. "Oficina Conecta Piloto"). Verificar la fecha original (`20-Nov`).
2. **Mozilla Thunderbird (Calendario):** Ir a *Eventos y tareas > Importar* -> seleccionar `tarea_v0.ics` sobre el mismo calendario local.
3. Tras aprobar la prórroga en Oficina Conecta (`sequence_ics = 1`), repetir la importación con `tarea_v1.ics` **sobre exactamente el mismo calendario** usado en el paso 1/2.
4. **Resultado Esperado:** Ambas aplicaciones reconocen el `UID` persistente y el incremento `SEQUENCE:1`, actualizando la cita existente al `24-Nov` sin duplicar el evento.
