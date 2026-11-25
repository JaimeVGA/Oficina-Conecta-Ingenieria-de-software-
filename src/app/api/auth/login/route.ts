import { NextResponse } from 'next/server';
import { LOCAL_SESSION_COOKIE, loginWithEmailPassword } from '@/lib/backend/adapter';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = body.email?.trim() ?? '';
  const password = body.password ?? '';

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-002', message: 'Correo y contraseña obligatorios.' },
      { status: 422 }
    );
  }

  const res = NextResponse.json({ ok: false }, { status: 401 });
  const result = await loginWithEmailPassword(email, password, res);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error_code: 'ERR-001', message: result.message }, { status: 401 });
  }

  const finalRes = NextResponse.json({ ok: true, perfil: result.perfil }, { status: 200 });
  // Copiar cookies configuradas por supabase/ssr al response final
  for (const c of res.cookies.getAll()) {
    finalRes.cookies.set(c.name, c.value, c);
  }
  if (result.localToken) {
    finalRes.cookies.set(LOCAL_SESSION_COOKIE, result.localToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });
  }
  return finalRes;
}
