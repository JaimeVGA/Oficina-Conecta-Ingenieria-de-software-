// Limitador de tasa en memoria indexado por cuenta/actor (RES-002: sin captura ni lectura de IPs)
const buckets = new Map<string, number[]>();

function evaluateWindow(key: string, maxRequests: number, windowMs: number, recordNow: boolean): {
  allowed: boolean;
  retryAfterSec: number;
} {
  const now = Date.now();
  const cutoff = now - windowMs;
  const active = (buckets.get(key) ?? []).filter((ts) => ts > cutoff);

  if (active.length >= maxRequests) {
    buckets.set(key, active);
    const oldest = active[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { allowed: false, retryAfterSec };
  }

  if (recordNow) {
    active.push(now);
  }
  if (active.length > 0) {
    buckets.set(key, active);
  } else {
    buckets.delete(key);
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function checkLoginRateLimit(
  email: string,
  maxFailures = 6,
  windowMs = 60_000
): { allowed: boolean; retryAfterSec: number } {
  const key = `login:${email.trim().toLowerCase()}`;
  return evaluateWindow(key, maxFailures, windowMs, false);
}

export function recordLoginFailure(email: string, windowMs = 60_000): void {
  const key = `login:${email.trim().toLowerCase()}`;
  const now = Date.now();
  const cutoff = now - windowMs;
  const active = (buckets.get(key) ?? []).filter((ts) => ts > cutoff);
  active.push(now);
  buckets.set(key, active);
}

export function clearLoginFailures(email: string): void {
  buckets.delete(`login:${email.trim().toLowerCase()}`);
}

export function checkActorRateLimit(
  actorId: string,
  action: string,
  maxRequests = 40,
  windowMs = 60_000
): { allowed: boolean; retryAfterSec: number } {
  const key = `actor:${action}:${actorId}`;
  return evaluateWindow(key, maxRequests, windowMs, true);
}
