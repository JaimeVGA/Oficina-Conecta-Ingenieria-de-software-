import { NextResponse } from 'next/server';
import { crearSolicitudAutorizacion, listSolicitudes } from '@/lib/backend/adapter';
import { jsonFromApiResult, requireActor } from '@/lib/backend/http';
import type { TipoSolicitud } from '@/lib/supabase/types';

export async function GET() {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;
  const solicitudes = await listSolicitudes(auth.actor);
  return NextResponse.json({ ok: true, solicitudes });
}

export async function POST(req: Request) {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as {
    tarea_id?: string;
    tipo?: TipoSolicitud;
    motivo_solicitud?: string;
    idempotency_key?: string;
    fecha_propuesta?: string | null;
    alcance_propuesto?: string | null;
  };

  if (!body.idempotency_key) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-002', message: 'La clave de idempotencia (UUID) es obligatoria.' },
      { status: 422 }
    );
  }

  const res = await crearSolicitudAutorizacion(auth.actor, {
    tarea_id: body.tarea_id ?? '',
    tipo: (body.tipo ?? 'PRORROGA_FECHA') as TipoSolicitud,
    motivo_solicitud: body.motivo_solicitud ?? '',
    idempotency_key: body.idempotency_key,
    fecha_propuesta: body.fecha_propuesta ?? null,
    alcance_propuesto: body.alcance_propuesto ?? null,
  });
  return jsonFromApiResult(res);
}
