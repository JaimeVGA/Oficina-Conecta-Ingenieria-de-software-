import type { TareaEnriquecida } from '@/lib/supabase/types';
import { formatMexicoCityDateTime } from '@/lib/dates/mexicoCity';

/**
 * Escapa caracteres especiales según RFC 5545 sección 3.3.11 (TEXT).
 */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/**
 * Formatea una fecha UTC en formato iCalendar básico: YYYYMMDDTHHMMSSZ.
 */
export function formatIcsUtcTimestamp(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/**
 * Aplica line-folding RFC 5545 (máximo 75 octetos UTF-8 por línea física; continuación con espacio).
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) {
    return line;
  }
  const chunks: string[] = [];
  let current = '';
  let maxBytes = 75;

  for (const ch of line) {
    const next = current + ch;
    if (encoder.encode(next).length > maxBytes) {
      chunks.push(current);
      current = ` ${ch}`;
      maxBytes = 75;
    } else {
      current = next;
    }
  }
  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks.join('\r\n');
}

/**
 * Genera el contenido íntegro de un archivo .ics (RFC 5545) con UID persistente
 * por tarea y SEQUENCE incremental para actualización sin duplicados en Google Calendar y Thunderbird.
 */
export function generateIcsCalendar(
  tareas: TareaEnriquecida[],
  now: Date = new Date(),
  calendarName = 'Oficina Conecta — Fechas Límite'
): string {
  const dtStamp = formatIcsUtcTimestamp(now);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Oficina Conecta//Grupo 502-A Equipo I//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    'X-WR-TIMEZONE:America/Mexico_City',
  ];

  for (const tarea of tareas) {
    const uid = `tarea-${tarea.id}@oficinaconecta.mx`;
    const dueDate = new Date(tarea.fecha_limite);
    const startDate = new Date(dueDate.getTime() - 60 * 60 * 1000); // Bloque de 1 hora previo al vencimiento
    const status = tarea.estado === 'CANCELADA' ? 'CANCELLED' : 'CONFIRMED';

    const summary = `[${tarea.sede_nombre}] ${tarea.titulo} (${tarea.proyecto_nombre})`;
    const description = [
      `Folio: ${tarea.folio}`,
      `Sede: ${tarea.sede_nombre}`,
      `Departamento: ${tarea.departamento_nombre}`,
      `Proyecto: ${tarea.proyecto_nombre}`,
      `Responsable: ${tarea.responsable_nombre}`,
      `Estado: ${tarea.estado} (${tarea.porcentaje_avance}%)`,
      `Fecha límite (Mexico_City): ${formatMexicoCityDateTime(tarea.fecha_limite)}`,
      `Alcance: ${tarea.alcance}`,
      `Secuencia ICS: ${tarea.sequence_ics}`,
    ].join('\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `SEQUENCE:${tarea.sequence_ics}`,
      `DTSTAMP:${dtStamp}`,
      `LAST-MODIFIED:${formatIcsUtcTimestamp(tarea.actualizado_en)}`,
      `DTSTART:${formatIcsUtcTimestamp(startDate)}`,
      `DTEND:${formatIcsUtcTimestamp(dueDate)}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      `LOCATION:${escapeIcsText(tarea.sede_nombre)}`,
      `STATUS:${status}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}
