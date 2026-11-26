import { verificarHashDocumento } from '@/lib/backend/adapter';
import { invalidUuidResponse, jsonFromApiResult, requireActor } from '@/lib/backend/http';
import { isValidUuid } from '@/lib/security/validation';

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireActor(req);
  if (!auth.ok) return auth.response;
  if (!isValidUuid(context.params.id)) return invalidUuidResponse('tarea_id');

  const body = (await req.json().catch(() => ({}))) as {
    nombre_documento?: string;
    hash_sha256?: string;
  };

  const res = await verificarHashDocumento(
    auth.actor,
    context.params.id,
    body.nombre_documento ?? '',
    body.hash_sha256 ?? ''
  );
  return jsonFromApiResult(res);
}
