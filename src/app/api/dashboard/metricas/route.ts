import { NextResponse } from 'next/server';
import { obtenerMetricasDashboard } from '@/lib/backend/adapter';
import { requireActor } from '@/lib/backend/http';

export async function GET() {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;
  const sedes = await obtenerMetricasDashboard(auth.actor);
  return NextResponse.json({ ok: true, rol: auth.actor.rol, sedes });
}
