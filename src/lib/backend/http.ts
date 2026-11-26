import { NextResponse } from 'next/server';
import { getCurrentActor } from '@/lib/backend/adapter';
import { verifySameOriginMutation } from '@/lib/security/validation';
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
    {
      status: res.http_status,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}

export function invalidUuidResponse(campo = 'identificador') {
  return NextResponse.json(
    { ok: false, error_code: 'ERR-002', message: `El formato de ${campo} no es un UUID válido.` },
    { status: 422, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function requireActor(req?: Request): Promise<
  { ok: true; actor: PerfilUsuario } | { ok: false; response: NextResponse }
> {
  if (req) {
    const csrf = verifySameOriginMutation(req);
    if (!csrf.ok) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error_code: 'ERR-001', message: csrf.message },
          { status: 403, headers: { 'Cache-Control': 'no-store' } }
        ),
      };
    }
  }

  const actor = await getCurrentActor();
  if (!actor) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error_code: 'ERR-001', message: 'Sesión no autenticada o expirada.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }
  return { ok: true, actor };
}
