import { NextResponse } from 'next/server';
import { listDocumentosTarea, registrarVersionDocumento } from '@/lib/backend/adapter';
import { jsonFromApiResult, requireActor } from '@/lib/backend/http';

export async function GET(_req: Request, context: { params: { id: string } }) {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;

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
  const auth = await requireActor();
  if (!auth.ok) return auth.response;

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

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error_code: 'ERR-002', message: 'Debe adjuntar un archivo válido.' },
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
