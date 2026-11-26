import { NextResponse } from 'next/server';
import { LOCAL_SESSION_COOKIE, logoutSession } from '@/lib/backend/adapter';
import { verifySameOriginMutation } from '@/lib/security/validation';

export async function POST(req: Request) {
  const csrf = verifySameOriginMutation(req);
  if (!csrf.ok) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-001', message: csrf.message },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const res = NextResponse.json({ ok: true }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  await logoutSession(res);
  res.cookies.set(LOCAL_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
