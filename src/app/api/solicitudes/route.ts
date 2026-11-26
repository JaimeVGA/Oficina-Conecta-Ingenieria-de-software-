import { NextResponse } from 'next/server';
import { crearSolicitudAutorizacion, listSolicitudes } from '@/lib/backend/adapter';
import { invalidUuidResponse, jsonFromApiResult, requireActor } from '@/lib/backend/http';
import { checkActorRateLimit } from '@/lib/security/rateLimit';
import { exceedsMaxLength, isValidUuid } from '@/lib/security/validation';
import type { TipoSolicitud } from '@/lib/supabase/types';

export async function GET() {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;
  const solicitudes = await listSolicitudes(auth.actor);
  return NextResponse.json({ ok: true, solicitudes });
}

export async function POST(req: Request) {
  const auth = await requireActor(req);
  if (!auth.ok) return auth.response;

  const rl = checkActorRateLimit(auth.actor.id, 'create_sol', 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-001', message: `Límite de solicitudes excedido. Espere ${rl.retryAfterSec} segundos.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    tarea_id?: string;
    tipo?: TipoSolicitud;
    motivo_solicitud?: string;
    idempotency_key?: string;
    fecha_propuesta?: string | null;
    alcance_propuesto?: string | null;
  };

  if (!isValidUuid(body.tarea_id)) return invalidUuidResponse('tarea_id');
  if (!body.idempotency_key || !isValidUuid(body.idempotency_key)) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-002', message: 'La clave de idempotencia (UUID) es obligatoria y debe ser válida.' },
      { status: 422 }
    );
  }
  if (exceedsMaxLength(body.motivo_solicitud, 3000) || exceedsMaxLength(body.alcance_propuesto, 5000)) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-002', message: 'Motivo o alcance propuesto exceden la longitud máxima permitida.' },
      { status: 422 }
    );
  }

  const res = await crearSolicitudAutorizacion(auth.actor, {
    tarea_id: body.tarea_id,
    tipo: (body.tipo ?? 'PRORROGA_FECHA') as TipoSolicitud,
    motivo_solicitud: body.motivo_solicitud ?? '',
    idempotency_key: body.idempotency_key,
    fecha_propuesta: body.fecha_propuesta ?? null,
    alcance_propuesto: body.alcance_propuesto ?? null,
  });
  return jsonFromApiResult(res);
}
