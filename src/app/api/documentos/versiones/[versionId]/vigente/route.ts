import { designarVersionVigente } from '@/lib/backend/adapter';
import { jsonFromApiResult, requireActor } from '@/lib/backend/http';

export async function POST(_req: Request, context: { params: { versionId: string } }) {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;

  const res = await designarVersionVigente(auth.actor, context.params.versionId);
  return jsonFromApiResult(res);
}
