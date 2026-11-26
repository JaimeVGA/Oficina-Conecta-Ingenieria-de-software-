import { NextResponse } from 'next/server';
import { listDocumentosTarea, registrarVersionDocumento } from '@/lib/backend/adapter';
import { invalidUuidResponse, jsonFromApiResult, requireActor } from '@/lib/backend/http';
import { checkActorRateLimit } from '@/lib/security/rateLimit';
import { exceedsMaxLength, isValidUuid, validateSafeDocumentUpload } from '@/lib/security/validation';

export async function GET(_req: Request, context: { params: { id: string } }) {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;
  if (!isValidUuid(context.params.id)) return invalidUuidResponse('tarea_id');

  const docs = await listDocumentosTarea(auth.actor, context.params.id);
  if (docs === null) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-001', message: 'Sin permiso para consultar documentos de esta tarea.' },
      { status: 403 }
    );
  }
  return NextResponse.json({ ok: true, documentos: docs });
}

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireActor(req);
  if (!auth.ok) return auth.response;
  if (!isValidUuid(context.params.id)) return invalidUuidResponse('tarea_id');

  const rl = checkActorRateLimit(auth.actor.id, 'upload_doc', 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-001', message: `Límite de carga excedido. Espere ${rl.retryAfterSec} segundos.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-002', message: 'Formato multipart/form-data requerido.' },
      { status: 422 }
    );
  }

  const file = formData.get('file');
  const nombreDocumento = String(formData.get('nombre_documento') ?? '');
  const descripcionCambio = String(formData.get('descripcion_cambio') ?? '');

  if (exceedsMaxLength(nombreDocumento, 200) || exceedsMaxLength(descripcionCambio, 2000)) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-002', message: 'Nombre o descripción del cambio exceden la longitud máxima.' },
      { status: 422 }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-002', message: 'Debe adjuntar un archivo válido.' },
      { status: 422 }
    );
  }

  const fileCheck = validateSafeDocumentUpload({
    name: file.name || 'documento.bin',
    type: file.type || 'application/octet-stream',
    size: file.size,
  });
  if (!fileCheck.ok) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-002', message: fileCheck.message },
      { status: 422 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const res = await registrarVersionDocumento(auth.actor, {
    tarea_id: context.params.id,
    nombre_documento: nombreDocumento,
    nombre_original: file.name || 'documento.bin',
    mime_type: file.type || 'application/octet-stream',
    fileBuffer: Buffer.from(arrayBuffer),
    descripcion_cambio: descripcionCambio,
  });

  return jsonFromApiResult(res);
}
