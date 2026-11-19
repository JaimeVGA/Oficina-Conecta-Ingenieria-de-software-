/**
 * Utilidades de fecha y hora para America/Mexico_City (RES-003).
 * Toda fecha de negocio se evalúa en America/Mexico_City y se almacena en UTC.
 */

export const MEXICO_CITY_TZ = 'America/Mexico_City';

const dateFormatterMX = new Intl.DateTimeFormat('en-CA', {
  timeZone: MEXICO_CITY_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const dateTimeFormatterMX = new Intl.DateTimeFormat('en-CA', {
  timeZone: MEXICO_CITY_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/**
 * Extrae YYYY-MM-DD en zona horaria America/Mexico_City a partir de un ISO UTC.
 */
export function toMexicoCityDate(isoUtc: string | Date): string {
  const d = typeof isoUtc === 'string' ? new Date(isoUtc) : isoUtc;
  return dateFormatterMX.format(d);
}

/**
 * Formatea fecha y hora legible en America/Mexico_City: "YYYY-MM-DD HH:mm".
 */
export function formatMexicoCityDateTime(isoUtc: string | Date, includeSeconds = false): string {
  const d = typeof isoUtc === 'string' ? new Date(isoUtc) : isoUtc;
  if (Number.isNaN(d.getTime())) return 'Fecha inválida';
  const parts = dateTimeFormatterMX.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  const base = `${get('year')}-${get('month')}-${get('day')} ${hour}:${get('minute')}`;
  return includeSeconds ? `${base}:${get('second')}` : base;
}

/**
 * Convierte ISO UTC a valor compatible con <input type="datetime-local"> en hora Mexico_City.
 */
export function toMexicoCityInputValue(isoUtc: string | Date): string {
  return formatMexicoCityDateTime(isoUtc, false).replace(' ', 'T');
}

/**
 * Convierte un valor "YYYY-MM-DDTHH:mm" interpretado en America/Mexico_City a ISO UTC.
 * México abolió el horario de verano en la zona centro (UTC-06:00 fijo), pero
 * validamos el offset real con Intl por seguridad determinista.
 */
export function mexicoCityLocalToIso(localDateTime: string): string {
  if (/([zZ]|[+-]\d{2}:\d{2})$/.test(localDateTime)) {
    return new Date(localDateTime).toISOString();
  }
  const normalized = localDateTime.length === 16 ? `${localDateTime}:00` : localDateTime;
  const candidateUtc = new Date(`${normalized}-06:00`);
  if (Number.isNaN(candidateUtc.getTime())) {
    throw new Error('Fecha inválida');
  }
  return candidateUtc.toISOString();
}

/**
 * Calcula días naturales exactos (Δd = Fecha_propuesta_MX - Fecha_referencia_MX)
 * conforme a RN-001 y RES-003.
 */
export function diffNaturalDaysMX(fechaReferenciaIso: string, fechaPropuestaIso: string): number {
  const refDateStr = toMexicoCityDate(fechaReferenciaIso);
  const propDateStr = toMexicoCityDate(fechaPropuestaIso);
  const refMs = Date.parse(`${refDateStr}T00:00:00Z`);
  const propMs = Date.parse(`${propDateStr}T00:00:00Z`);
  return Math.round((propMs - refMs) / 86_400_000);
}
