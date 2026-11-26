import { NextResponse } from 'next/server';
import { listBitacora, rechazarMutacionBitacora } from '@/lib/backend/adapter';
import { invalidUuidResponse, jsonFromApiResult, requireActor } from '@/lib/backend/http';
import { isValidUuid } from '@/lib/security/validation';

export async function GET(req: Request) {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(req.url);
  const tareaId = searchParams.get('tarea_id') ?? undefined;
  if (tareaId && !isValidUuid(tareaId)) return invalidUuidResponse('tarea_id');
  const registros = await listBitacora(auth.actor, tareaId);
  return NextResponse.json({ ok: true, registros });
}

export async function PUT(req: Request) {
  const auth = await requireActor(req);
  if (!auth.ok) return auth.response;
  return jsonFromApiResult(rechazarMutacionBitacora('PUT'));
}

export async function PATCH(req: Request) {
  const auth = await requireActor(req);
  if (!auth.ok) return auth.response;
  return jsonFromApiResult(rechazarMutacionBitacora('PATCH'));
}

export async function DELETE(req: Request) {
  const auth = await requireActor(req);
  if (!auth.ok) return auth.response;
  return jsonFromApiResult(rechazarMutacionBitacora('DELETE'));
}
