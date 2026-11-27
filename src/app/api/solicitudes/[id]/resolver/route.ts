import { NextResponse } from 'next/server';
import { resolverSolicitudAutorizacion } from '@/lib/backend/adapter';
import { invalidUuidResponse, jsonFromApiResult, requireActor } from '@/lib/backend/http';
import { exceedsMaxLength, isValidUuid } from '@/lib/security/validation';
import type { Dictamen } from '@/lib/supabase/types';

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireActor(req);
  if (!auth.ok) return auth.response;
  if (!isValidUuid(context.params.id)) return invalidUuidResponse('solicitud_id');

  const body = (await req.json().catch(() => ({}))) as {
    dictamen?: Dictamen;
    motivo_resolucion?: string;
    idempotency_key?: string;
  };

  if (!body.idempotency_key || !isValidUuid(body.idempotency_key)) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-002', message: 'La clave de idempotencia (UUID) es obligatoria y debe ser válida.' },
      { status: 422 }
    );
  }
  if (exceedsMaxLength(body.motivo_resolucion, 3000)) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-002', message: 'El motivo de resolución excede la longitud máxima permitida.' },
      { status: 422 }
    );
  }

  const res = await resolverSolicitudAutorizacion(auth.actor, {
    solicitud_id: context.params.id,
    dictamen: (body.dictamen ?? 'APROBADA') as Dictamen,
    motivo_resolucion: body.motivo_resolucion ?? '',
    idempotency_key: body.idempotency_key,
    simular_fallo_bitacora: false,
  });
  return jsonFromApiResult(res);
}
