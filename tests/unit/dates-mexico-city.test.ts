import { describe, expect, it } from 'vitest';
import { diffNaturalDaysMX, mexicoCityLocalToIso, toMexicoCityDate } from '@/lib/dates/mexicoCity';

describe('Fechas en zona America/Mexico_City (RES-003 / RN-001)', () => {
  it('calcula días naturales sin desplazamiento erróneo por UTC después de las 18:00 MX', () => {
    // 2026-11-10 19:00 MX == 2026-11-11 01:00 UTC
    const refIso = mexicoCityLocalToIso('2026-11-10T19:00');
    // 2026-11-15 19:00 MX == 2026-11-16 01:00 UTC (+5 días naturales exactos en MX)
    const propIso = mexicoCityLocalToIso('2026-11-15T19:00');

    expect(toMexicoCityDate(refIso)).toBe('2026-11-10');
    expect(toMexicoCityDate(propIso)).toBe('2026-11-15');
    expect(diffNaturalDaysMX(refIso, propIso)).toBe(5);
  });
});
