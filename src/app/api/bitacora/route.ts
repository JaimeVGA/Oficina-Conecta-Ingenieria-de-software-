import { NextResponse } from 'next/server';
import { listBitacora, rechazarMutacionBitacora } from '@/lib/backend/adapter';
import { jsonFromApiResult, requireActor } from '@/lib/backend/http';

export async function GET(req: Request) {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(req.url);
  const tareaId = searchParams.get('tarea_id') ?? undefined;
  const registros = await listBitacora(auth.actor, tareaId);
  return NextResponse.json({ ok: true, registros });
}

export async function PUT() {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;
  return jsonFromApiResult(rechazarMutacionBitacora('PUT'));
}

export async function PATCH() {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;
  return jsonFromApiResult(rechazarMutacionBitacora('PATCH'));
}

export async function DELETE() {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;
  return jsonFromApiResult(rechazarMutacionBitacora('DELETE'));
}
