import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { getLocalEngine } from '@/lib/backend/localEngine';
import { buildErrorResult, normalizeRpcResponse } from '@/lib/errors/mapRpcError';
import type {
  ApiResult,
  BitacoraEnriquecida,
  CorreoSimulado,
  Departamento,
  Dictamen,
  DocumentoConVersiones,
  EstadoTarea,
  MetricaSede,
  PerfilUsuario,
  Proyecto,
  Sede,
  SedeId,
  SolicitudEnriquecida,
  TareaEnriquecida,
  TipoSolicitud,
} from '@/lib/supabase/types';

export const LOCAL_SESSION_COOKIE = 'oc_local_session';

function getSessionSecret(): string {
  return process.env.LOCAL_SESSION_SECRET ?? 'oficina-conecta-502a-equipo1-local-secret';
}

export function signLocalSessionToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyLocalSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string };
    return typeof decoded.sub === 'string' ? decoded.sub : null;
  } catch {
    return null;
  }
}

export function getBackendMode(): 'supabase' | 'local' {
  return isSupabaseServerConfigured() ? 'supabase' : 'local';
}

export async function getCurrentActor(): Promise<PerfilUsuario | null> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: perfil } = await supabase
      .from('perfiles_usuario')
      .select('*')
      .eq('id', user.id)
      .eq('activo', true)
      .maybeSingle();
    return (perfil as PerfilUsuario | null) ?? null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(LOCAL_SESSION_COOKIE)?.value;
  const userId = verifyLocalSessionToken(token);
  if (!userId) return null;
  return getLocalEngine().getPerfilById(userId);
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
  responseObj?: { cookies: { set: (...args: any[]) => any } }
): Promise<{ ok: true; perfil: PerfilUsuario; localToken?: string } | { ok: false; message: string }> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient(responseObj);
    if (!supabase) return { ok: false, message: 'Cliente Supabase no disponible.' };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      console.error('[adapter:login] Error signInWithPassword:', error);
      return { ok: false, message: error?.message ?? 'Credenciales inválidas. Verifique su correo y contraseña.' };
    }
    const { data: perfil, error: perfilErr } = await supabase
      .from('perfiles_usuario')
      .select('*')
      .eq('id', data.user.id)
      .eq('activo', true)
      .maybeSingle();
    if (perfilErr) {
      console.error('[adapter:login] Error consultando perfiles_usuario:', perfilErr);
      return { ok: false, message: `Error consultando perfil: ${perfilErr.message}` };
    }
    if (!perfil) {
      return { ok: false, message: 'Su cuenta no tiene un perfil operativo activo.' };
    }
    return { ok: true, perfil: perfil as PerfilUsuario };
  }

  const perfil = getLocalEngine().authenticate(email, password);
  if (!perfil) {
    return { ok: false, message: 'Credenciales inválidas. Verifique su correo y contraseña.' };
  }
  return { ok: true, perfil, localToken: signLocalSessionToken(perfil.id) };
}

export async function logoutSession(): Promise<void> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      await supabase.auth.signOut({ scope: 'local' });
    }
  }
}

export async function getCatalogos(actor: PerfilUsuario): Promise<{
  sedes: Sede[];
  departamentos: Departamento[];
  usuarios: PerfilUsuario[];
}> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { sedes: [], departamentos: [], usuarios: [] };
    const [sedesRes, deptosRes, usersRes] = await Promise.all([
      supabase.from('sedes').select('*').order('id'),
      supabase.from('departamentos').select('*').order('nombre'),
      supabase.from('perfiles_usuario').select('*').eq('activo', true).order('nombre_completo'),
    ]);
    return {
      sedes: (sedesRes.data ?? []) as Sede[],
      departamentos: (deptosRes.data ?? []) as Departamento[],
      usuarios: (usersRes.data ?? []) as PerfilUsuario[],
    };
  }
  return getLocalEngine().getCatalogos(actor);
}

export async function listProyectos(actor: PerfilUsuario): Promise<Proyecto[]> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return [];
    const { data } = await supabase.from('proyectos').select('*').order('creado_en', { ascending: false });
    return (data ?? []) as Proyecto[];
  }
  return getLocalEngine().listProyectos(actor);
}

export async function crearDepartamento(actor: PerfilUsuario, nombre: string): Promise<ApiResult> {
  if (getBackendMode() === 'supabase') {
    if (actor.rol !== 'GS' || !actor.sede_id) {
      return buildErrorResult('ERR-001', 'Solo la Gerencia de Sede puede crear departamentos en su sede.', 403);
    }
    const clean = nombre.trim();
    if (!clean) return buildErrorResult('ERR-002', 'El nombre del departamento es obligatorio.', 422);
    const supabase = await createSupabaseServerClient();
    if (!supabase) return buildErrorResult('ERR-005', 'Cliente Supabase no disponible.', 500);
    const { data, error } = await supabase
      .from('departamentos')
      .insert({ sede_id: actor.sede_id, nombre: clean })
      .select()
      .single();
    if (error) return buildErrorResult('ERR-004', error.message, 409);
    return { ok: true, http_status: 201, data: { departamento: data } };
  }
  return getLocalEngine().crearDepartamento(actor, nombre);
}

export async function crearProyecto(
  actor: PerfilUsuario,
  input: { departamento_id: string; nombre: string; descripcion: string; fecha_fin_proyecto: string; sede_id?: string }
): Promise<ApiResult> {
  if (getBackendMode() === 'supabase') {
    if (actor.rol !== 'GS' || !actor.sede_id) {
      return buildErrorResult('ERR-001', 'Solo la Gerencia de Sede puede crear proyectos en su sede.', 403);
    }
    if (input.sede_id && input.sede_id !== actor.sede_id) {
      return buildErrorResult('ERR-001', 'Acceso denegado: no puede crear proyectos en otra sede.', 403);
    }
    const supabase = await createSupabaseServerClient();
    if (!supabase) return buildErrorResult('ERR-005', 'Cliente Supabase no disponible.', 500);
    const { data, error } = await supabase
      .from('proyectos')
      .insert({
        sede_id: actor.sede_id,
        departamento_id: input.departamento_id,
        nombre: input.nombre.trim(),
        descripcion: input.descripcion.trim(),
        fecha_fin_proyecto: input.fecha_fin_proyecto,
        creado_por: actor.id,
      })
      .select()
      .single();
    if (error) return buildErrorResult('ERR-001', error.message, 403);
    return { ok: true, http_status: 201, data: { proyecto: data } };
  }
  return getLocalEngine().crearProyecto(actor, input);
}

export async function listTareas(actor: PerfilUsuario): Promise<TareaEnriquecida[]> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from('tareas')
      .select(
        `*,
        sedes(nombre),
        proyectos(nombre, fecha_fin_proyecto),
        departamentos(nombre),
        perfiles_usuario!tareas_responsable_id_fkey(nombre_completo, correo)`
      )
      .order('fecha_limite', { ascending: true });
    return (data ?? []).map((row: Record<string, unknown>) => {
      const s = row.sedes as { nombre?: string } | null;
      const p = row.proyectos as { nombre?: string; fecha_fin_proyecto?: string } | null;
      const d = row.departamentos as { nombre?: string } | null;
      const u = row.perfiles_usuario as { nombre_completo?: string; correo?: string } | null;
      return {
        ...(row as unknown as TareaEnriquecida),
        sede_nombre: s?.nombre ?? String(row.sede_id),
        proyecto_nombre: p?.nombre ?? '',
        proyecto_fecha_fin: p?.fecha_fin_proyecto ?? '',
        departamento_nombre: d?.nombre ?? '',
        responsable_nombre: u?.nombre_completo ?? '',
        responsable_correo: u?.correo ?? '',
      };
    });
  }
  return getLocalEngine().listTareas(actor);
}

export async function getTareaById(actor: PerfilUsuario, tareaId: string): Promise<TareaEnriquecida | null> {
  const all = await listTareas(actor);
  return all.find((t) => t.id === tareaId) ?? null;
}

export async function crearTarea(
  actor: PerfilUsuario,
  input: {
    proyecto_id: string;
    departamento_id: string;
    responsable_id: string;
    titulo: string;
    alcance: string;
    fecha_limite: string;
    ahora_referencia?: string;
  }
): Promise<ApiResult> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return buildErrorResult('ERR-005', 'Cliente Supabase no disponible.', 500);
    const { data, error } = await supabase.rpc('crear_tarea', {
      p_proyecto_id: input.proyecto_id,
      p_departamento_id: input.departamento_id,
      p_responsable_id: input.responsable_id,
      p_titulo: input.titulo,
      p_alcance: input.alcance,
      p_fecha_limite: input.fecha_limite,
    });
    if (error) return buildErrorResult('ERR-005', error.message, 500);
    return normalizeRpcResponse(data);
  }
  return getLocalEngine().crearTarea(actor, input);
}

export async function actualizarAvanceTarea(
  actor: PerfilUsuario,
  tareaId: string,
  estado: EstadoTarea,
  porcentajeAvance: number
): Promise<ApiResult> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return buildErrorResult('ERR-005', 'Cliente Supabase no disponible.', 500);
    const { data, error } = await supabase.rpc('actualizar_avance_tarea', {
      p_tarea_id: tareaId,
      p_estado: estado,
      p_porcentaje_avance: porcentajeAvance,
    });
    if (error) return buildErrorResult('ERR-005', error.message, 500);
    return normalizeRpcResponse(data);
  }
  return getLocalEngine().actualizarAvanceTarea(actor, tareaId, estado, porcentajeAvance);
}

export async function actualizarTareaGerencia(
  actor: PerfilUsuario,
  tareaId: string,
  input: {
    titulo?: string;
    fecha_limite?: string;
    estado?: EstadoTarea;
    motivo_cambio?: string;
    diferir_invalidacion_cp004?: boolean;
  }
): Promise<ApiResult> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return buildErrorResult('ERR-005', 'Cliente Supabase no disponible.', 500);
    const { data, error } = await supabase.rpc('actualizar_tarea_gerencia', {
      p_tarea_id: tareaId,
      p_titulo: input.titulo ?? null,
      p_fecha_limite: input.fecha_limite ?? null,
      p_estado: input.estado ?? null,
      p_motivo_cambio: input.motivo_cambio ?? null,
      p_diferir_invalidacion_cp004: Boolean(input.diferir_invalidacion_cp004),
    });
    if (error) return buildErrorResult('ERR-005', error.message, 500);
    return normalizeRpcResponse(data);
  }
  return getLocalEngine().actualizarTareaGerencia(actor, tareaId, input);
}

export async function listSolicitudes(actor: PerfilUsuario): Promise<SolicitudEnriquecida[]> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from('solicitudes_autorizacion')
      .select(
        `*,
        sedes(nombre),
        tareas(folio, titulo, fecha_limite, proyectos(nombre, fecha_fin_proyecto)),
        perfiles_usuario!solicitudes_autorizacion_solicitante_id_fkey(nombre_completo, rol),
        bitacora_autorizaciones(*)`
      )
      .order('creado_en', { ascending: false });
    return (data ?? []).map((row: Record<string, unknown>) => {
      const s = row.sedes as { nombre?: string } | null;
      const t = row.tareas as {
        folio?: string;
        titulo?: string;
        fecha_limite?: string;
        proyectos?: { nombre?: string; fecha_fin_proyecto?: string } | null;
      } | null;
      const u = row.perfiles_usuario as { nombre_completo?: string; rol?: 'OP' | 'GS' | 'DN' } | null;
      const bitRaw = row.bitacora_autorizaciones;
      const bit = Array.isArray(bitRaw) ? bitRaw[0] ?? null : bitRaw ?? null;
      return {
        ...(row as unknown as SolicitudEnriquecida),
        tarea_folio: t?.folio ?? '',
        tarea_titulo: t?.titulo ?? '',
        tarea_fecha_limite_actual: t?.fecha_limite ?? String(row.fecha_referencia),
        proyecto_nombre: t?.proyectos?.nombre ?? '',
        proyecto_fecha_fin: t?.proyectos?.fecha_fin_proyecto ?? '',
        sede_nombre: s?.nombre ?? String(row.sede_id),
        solicitante_nombre: u?.nombre_completo ?? '',
        solicitante_rol: u?.rol ?? 'OP',
        bitacora: bit,
      };
    });
  }
  return getLocalEngine().listSolicitudes(actor);
}

export async function crearSolicitudAutorizacion(
  actor: PerfilUsuario,
  input: {
    tarea_id: string;
    tipo: TipoSolicitud;
    motivo_solicitud: string;
    idempotency_key: string;
    fecha_propuesta?: string | null;
    alcance_propuesto?: string | null;
  }
): Promise<ApiResult> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return buildErrorResult('ERR-005', 'Cliente Supabase no disponible.', 500);
    const { data, error } = await supabase.rpc('crear_solicitud_autorizacion', {
      p_tarea_id: input.tarea_id,
      p_tipo: input.tipo,
      p_motivo_solicitud: input.motivo_solicitud,
      p_idempotency_key: input.idempotency_key,
      p_fecha_propuesta: input.fecha_propuesta ?? null,
      p_alcance_propuesto: input.alcance_propuesto ?? null,
    });
    if (error) return buildErrorResult('ERR-005', error.message, 500);
    return normalizeRpcResponse(data);
  }
  return getLocalEngine().crearSolicitudAutorizacion(actor, input);
}

export async function resolverSolicitudAutorizacion(
  actor: PerfilUsuario,
  input: {
    solicitud_id: string;
    dictamen: Dictamen;
    motivo_resolucion: string;
    idempotency_key: string;
    simular_fallo_bitacora?: boolean;
  }
): Promise<ApiResult> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return buildErrorResult('ERR-005', 'Cliente Supabase no disponible.', 500);
    const { data, error } = await supabase.rpc('resolver_solicitud_autorizacion', {
      p_solicitud_id: input.solicitud_id,
      p_dictamen: input.dictamen,
      p_motivo_resolucion: input.motivo_resolucion,
      p_idempotency_key: input.idempotency_key,
      p_simular_fallo_bitacora: Boolean(input.simular_fallo_bitacora),
    });
    if (error) {
      return buildErrorResult('ERR-005', `${error.message} Se ejecutó ROLLBACK total.`, 500);
    }
    return normalizeRpcResponse(data);
  }
  return getLocalEngine().resolverSolicitudAutorizacion(actor, input);
}

export async function listBitacora(actor: PerfilUsuario, tareaId?: string): Promise<BitacoraEnriquecida[]> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return [];
    let query = supabase
      .from('bitacora_autorizaciones')
      .select(
        `*,
        sedes(nombre),
        tareas(folio, titulo),
        solicitudes_autorizacion(folio, tipo, motivo_solicitud)`
      )
      .order('resuelto_en', { ascending: false });
    if (tareaId) query = query.eq('tarea_id', tareaId);
    const { data } = await query;
    return (data ?? []).map((row: Record<string, unknown>) => {
      const s = row.sedes as { nombre?: string } | null;
      const t = row.tareas as { folio?: string; titulo?: string } | null;
      const sol = row.solicitudes_autorizacion as {
        folio?: string;
        tipo?: TipoSolicitud;
        motivo_solicitud?: string;
      } | null;
      return {
        ...(row as unknown as BitacoraEnriquecida),
        solicitud_folio: sol?.folio ?? '',
        solicitud_tipo: sol?.tipo ?? 'PRORROGA_FECHA',
        motivo_solicitud: sol?.motivo_solicitud ?? '',
        tarea_folio: t?.folio ?? '',
        tarea_titulo: t?.titulo ?? '',
        sede_nombre: s?.nombre ?? String(row.sede_id),
      };
    });
  }
  return getLocalEngine().listBitacora(actor, tareaId);
}

export function rechazarMutacionBitacora(operacion: 'PUT' | 'PATCH' | 'DELETE'): ApiResult {
  return getLocalEngine().rechazarMutacionBitacora(operacion);
}

export async function listDocumentosTarea(actor: PerfilUsuario, tareaId: string): Promise<DocumentoConVersiones[] | null> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;
    const { data: docs } = await supabase
      .from('documentos_tarea')
      .select('*, documento_versiones(*)')
      .eq('tarea_id', tareaId)
      .order('creado_en', { ascending: true });
    return (docs ?? []) as unknown as DocumentoConVersiones[];
  }
  return getLocalEngine().listDocumentosTarea(actor, tareaId);
}

export async function verificarHashDocumento(
  actor: PerfilUsuario,
  tareaId: string,
  nombreDocumento: string,
  hashSha256: string
): Promise<ApiResult> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return buildErrorResult('ERR-005', 'Cliente Supabase no disponible.', 500);
    const { data, error } = await supabase.rpc('verificar_hash_documento', {
      p_tarea_id: tareaId,
      p_nombre_documento: nombreDocumento,
      p_hash_sha256: hashSha256,
    });
    if (error) return buildErrorResult('ERR-005', error.message, 500);
    return normalizeRpcResponse(data);
  }
  return getLocalEngine().verificarHashDocumento(actor, tareaId, nombreDocumento, hashSha256);
}

export async function registrarVersionDocumento(
  actor: PerfilUsuario,
  input: {
    tarea_id: string;
    nombre_documento: string;
    nombre_original: string;
    mime_type: string;
    fileBuffer: Buffer;
    descripcion_cambio: string;
  }
): Promise<ApiResult> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return buildErrorResult('ERR-005', 'Cliente Supabase no disponible.', 500);
    const tarea = await getTareaById(actor, input.tarea_id);
    if (!tarea) return buildErrorResult('ERR-001', 'Sin acceso a la tarea.', 403);
    const safeName = input.nombre_original.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${tarea.sede_id}/${tarea.id}/${crypto.randomUUID()}_${safeName}`;
    const hash = crypto.createHash('sha256').update(input.fileBuffer).digest('hex');

    const { error: upErr } = await supabase.storage
      .from('documentos-tareas')
      .upload(storagePath, input.fileBuffer, { contentType: input.mime_type, upsert: false });
    if (upErr) return buildErrorResult('ERR-001', upErr.message, 403);

    const { data, error } = await supabase.rpc('registrar_version_documento', {
      p_tarea_id: input.tarea_id,
      p_nombre_documento: input.nombre_documento,
      p_archivo_path: storagePath,
      p_nombre_original: input.nombre_original,
      p_mime_type: input.mime_type,
      p_tamano_bytes: input.fileBuffer.byteLength,
      p_hash_sha256: hash,
      p_descripcion_cambio: input.descripcion_cambio,
    });
    if (error) {
      return buildErrorResult('ERR-005', error.message, 500);
    }
    return normalizeRpcResponse(data);
  }
  return getLocalEngine().registrarVersionDocumento(actor, input);
}

export async function designarVersionVigente(actor: PerfilUsuario, versionId: string): Promise<ApiResult> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return buildErrorResult('ERR-005', 'Cliente Supabase no disponible.', 500);
    const { data, error } = await supabase.rpc('designar_version_vigente', { p_version_id: versionId });
    if (error) return buildErrorResult('ERR-005', error.message, 500);
    return normalizeRpcResponse(data);
  }
  return getLocalEngine().designarVersionVigente(actor, versionId);
}

export async function getArchivoVersion(
  actor: PerfilUsuario,
  versionId: string
): Promise<
  | { ok: true; buffer: Buffer; mimeType: string; nombreOriginal: string }
  | { ok: true; signedUrl: string }
  | ApiResult
> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return buildErrorResult('ERR-005', 'Cliente Supabase no disponible.', 500);
    const { data: ver } = await supabase
      .from('documento_versiones')
      .select('archivo_path')
      .eq('id', versionId)
      .maybeSingle();
    if (!ver) return buildErrorResult('ERR-001', 'Versión no encontrada o sin acceso.', 403);
    const { data: signed, error } = await supabase.storage
      .from('documentos-tareas')
      .createSignedUrl(ver.archivo_path, 60);
    if (error || !signed) return buildErrorResult('ERR-001', 'No fue posible generar URL firmada.', 403);
    return { ok: true, signedUrl: signed.signedUrl };
  }
  return getLocalEngine().getArchivoVersion(actor, versionId);
}

export async function listCorreosSimulados(actor: PerfilUsuario): Promise<CorreoSimulado[]> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from('correos_simulados')
      .select('*, sedes(nombre), tareas(folio), solicitudes_autorizacion(folio)')
      .order('fecha_hora_prevista', { ascending: false });
    return (data ?? []).map((row: Record<string, unknown>) => {
      const s = row.sedes as { nombre?: string } | null;
      const t = row.tareas as { folio?: string } | null;
      const sol = row.solicitudes_autorizacion as { folio?: string } | null;
      return {
        ...(row as unknown as CorreoSimulado),
        sede_nombre: s?.nombre ?? String(row.sede_id),
        tarea_folio: t?.folio ?? null,
        solicitud_folio: sol?.folio ?? null,
      };
    });
  }
  return getLocalEngine().listCorreosSimulados(actor);
}

export async function evaluarRecordatoriosSimulados(
  actor: PerfilUsuario,
  fechaEvaluacionIso?: string
): Promise<ApiResult> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return buildErrorResult('ERR-005', 'Cliente Supabase no disponible.', 500);
    const { data, error } = await supabase.rpc('evaluar_recordatorios_simulados', {
      p_fecha_evaluacion: fechaEvaluacionIso ?? new Date().toISOString(),
    });
    if (error) return buildErrorResult('ERR-005', error.message, 500);
    return normalizeRpcResponse(data);
  }
  return getLocalEngine().evaluarRecordatoriosSimulados(actor, fechaEvaluacionIso);
}

export async function obtenerMetricasDashboard(actor: PerfilUsuario): Promise<MetricaSede[]> {
  if (getBackendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return [];
    const { data } = await supabase.rpc('obtener_metricas_dashboard');
    const obj = data as { sedes?: MetricaSede[] } | null;
    return obj?.sedes ?? [];
  }
  return getLocalEngine().obtenerMetricasDashboard(actor);
}

export function filterTasksByQuery(
  tareas: TareaEnriquecida[],
  params: { sede_id?: SedeId | null; proyecto_id?: string | null; tarea_id?: string | null }
): TareaEnriquecida[] {
  return tareas.filter((t) => {
    if (params.sede_id && t.sede_id !== params.sede_id) return false;
    if (params.proyecto_id && t.proyecto_id !== params.proyecto_id) return false;
    if (params.tarea_id && t.id !== params.tarea_id) return false;
    return true;
  });
}
