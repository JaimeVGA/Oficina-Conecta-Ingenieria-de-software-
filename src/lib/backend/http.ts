import { NextResponse } from 'next/server';
import { getCurrentActor } from '@/lib/backend/adapter';
import type { ApiResult, PerfilUsuario } from '@/lib/supabase/types';

export function jsonFromApiResult(res: ApiResult) {
  return NextResponse.json(
    {
      ok: res.ok,
      ...(res.error_code ? { error_code: res.error_code } : {}),
      ...(res.sqlstate ? { sqlstate: res.sqlstate } : {}),
      ...(res.message ? { message: res.message } : {}),
      ...(res.data ?? {}),
    },
    { status: res.http_status }
  );
}

export async function requireActor(): Promise<
  { ok: true; actor: PerfilUsuario } | { ok: false; response: NextResponse }
> {
  const actor = await getCurrentActor();
  if (!actor) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error_code: 'ERR-001', message: 'Sesión no autenticada o expirada.' },
        { status: 401 }
      ),
    };
  }
  return { ok: true, actor };
}
