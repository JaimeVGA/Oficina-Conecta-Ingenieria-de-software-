import { NextResponse } from 'next/server';
import { LOCAL_SESSION_COOKIE, logoutSession } from '@/lib/backend/adapter';

export async function POST() {
  const res = NextResponse.json({ ok: true }, { status: 200 });
  await logoutSession(res);
  res.cookies.set(LOCAL_SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
