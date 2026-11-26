import { NextResponse } from 'next/server';
import {
  crearDepartamento,
  crearProyecto,
  getCatalogos,
  listProyectos,
} from '@/lib/backend/adapter';
import { invalidUuidResponse, jsonFromApiResult, requireActor } from '@/lib/backend/http';
import { exceedsMaxLength, isValidUuid } from '@/lib/security/validation';

export async function GET() {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;

  const [proyectos, catalogos] = await Promise.all([
    listProyectos(auth.actor),
    getCatalogos(auth.actor),
  ]);
  return NextResponse.json({ ok: true, proyectos, ...catalogos });
}

export async function POST(req: Request) {
  const auth = await requireActor(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as {
    action?: 'proyecto' | 'departamento';
    nombre?: string;
    departamento_id?: string;
    descripcion?: string;
    fecha_fin_proyecto?: string;
    sede_id?: string;
  };

  if (exceedsMaxLength(body.nombre, 200) || exceedsMaxLength(body.descripcion, 2000)) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-002', message: 'El nombre o la descripción exceden la longitud máxima permitida.' },
      { status: 422 }
    );
  }

  if (body.action === 'departamento') {
    const res = await crearDepartamento(auth.actor, body.nombre ?? '');
    return jsonFromApiResult(res);
  }

  if (!isValidUuid(body.departamento_id)) {
    return invalidUuidResponse('departamento_id');
  }

  const res = await crearProyecto(auth.actor, {
    departamento_id: body.departamento_id,
    nombre: body.nombre ?? '',
    descripcion: body.descripcion ?? '',
    fecha_fin_proyecto: body.fecha_fin_proyecto ?? '',
    sede_id: body.sede_id,
  });
  return jsonFromApiResult(res);
}
