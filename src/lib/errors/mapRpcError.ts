import type { ApiResult, ErrorCode } from '@/lib/supabase/types';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  'ERR-001': 403,
  'ERR-002': 422,
  'ERR-003': 403,
  'ERR-004': 409,
  'ERR-005': 500,
};

export function resolveHttpStatus(errorCode?: ErrorCode, explicitStatus?: number): number {
  if (explicitStatus && explicitStatus >= 100 && explicitStatus <= 599) {
    return explicitStatus;
  }
  if (errorCode && errorCode in STATUS_BY_CODE) {
    return STATUS_BY_CODE[errorCode];
  }
  return 500;
}

export function buildErrorResult(
  errorCode: ErrorCode,
  message: string,
  httpStatus?: number,
  extra?: Record<string, unknown>
): ApiResult {
  return {
    ok: false,
    error_code: errorCode,
    http_status: resolveHttpStatus(errorCode, httpStatus),
    message,
    ...(extra ? { data: extra } : {}),
  };
}

export function normalizeRpcResponse(raw: unknown): ApiResult {
  if (!raw || typeof raw !== 'object') {
    return buildErrorResult('ERR-005', 'Respuesta inválida del servidor de base de datos.', 500);
  }
  const obj = raw as Record<string, unknown>;
  const ok = Boolean(obj.ok);
  const errorCode = typeof obj.error_code === 'string' ? (obj.error_code as ErrorCode) : undefined;
  const httpStatus = typeof obj.http_status === 'number' ? obj.http_status : ok ? 200 : resolveHttpStatus(errorCode);
  const message = typeof obj.message === 'string' ? obj.message : undefined;
  const sqlstate = typeof obj.sqlstate === 'string' ? obj.sqlstate : undefined;

  return {
    ok,
    http_status: httpStatus,
    ...(errorCode ? { error_code: errorCode } : {}),
    ...(sqlstate ? { sqlstate } : {}),
    ...(message ? { message } : {}),
    data: obj,
  };
}
