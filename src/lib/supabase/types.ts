export type SedeId = 'CDMX' | 'OAXACA' | 'PUEBLA';
export type SedeCodigoCorto = 'CDMX' | 'OAX' | 'PUE';
export type RolUsuario = 'OP' | 'GS' | 'DN';

export type EstadoProyecto = 'ACTIVO' | 'COMPLETADO' | 'CANCELADO';
export type EstadoTarea = 'ASIGNADA' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA';
export type TipoSolicitud = 'PRORROGA_FECHA' | 'CAMBIO_ALCANCE';
export type EstadoSolicitud =
  | 'PENDIENTE_REVISION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'INVALIDADA_POR_DESACTUALIZACION';
export type Dictamen = 'APROBADA' | 'RECHAZADA';

export type MotivoAviso =
  | 'ASIGNACION'
  | 'SOLICITUD'
  | 'RESOLUCION'
  | 'RECORDATORIO_48H'
  | 'RECORDATORIO_24H';
export type EstadoAviso = 'EMITIDO' | 'PROGRAMADO' | 'CANCELADO';

export type ErrorCode = 'ERR-001' | 'ERR-002' | 'ERR-003' | 'ERR-004' | 'ERR-005';

export interface Sede {
  id: SedeId;
  codigo_corto: SedeCodigoCorto;
  nombre: string;
  creado_en: string;
}

export interface Departamento {
  id: string;
  sede_id: SedeId;
  nombre: string;
  creado_en: string;
}

export interface PerfilUsuario {
  id: string;
  nombre_completo: string;
  correo: string;
  rol: RolUsuario;
  sede_id: SedeId | null;
  departamento_id: string | null;
  activo: boolean;
  creado_en: string;
}

export interface Proyecto {
  id: string;
  sede_id: SedeId;
  departamento_id: string;
  nombre: string;
  descripcion: string;
  fecha_fin_proyecto: string; // YYYY-MM-DD
  estado: EstadoProyecto;
  creado_por: string;
  creado_en: string;
  actualizado_en: string;
}

export interface Tarea {
  id: string;
  folio: string;
  sede_id: SedeId;
  proyecto_id: string;
  departamento_id: string;
  responsable_id: string;
  titulo: string;
  alcance: string;
  fecha_limite: string; // ISO UTC
  estado: EstadoTarea;
  porcentaje_avance: number;
  sequence_ics: number;
  creado_por: string;
  creado_en: string;
  actualizado_en: string;
}

export interface TareaEnriquecida extends Tarea {
  sede_nombre: string;
  proyecto_nombre: string;
  proyecto_fecha_fin: string;
  departamento_nombre: string;
  responsable_nombre: string;
  responsable_correo: string;
}

export interface SolicitudAutorizacion {
  id: string;
  folio: string;
  tarea_id: string;
  sede_id: SedeId;
  solicitante_id: string;
  idempotency_key: string;
  tipo: TipoSolicitud;
  fecha_referencia: string;
  alcance_referencia: string;
  fecha_propuesta: string | null;
  alcance_propuesto: string | null;
  dias_naturales_solicitados: number | null;
  cambio_solicitado: string;
  motivo_solicitud: string;
  rol_resolver: 'GS' | 'DN';
  estado: EstadoSolicitud;
  motivo_invalidacion: string | null;
  invalidada_en: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface SolicitudEnriquecida extends SolicitudAutorizacion {
  tarea_folio: string;
  tarea_titulo: string;
  tarea_fecha_limite_actual: string;
  proyecto_nombre: string;
  proyecto_fecha_fin: string;
  sede_nombre: string;
  solicitante_nombre: string;
  solicitante_rol: RolUsuario;
  bitacora?: BitacoraAutorizacion | null;
}

export interface BitacoraAutorizacion {
  id: string;
  solicitud_id: string;
  tarea_id: string;
  sede_id: SedeId;
  usuario_resolutor_id: string;
  resolutor_nombre_snapshot: string;
  resolutor_rol_snapshot: 'GS' | 'DN';
  idempotency_key: string | null;
  dictamen: Dictamen;
  motivo_resolucion: string;
  valor_anterior: string;
  valor_nuevo: string;
  resuelto_en: string;
}

export interface BitacoraEnriquecida extends BitacoraAutorizacion {
  solicitud_folio: string;
  solicitud_tipo: TipoSolicitud;
  motivo_solicitud: string;
  tarea_folio: string;
  tarea_titulo: string;
  sede_nombre: string;
}

export interface DocumentoTarea {
  id: string;
  tarea_id: string;
  sede_id: SedeId;
  nombre_documento: string;
  creado_por: string;
  creado_en: string;
}

export interface DocumentoVersion {
  id: string;
  documento_id: string;
  sede_id: SedeId;
  numero_version: number;
  etiqueta: string;
  archivo_path: string;
  nombre_original: string;
  mime_type: string;
  tamano_bytes: number;
  hash_sha256: string;
  hash_duplicado_en_documento: boolean;
  autor_id: string;
  autor_nombre?: string;
  descripcion_cambio: string;
  es_vigente: boolean;
  designada_por: string | null;
  designada_por_nombre?: string | null;
  designada_en: string | null;
  creado_en: string;
}

export interface DocumentoConVersiones extends DocumentoTarea {
  versiones: DocumentoVersion[];
}

export interface CorreoSimulado {
  id: string;
  clave_evento: string;
  sede_id: SedeId;
  destinatario_usuario_id: string | null;
  destinatario: string;
  motivo_aviso: MotivoAviso;
  es_urgente_menor_24h: boolean;
  combina_recordatorio: '48H' | '24H' | null;
  tarea_id: string | null;
  solicitud_id: string | null;
  tarea_folio?: string | null;
  solicitud_folio?: string | null;
  sede_nombre?: string;
  asunto: string;
  contenido: string;
  fecha_hora_prevista: string;
  emitido_en: string | null;
  es_simulado: true;
  estado: EstadoAviso;
  creado_en: string;
}

export interface MetricaSede {
  sede_id: SedeId;
  sede_nombre: string;
  total_tareas: number;
  pendientes: number;
  retrasadas: number;
  completadas: number;
  avance_promedio: number;
  solicitudes_pendientes: number;
}

export interface ApiResult<T = Record<string, unknown>> {
  ok: boolean;
  http_status: number;
  error_code?: ErrorCode;
  sqlstate?: string;
  message?: string;
  data?: T;
}
