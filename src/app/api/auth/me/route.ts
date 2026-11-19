import { NextResponse } from 'next/server';
import { getBackendMode, getCatalogos, getCurrentActor } from '@/lib/backend/adapter';

export async function GET() {
  const actor = await getCurrentActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error_code: 'ERR-001', message: 'No autenticado.' }, { status: 401 });
  }
  const catalogos = await getCatalogos(actor);
  return NextResponse.json({
    ok: true,
    mode: getBackendMode(),
    perfil: actor,
    ...catalogos,
  });
}
