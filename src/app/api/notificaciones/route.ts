import { NextResponse } from 'next/server';
import { listCorreosSimulados } from '@/lib/backend/adapter';
import { requireActor } from '@/lib/backend/http';

export async function GET() {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;
  const correos = await listCorreosSimulados(auth.actor);
  return NextResponse.json({ ok: true, correos });
}
