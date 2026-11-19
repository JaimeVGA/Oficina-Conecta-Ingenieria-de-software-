import { NextResponse } from 'next/server';
import { filterTasksByQuery, listTareas } from '@/lib/backend/adapter';
import { requireActor } from '@/lib/backend/http';
import { generateIcsCalendar } from '@/lib/ics/generator';
import type { SedeId } from '@/lib/supabase/types';

export async function GET(req: Request) {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const sedeParam = searchParams.get('sede_id') as SedeId | null;
  const proyectoParam = searchParams.get('proyecto_id');
  const tareaParam = searchParams.get('tarea_id');

  const all = await listTareas(auth.actor);
  const filtered = filterTasksByQuery(all, {
    sede_id: sedeParam,
    proyecto_id: proyectoParam,
    tarea_id: tareaParam,
  });

  if (tareaParam && filtered.length === 0) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-001', message: 'Tarea no encontrada o fuera de su alcance permitido.' },
      { status: 403 }
    );
  }

  const icsBody = generateIcsCalendar(filtered);
  const first = filtered[0];
  const fileName = tareaParam && first
    ? `${first.folio}_seq${first.sequence_ics}.ics`
    : sedeParam
      ? `oficina_conecta_${sedeParam}.ics`
      : 'oficina_conecta_calendario.ics';

  return new NextResponse(icsBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
