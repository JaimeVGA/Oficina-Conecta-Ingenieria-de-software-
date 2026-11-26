import { NextResponse } from 'next/server';
import { LOCAL_SESSION_COOKIE, loginWithEmailPassword } from '@/lib/backend/adapter';
import { checkLoginRateLimit, clearLoginFailures, recordLoginFailure } from '@/lib/security/rateLimit';
import { exceedsMaxLength, verifySameOriginMutation } from '@/lib/security/validation';

export async function POST(req: Request) {
  const csrf = verifySameOriginMutation(req);
  if (!csrf.ok) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-001', message: csrf.message },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = body.email?.trim() ?? '';
  const password = body.password ?? '';

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-002', message: 'Correo y contraseña obligatorios.' },
      { status: 422, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  if (exceedsMaxLength(email, 254) || exceedsMaxLength(password, 256)) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-002', message: 'Credenciales fuera de longitud permitida.' },
      { status: 422, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const rl = checkLoginRateLimit(email);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error_code: 'ERR-001',
        message: `Demasiados intentos fallidos. Espere ${rl.retryAfterSec} segundos e intente nuevamente.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rl.retryAfterSec),
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  const res = NextResponse.json({ ok: false }, { status: 401 });
  const result = await loginWithEmailPassword(email, password, res);
  if (!result.ok) {
    recordLoginFailure(email);
    return NextResponse.json(
      { ok: false, error_code: 'ERR-001', message: result.message },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  clearLoginFailures(email);
  const finalRes = NextResponse.json(
    { ok: true, perfil: result.perfil },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
  for (const c of res.cookies.getAll()) {
    finalRes.cookies.set(c.name, c.value, c);
  }
  if (result.localToken) {
    finalRes.cookies.set(LOCAL_SESSION_COOKIE, result.localToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });
  }
  return finalRes;
}
