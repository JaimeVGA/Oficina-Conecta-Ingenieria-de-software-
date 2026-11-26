import { designarVersionVigente } from '@/lib/backend/adapter';
import { invalidUuidResponse, jsonFromApiResult, requireActor } from '@/lib/backend/http';
import { isValidUuid } from '@/lib/security/validation';

export async function POST(req: Request, context: { params: { versionId: string } }) {
  const auth = await requireActor(req);
  if (!auth.ok) return auth.response;
  if (!isValidUuid(context.params.versionId)) return invalidUuidResponse('version_id');

  const res = await designarVersionVigente(auth.actor, context.params.versionId);
  return jsonFromApiResult(res);
}
