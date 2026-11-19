import { NextResponse } from 'next/server';
import { getArchivoVersion } from '@/lib/backend/adapter';
import { jsonFromApiResult, requireActor } from '@/lib/backend/http';

export async function GET(_req: Request, context: { params: { versionId: string } }) {
  const auth = await requireActor();
  if (!auth.ok) return auth.response;

  const res = await getArchivoVersion(auth.actor, context.params.versionId);
  if ('signedUrl' in res) {
    return NextResponse.redirect(res.signedUrl);
  }
  if ('buffer' in res) {
    return new NextResponse(new Uint8Array(res.buffer), {
      status: 200,
      headers: {
        'Content-Type': res.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(res.nombreOriginal)}"`,
      },
    });
  }
  return jsonFromApiResult(res);
}
