const STATIC_CACHE = 'oc-static-v1';
const PAGE_CACHE = 'oc-pages-v1';
const ALLOWED_CACHES = [STATIC_CACHE, PAGE_CACHE];

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (!ALLOWED_CACHES.includes(key)) {
              return caches.delete(key);
            }
            return Promise.resolve(false);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

function buildOfflineFallbackResponse() {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sin conexión — Oficina Conecta</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      background: #0f172a;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .card {
      width: 100%;
      max-width: 28rem;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 1rem;
      padding: 1.75rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
      box-sizing: border-box;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      background: rgba(239, 68, 68, 0.16);
      color: #fca5a5;
      font-size: 0.75rem;
      font-weight: 700;
      margin-bottom: 0.875rem;
    }
    h1 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      line-height: 1.35;
    }
    p {
      margin: 0 0 1rem 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: #cbd5e1;
    }
    button {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 0;
      border-radius: 0.625rem;
      background: #2563eb;
      color: #ffffff;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover {
      background: #1d4ed8;
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="badge">Modo sin conexión</div>
    <h1>Sin conexión con el servidor central</h1>
    <p>
      No se pudo cargar esta pantalla porque se interrumpió la conexión a internet.
      La información que capturaste localmente en tus borradores activos permanece segura en tu navegador.
    </p>
    <p>Restablece tu conexión a internet para volver a consultar datos del servidor.</p>
    <button type="button" onclick="window.location.reload()">Reintentar conexión</button>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function isCacheableHtmlResponse(res) {
  if (!res || !res.ok || res.type !== 'basic' || res.redirected) {
    return false;
  }
  const contentType = res.headers.get('content-type') || '';
  return contentType.includes('text/html');
}

function getNormalizedCacheKey(urlString) {
  const parsed = new URL(urlString, self.location.origin);
  return `${parsed.origin}${parsed.pathname}${parsed.search}`;
}

async function cacheAssetIfMissing(staticCache, assetUrl) {
  try {
    const parsed = new URL(assetUrl, self.location.origin);
    if (parsed.origin !== self.location.origin || !parsed.pathname.startsWith('/_next/static/')) {
      return;
    }
    const cacheKey = `${parsed.origin}${parsed.pathname}${parsed.search}`;
    const existing = await staticCache.match(cacheKey);
    if (existing) return;
    const res = await fetch(cacheKey, { credentials: 'same-origin' });
    if (res && res.ok) {
      await staticCache.put(cacheKey, res.clone());
    }
  } catch {
    // Ignorar fallo individual de precarga de asset
  }
}

async function handleCachePageAndAssets(payload) {
  const rawUrl = payload && typeof payload.url === 'string' ? payload.url : null;
  const assets = payload && Array.isArray(payload.assets) ? payload.assets : [];

  const staticCache = await caches.open(STATIC_CACHE);
  await Promise.all(assets.map((asset) => cacheAssetIfMissing(staticCache, asset)));

  if (!rawUrl) return;
  try {
    const parsedUrl = new URL(rawUrl, self.location.origin);
    if (parsedUrl.origin !== self.location.origin || parsedUrl.pathname.startsWith('/api/')) {
      return;
    }
    const cacheKey = `${parsedUrl.origin}${parsedUrl.pathname}${parsedUrl.search}`;
    const res = await fetch(cacheKey, { credentials: 'same-origin', cache: 'no-store' });
    if (!isCacheableHtmlResponse(res)) return;

    const targetCacheName = parsedUrl.pathname === '/login' ? STATIC_CACHE : PAGE_CACHE;
    const targetCache = await caches.open(targetCacheName);
    await targetCache.put(cacheKey, res.clone());
  } catch {
    // Ignorar error de caché en segundo plano
  }
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'CACHE_PAGE_AND_ASSETS') {
    event.waitUntil(handleCachePageAndAssets(data));
    return;
  }

  if (data.type === 'CLEAR_USER_CACHE') {
    event.waitUntil(caches.delete(PAGE_CACHE));
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Nunca interceptar rutas de API ni peticiones internas RSC
  if (
    url.pathname.startsWith('/api/') ||
    request.headers.get('RSC') === '1' ||
    url.searchParams.has('_rsc')
  ) {
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    const cacheKey = getNormalizedCacheKey(request.url);
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(cacheKey);
        if (cached) return cached;
        const res = await fetch(request);
        if (res && res.ok) {
          await cache.put(cacheKey, res.clone());
        }
        return res;
      })
    );
    return;
  }

  if (request.mode === 'navigate') {
    const cacheKey = getNormalizedCacheKey(request.url);
    const targetCacheName = url.pathname === '/login' ? STATIC_CACHE : PAGE_CACHE;

    event.respondWith(
      fetch(request)
        .then(async (res) => {
          if (isCacheableHtmlResponse(res)) {
            const cache = await caches.open(targetCacheName);
            await cache.put(cacheKey, res.clone());
          }
          return res;
        })
        .catch(async () => {
          const primaryCache = await caches.open(targetCacheName);
          const exactMatch = await primaryCache.match(cacheKey);
          if (exactMatch) return exactMatch;

          if (url.pathname === '/login') {
            const loginBaseMatch = await primaryCache.match(`${url.origin}/login`);
            if (loginBaseMatch) return loginBaseMatch;
          } else {
            const pageCache = await caches.open(PAGE_CACHE);
            const fallbackMatch = await pageCache.match(cacheKey);
            if (fallbackMatch) return fallbackMatch;
          }

          return buildOfflineFallbackResponse();
        })
    );
  }
});
