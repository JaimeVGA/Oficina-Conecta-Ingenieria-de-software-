import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasDirtyLocalDrafts, isNetworkError } from '@/lib/offline/client';

describe('Resiliencia offline y detección de borradores locales', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detecta errores de red y estado navigator.onLine = false con isNetworkError', () => {
    vi.stubGlobal('navigator', { onLine: true });

    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new Error('NetworkError when attempting to fetch resource'))).toBe(true);
    expect(isNetworkError(new Error('net::ERR_INTERNET_DISCONNECTED'))).toBe(true);
    expect(isNetworkError(new Error('Error HTTP 422 de validación'))).toBe(false);

    vi.stubGlobal('navigator', { onLine: false });
    expect(isNetworkError(new Error('Cualquier fallo con red cortada'))).toBe(true);
  });

  it('distingue borradores limpios vs modificados (dirty) en hasDirtyLocalDrafts', () => {
    const store = new Map<string, string>();
    const mockSessionStorage = {
      get length() {
        return store.size;
      },
      key(index: number) {
        return Array.from(store.keys())[index] ?? null;
      },
      getItem(key: string) {
        return store.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        store.set(key, value);
      },
      removeItem(key: string) {
        store.delete(key);
      },
      clear() {
        store.clear();
      },
    };

    vi.stubGlobal('sessionStorage', mockSessionStorage);

    store.set('oc_last_activity_ms', '1700000000000');
    store.set(
      'oc_draft_solicitud_t1',
      JSON.stringify({ data: { motivo: '' }, idempotencyKey: 'k1', savedAt: '2026-11-27T00:00:00Z', dirty: false })
    );
    expect(hasDirtyLocalDrafts()).toBe(false);

    store.set('oc_draft_corrupto', '{invalid json');
    expect(hasDirtyLocalDrafts()).toBe(false);

    store.set(
      'oc_draft_avance_t1',
      JSON.stringify({
        data: { estado: 'EN_PROCESO', porcentaje: 50 },
        idempotencyKey: 'k2',
        savedAt: '2026-11-27T00:01:00Z',
        dirty: true,
      })
    );
    expect(hasDirtyLocalDrafts()).toBe(true);
  });

  it('incluye salvaguardas críticas en public/sw.js (limpieza de sesión, caché y exclusión de /api y RSC)', () => {
    const swPath = path.resolve(process.cwd(), 'public/sw.js');
    expect(fs.existsSync(swPath)).toBe(true);

    const content = fs.readFileSync(swPath, 'utf8');
    expect(content).toContain('CLEAR_USER_CACHE');
    expect(content).toContain('oc-pages-v1');
    expect(content).toContain("'/api/'");
    expect(content).toContain("request.headers.get('RSC') === '1'");
  });
});
