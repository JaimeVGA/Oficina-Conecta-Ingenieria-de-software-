import { describe, expect, it } from 'vitest';
import {
  isSafeAvatarDataUrl,
  isValidUuid,
  validateSafeDocumentUpload,
  verifySameOriginMutation,
} from '@/lib/security/validation';
import { checkLoginRateLimit, clearLoginFailures, recordLoginFailure } from '@/lib/security/rateLimit';

describe('Controles de seguridad web (SEC-006 a SEC-011)', () => {
  it('bloquea extensiones y MIME peligrosos pero permite documentos válidos', () => {
    expect(validateSafeDocumentUpload({ name: 'reporte.pdf', type: 'application/pdf', size: 1024 }).ok).toBe(true);
    expect(validateSafeDocumentUpload({ name: 'calibracion.txt', type: 'text/plain', size: 512 }).ok).toBe(true);
    expect(validateSafeDocumentUpload({ name: 'xss.svg', type: 'image/svg+xml', size: 120 }).ok).toBe(false);
    expect(validateSafeDocumentUpload({ name: 'payload.html', type: 'text/html', size: 120 }).ok).toBe(false);
    expect(validateSafeDocumentUpload({ name: 'malware.exe', type: 'application/octet-stream', size: 120 }).ok).toBe(false);
    expect(validateSafeDocumentUpload({ name: 'vacio.txt', type: 'text/plain', size: 0 }).ok).toBe(false);
  });

  it('valida protección CSRF por Origin y Sec-Fetch-Site en mutaciones', () => {
    const crossSiteReq = new Request('https://app.oficinaconecta.mx/api/tareas', {
      method: 'POST',
      headers: { Origin: 'https://atacante.example', Host: 'app.oficinaconecta.mx' },
    });
    expect(verifySameOriginMutation(crossSiteReq).ok).toBe(false);

    const sameOriginReq = new Request('https://app.oficinaconecta.mx/api/tareas', {
      method: 'POST',
      headers: { Origin: 'https://app.oficinaconecta.mx', Host: 'app.oficinaconecta.mx' },
    });
    expect(verifySameOriginMutation(sameOriginReq).ok).toBe(true);

    const cliReq = new Request('https://app.oficinaconecta.mx/api/tareas', { method: 'POST' });
    expect(verifySameOriginMutation(cliReq).ok).toBe(true);
  });

  it('aplica rate limit por cuenta sin usar IP y limpia tras login exitoso', () => {
    const email = `audit-${Date.now()}@oficinaconecta.mx`;
    for (let i = 0; i < 6; i++) {
      expect(checkLoginRateLimit(email).allowed).toBe(true);
      recordLoginFailure(email);
    }
    const blocked = checkLoginRateLimit(email);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);

    clearLoginFailures(email);
    expect(checkLoginRateLimit(email).allowed).toBe(true);
  });

  it('valida formato UUID y URLs seguras de avatar', () => {
    expect(isValidUuid('57f51673-5b8f-4dcd-8e9e-59562d507d84')).toBe(true);
    expect(isValidUuid('10000000-0000-4000-8000-000000000001')).toBe(true);
    expect(isValidUuid('../../etc/passwd')).toBe(false);

    expect(isSafeAvatarDataUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isSafeAvatarDataUrl('data:image/svg+xml;base64,PHN2Zy8+')).toBe(false);
    expect(isSafeAvatarDataUrl('javascript:alert(1)')).toBe(false);
  });
});
