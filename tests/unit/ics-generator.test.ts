import { describe, expect, it } from 'vitest';
import { foldIcsLine, generateIcsCalendar } from '@/lib/ics/generator';
import type { TareaEnriquecida } from '@/lib/supabase/types';

function makeTask(overrides: Partial<TareaEnriquecida> = {}): TareaEnriquecida {
  return {
    id: '40000000-0000-4000-8000-000000000014',
    folio: 'TAR-PUE-014',
    sede_id: 'PUEBLA',
    proyecto_id: '30000000-0000-4000-8000-000000000001',
    departamento_id: '20000000-0000-4000-8000-000000000005',
    responsable_id: '10000000-0000-4000-8000-000000000003',
    titulo: 'Calibración de Tableros',
    alcance: 'Calibración preventiva y pruebas eléctricas.',
    fecha_limite: '2026-11-11T00:00:00.000Z',
    estado: 'ASIGNADA',
    porcentaje_avance: 0,
    sequence_ics: 0,
    creado_por: '10000000-0000-4000-8000-000000000002',
    creado_en: '2026-11-05T15:00:00.000Z',
    actualizado_en: '2026-11-05T15:00:00.000Z',
    sede_nombre: 'Puebla de Zaragoza',
    proyecto_nombre: 'Modernización Planta Sur',
    proyecto_fecha_fin: '2026-11-30',
    departamento_nombre: 'Mantenimiento',
    responsable_nombre: 'Sofía Morales',
    responsable_correo: 'sofia.morales@oficinaconecta.mx',
    ...overrides,
  };
}

describe('Generador RFC 5545 (.ics)', () => {
  it('mantiene UID persistente y SEQUENCE incremental tras prórroga', () => {
    const v0 = generateIcsCalendar([makeTask({ sequence_ics: 0 })]);
    const v1 = generateIcsCalendar([
      makeTask({
        sequence_ics: 1,
        fecha_limite: '2026-11-15T00:00:00.000Z',
      }),
    ]);

    const unfoldedV0 = v0.replace(/\r\n /g, '');
    const unfoldedV1 = v1.replace(/\r\n /g, '');

    expect(unfoldedV0).toContain('UID:tarea-40000000-0000-4000-8000-000000000014@oficinaconecta.mx');
    expect(unfoldedV0).toContain('SEQUENCE:0');
    expect(unfoldedV0).toContain('SUMMARY:[Puebla de Zaragoza] Calibración de Tableros (Modernización Planta Sur)');
    expect(v0.includes('\r\n')).toBe(true);

    expect(unfoldedV1).toContain('UID:tarea-40000000-0000-4000-8000-000000000014@oficinaconecta.mx');
    expect(unfoldedV1).toContain('SEQUENCE:1');
  });

  it('dobla líneas superiores a 75 octetos UTF-8 conforme a RFC 5545', () => {
    const longLine = `DESCRIPTION:${'A'.repeat(180)}`;
    const folded = foldIcsLine(longLine);
    const physicalLines = folded.split('\r\n');
    expect(physicalLines.length).toBeGreaterThan(2);
    for (const part of physicalLines) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    }
    expect(physicalLines[1]?.startsWith(' ')).toBe(true);
  });
});
