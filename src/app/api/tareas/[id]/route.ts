import { NextResponse } from 'next/server';
import {
  actualizarAvanceTarea,
  actualizarTareaGerencia,
  getTareaById,
} from '@/lib/backend/adapter';
import { jsonFromApiResult, requireActor } from '@/lib/backend/http';
import type { EstadoTarea } from '@/lib/supabase/types';

export async function GET(_req: Request, context: { params: { id: string } }) {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;

  const tarea = await getTareaById(auth.actor, context.params.id);
  if (!tarea) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-001', message: 'Tarea no encontrada o sin permisos de acceso.' },
      { status: 403 }
    );
  }
  return NextResponse.json({ ok: true, tarea });
}

export async function PATCH(req: Request, context: { params: { id: string } }) {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as {
    modo?: 'avance' | 'gerencia';
    estado?: EstadoTarea;
    porcentaje_avance?: number;
    titulo?: string;
    fecha_limite?: string;
    motivo_cambio?: string;
    diferir_invalidacion_cp004?: boolean;
  };

  if (auth.actor.rol === 'DN') {
    return NextResponse.json(
      {
        ok: false,
        error_code: 'ERR-001',
        message: 'ERR-001: Dirección Nacional no puede modificar tareas locales directamente (PER-003).',
      },
      { status: 403 }
    );
  }

  if (body.modo === 'avance' || auth.actor.rol === 'OP') {
    const res = await actualizarAvanceTarea(
      auth.actor,
      context.params.id,
      body.estado ?? 'EN_PROCESO',
      Number(body.porcentaje_avance ?? 0)
    );
    return jsonFromApiResult(res);
  }

  const res = await actualizarTareaGerencia(auth.actor, context.params.id, {
    titulo: body.titulo,
    fecha_limite: body.fecha_limite,
    estado: body.estado,
    motivo_cambio: body.motivo_cambio,
    diferir_invalidacion_cp004: body.diferir_invalidacion_cp004,
  });
  return jsonFromApiResult(res);
}
