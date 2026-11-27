const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_AVATAR_DATA_URL_REGEX = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\s]+$/i;

const BLOCKED_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.xhtml',
  '.svg',
  '.svgz',
  '.xml',
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.ts',
  '.tsx',
  '.exe',
  '.dll',
  '.bat',
  '.cmd',
  '.ps1',
  '.sh',
  '.vbs',
  '.msi',
  '.scr',
  '.com',
  '.php',
  '.jsp',
  '.asp',
  '.aspx',
  '.hta',
]);

const BLOCKED_MIME_TYPES = new Set([
  'text/html',
  'application/xhtml+xml',
  'image/svg+xml',
  'text/javascript',
  'application/javascript',
  'application/x-javascript',
  'application/x-msdownload',
  'application/x-sh',
  'application/x-httpd-php',
]);

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function isDemoToolsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_DEMO_TOOLS === 'true';
}

export function isValidUuid(val: unknown): val is string {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

export function exceedsMaxLength(val: unknown, max: number): boolean {
  return typeof val === 'string' && val.length > max;
}

export function isSafeAvatarDataUrl(val: unknown): val is string {
  return typeof val === 'string' && SAFE_AVATAR_DATA_URL_REGEX.test(val.trim());
}

export function validateSafeDocumentUpload(file: {
  name: string;
  type: string;
  size: number;
}): { ok: true } | { ok: false; message: string } {
  if (file.size <= 0) {
    return { ok: false, message: 'El archivo está vacío.' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: 'El archivo excede el límite máximo de 50 MB.' };
  }
  if (file.name.length > 200) {
    return { ok: false, message: 'El nombre del archivo excede el máximo de 200 caracteres.' };
  }

  const lowerName = file.name.trim().toLowerCase();
  const lastDot = lowerName.lastIndexOf('.');
  const ext = lastDot >= 0 ? lowerName.slice(lastDot) : '';
  if (ext && BLOCKED_EXTENSIONS.has(ext)) {
    return { ok: false, message: `Extensión de archivo no permitida por seguridad (${ext}).` };
  }

  const baseMime = file.type.split(';')[0]?.trim().toLowerCase() ?? '';
  if (baseMime && BLOCKED_MIME_TYPES.has(baseMime)) {
    return { ok: false, message: `Tipo de contenido no permitido por seguridad (${baseMime}).` };
  }

  return { ok: true };
}

export function verifySameOriginMutation(req: Request): { ok: true } | { ok: false; message: string } {
  if (!MUTATION_METHODS.has(req.method.toUpperCase())) {
    return { ok: true };
  }

  const secFetchSite = req.headers.get('sec-fetch-site')?.trim().toLowerCase();
  if (secFetchSite === 'cross-site') {
    return { ok: false, message: 'Solicitud bloqueada por protección CSRF (cross-site).' };
  }

  const origin = req.headers.get('origin')?.trim();
  if (!origin) {
    return { ok: true };
  }
  if (origin === 'null') {
    return { ok: false, message: 'Solicitud bloqueada: origen nulo no permitido.' };
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return { ok: false, message: 'Solicitud bloqueada: cabecera Origin inválida.' };
  }

  const reqHostRaw = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  const reqHost = reqHostRaw.split(',')[0]?.trim().toLowerCase() ?? '';
  if (reqHost && originHost !== reqHost) {
    return { ok: false, message: 'Solicitud bloqueada: origen cruzado no autorizado.' };
  }

  return { ok: true };
}
