import { NextResponse } from 'next/server';
import { resolverSolicitudAutorizacion } from '@/lib/backend/adapter';
import { jsonFromApiResult, requireActor } from '@/lib/backend/http';
import type { Dictamen } from '@/lib/supabase/types';

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as {
    dictamen?: Dictamen;
    motivo_resolucion?: string;
    idempotency_key?: string;
    simular_fallo_bitacora?: boolean;
  };

  if (!body.idempotency_key) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-002', message: 'La clave de idempotencia (UUID) es obligatoria.' },
      { status: 422 }
    );
  }

  const res = await resolverSolicitudAutorizacion(auth.actor, {
    solicitud_id: context.params.id,
    dictamen: (body.dictamen ?? 'APROBADA') as Dictamen,
    motivo_resolucion: body.motivo_resolucion ?? '',
    idempotency_key: body.idempotency_key,
    simular_fallo_bitacora: Boolean(body.simular_fallo_bitacora),
  });
  return jsonFromApiResult(res);
}
