export const OFFLINE_ERROR_MESSAGE =
  'Sin conexión con el servidor central: los cambios no se han guardado.';

export const OFFLINE_NAV_BLOCKED_MESSAGE =
  'Sin conexión: se mantuvo esta vista para proteger tu sesión y tus borradores locales. Podrás cambiar de sección al recuperar la conexión.';

export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  if (err instanceof TypeError) {
    return true;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('load failed') ||
      msg.includes('internet_disconnected') ||
      msg.includes('network request failed')
    );
  }
  return false;
}

export function hasDirtyLocalDrafts(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key || !key.startsWith('oc_draft_')) continue;
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as { dirty?: boolean } | null;
        if (parsed && parsed.dirty === true) {
          return true;
        }
      } catch {
        // Ignorar borradores con formato inválido
      }
    }
  } catch {
    return false;
  }
  return false;
}

export async function registerOfflineServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    // Service Worker no disponible o bloqueado en el entorno actual
  }
}

export async function cacheCurrentPageForOffline(pageUrl?: string): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const worker = registration.active ?? navigator.serviceWorker.controller;
    if (!worker) return;

    const targetUrl = pageUrl ?? window.location.href;
    const assetSet = new Set<string>();
    const elements = document.querySelectorAll('script[src], link[rel="stylesheet"][href]');
    elements.forEach((el) => {
      const rawSrc = el.getAttribute('src') ?? el.getAttribute('href');
      if (!rawSrc) return;
      try {
        const resolved = new URL(rawSrc, window.location.origin);
        if (resolved.origin === window.location.origin && resolved.pathname.startsWith('/_next/static/')) {
          assetSet.add(`${resolved.origin}${resolved.pathname}${resolved.search}`);
        }
      } catch {
        // Ignorar URL malformada
      }
    });

    worker.postMessage({
      type: 'CACHE_PAGE_AND_ASSETS',
      url: targetUrl,
      assets: Array.from(assetSet),
    });
  } catch {
    // Ignorar errores al comunicar con el Service Worker
  }
}

export async function clearOfflineUserCache(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const worker =
        navigator.serviceWorker.controller ??
        (await navigator.serviceWorker.getRegistration('/'))?.active;
      worker?.postMessage({ type: 'CLEAR_USER_CACHE' });
    }
  } catch {
    // Ignorar error enviando mensaje al Service Worker
  }

  try {
    if (typeof caches !== 'undefined') {
      await caches.delete('oc-pages-v1');
    }
  } catch {
    // Ignorar error eliminando CacheStorage directamente
  }
}

export async function probeServerConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId =
    controller && typeof window !== 'undefined'
      ? window.setTimeout(() => controller.abort(), 4000)
      : null;

  try {
    const res = await fetch('/api/health', {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller?.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    if (timeoutId !== null && typeof window !== 'undefined') {
      window.clearTimeout(timeoutId);
    }
  }
}
