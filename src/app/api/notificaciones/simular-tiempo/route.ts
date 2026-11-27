import { evaluarRecordatoriosSimulados } from '@/lib/backend/adapter';
import { jsonFromApiResult, requireActor } from '@/lib/backend/http';

export async function POST(req: Request) {
  const auth = await requireActor(req);
  if (!auth.ok) return auth.response;

  const res = await evaluarRecordatoriosSimulados(auth.actor, new Date().toISOString());
  return jsonFromApiResult(res);
}
