import { evaluarRecordatoriosSimulados } from '@/lib/backend/adapter';
import { jsonFromApiResult, requireActor } from '@/lib/backend/http';

export async function POST(req: Request) {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as {
    fecha_evaluacion?: string;
    adelantar_horas?: number;
  };

  let fechaEval = body.fecha_evaluacion;
  if (!fechaEval && typeof body.adelantar_horas === 'number' && !Number.isNaN(body.adelantar_horas)) {
    fechaEval = new Date(Date.now() + body.adelantar_horas * 3600_000).toISOString();
  }

  const res = await evaluarRecordatoriosSimulados(auth.actor, fechaEval);
  return jsonFromApiResult(res);
}
