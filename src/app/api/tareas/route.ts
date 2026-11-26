import { NextResponse } from 'next/server';
import { crearTarea, listTareas } from '@/lib/backend/adapter';
import { invalidUuidResponse, jsonFromApiResult, requireActor } from '@/lib/backend/http';
import { exceedsMaxLength, isValidUuid } from '@/lib/security/validation';

export async function GET() {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;
  const tareas = await listTareas(auth.actor);
  return NextResponse.json({ ok: true, tareas });
}

export async function POST(req: Request) {
  const auth = await requireActor(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as {
    proyecto_id?: string;
    departamento_id?: string;
    responsable_id?: string;
    titulo?: string;
    alcance?: string;
    fecha_limite?: string;
    ahora_referencia?: string;
  };

  if (!isValidUuid(body.proyecto_id)) return invalidUuidResponse('proyecto_id');
  if (!isValidUuid(body.departamento_id)) return invalidUuidResponse('departamento_id');
  if (!isValidUuid(body.responsable_id)) return invalidUuidResponse('responsable_id');
  if (exceedsMaxLength(body.titulo, 300) || exceedsMaxLength(body.alcance, 5000)) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-002', message: 'Título o alcance exceden la longitud máxima permitida.' },
      { status: 422 }
    );
  }

  const res = await crearTarea(auth.actor, {
    proyecto_id: body.proyecto_id,
    departamento_id: body.departamento_id,
    responsable_id: body.responsable_id,
    titulo: body.titulo ?? '',
    alcance: body.alcance ?? '',
    fecha_limite: body.fecha_limite ?? '',
    ahora_referencia: body.ahora_referencia,
  });
  return jsonFromApiResult(res);
}
