import { NextResponse } from 'next/server';
import {
  crearDepartamento,
  crearProyecto,
  getCatalogos,
  listProyectos,
} from '@/lib/backend/adapter';
import { jsonFromApiResult, requireActor } from '@/lib/backend/http';

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
  const auth = await requireActor();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as {
    action?: 'proyecto' | 'departamento';
    nombre?: string;
    departamento_id?: string;
    descripcion?: string;
    fecha_fin_proyecto?: string;
    sede_id?: string;
  };

  if (body.action === 'departamento') {
    const res = await crearDepartamento(auth.actor, body.nombre ?? '');
    return jsonFromApiResult(res);
  }

  const res = await crearProyecto(auth.actor, {
    departamento_id: body.departamento_id ?? '',
    nombre: body.nombre ?? '',
    descripcion: body.descripcion ?? '',
    fecha_fin_proyecto: body.fecha_fin_proyecto ?? '',
    sede_id: body.sede_id,
  });
  return jsonFromApiResult(res);
}
