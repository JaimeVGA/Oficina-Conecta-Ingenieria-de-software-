-- ============================================================================
-- OFICINA CONECTA — MIGRACIÓN 0001: ESQUEMA, RESTRICCIONES Y APPEND-ONLY
-- Fuente: 502_A_1.pdf (Línea Base v1.0, FUE-011) | PostgreSQL 15 (Supabase)
-- Exclusiones verificadas (RES-002): SIN presupuesto, SIN firma digital, SIN IP
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Configuración controlada para pruebas de fallo en bitácora (CP-002)
CREATE TABLE public.configuracion_pruebas (
  clave TEXT PRIMARY KEY,
  valor BOOLEAN NOT NULL DEFAULT FALSE,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
REVOKE ALL ON public.configuracion_pruebas FROM PUBLIC, anon, authenticated;
INSERT INTO public.configuracion_pruebas (clave, valor)
VALUES ('permitir_fallo_bitacora_cp002', TRUE)
ON CONFLICT (clave) DO NOTHING;

-- 1. DAT-001: Sedes (alcance cerrado: exactamente 3 sedes piloto)
CREATE TABLE public.sedes (
  id TEXT PRIMARY KEY CHECK (id IN ('CDMX', 'OAXACA', 'PUEBLA')),
  codigo_corto TEXT NOT NULL UNIQUE CHECK (codigo_corto IN ('CDMX', 'OAX', 'PUE')),
  nombre TEXT NOT NULL UNIQUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. DAT-001: Departamentos por sede
CREATE TABLE public.departamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id TEXT NOT NULL REFERENCES public.sedes(id) ON DELETE RESTRICT,
  nombre TEXT NOT NULL CHECK (length(btrim(nombre)) > 0),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_departamentos_sede_nombre UNIQUE (sede_id, nombre),
  CONSTRAINT uq_departamentos_id_sede UNIQUE (id, sede_id)
);

-- 3. Perfiles de usuario (1:1 con auth.users, SUP-001: 1 rol y sede por usuario)
CREATE TABLE public.perfiles_usuario (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL CHECK (length(btrim(nombre_completo)) > 0),
  correo TEXT NOT NULL UNIQUE CHECK (length(btrim(correo)) > 0),
  rol TEXT NOT NULL CHECK (rol IN ('OP', 'GS', 'DN')),
  sede_id TEXT NULL REFERENCES public.sedes(id) ON DELETE RESTRICT,
  departamento_id UUID NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_perfil_rol_sede CHECK (
    (rol = 'DN' AND sede_id IS NULL AND departamento_id IS NULL)
    OR (rol IN ('OP', 'GS') AND sede_id IS NOT NULL)
  ),
  CONSTRAINT fk_perfil_depto_misma_sede FOREIGN KEY (departamento_id, sede_id)
    REFERENCES public.departamentos(id, sede_id) ON DELETE RESTRICT,
  CONSTRAINT uq_perfil_id_sede UNIQUE (id, sede_id)
);

-- 4. DAT-001: Proyectos (invariante: pertenecen a una sola sede y departamento de esa sede)
CREATE TABLE public.proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id TEXT NOT NULL REFERENCES public.sedes(id) ON DELETE RESTRICT,
  departamento_id UUID NOT NULL,
  nombre TEXT NOT NULL CHECK (length(btrim(nombre)) > 0),
  descripcion TEXT NOT NULL DEFAULT '',
  fecha_fin_proyecto DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'COMPLETADO', 'CANCELADO')),
  creado_por UUID NOT NULL REFERENCES public.perfiles_usuario(id) ON DELETE RESTRICT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_proyecto_depto_misma_sede FOREIGN KEY (departamento_id, sede_id)
    REFERENCES public.departamentos(id, sede_id) ON DELETE RESTRICT,
  CONSTRAINT uq_proyecto_id_sede UNIQUE (id, sede_id)
);
CREATE INDEX idx_proyectos_sede ON public.proyectos (sede_id, estado);

-- 5. DAT-002: Tareas (FK compuestas impiden cruce de sedes a nivel motor SQL)
CREATE SEQUENCE public.seq_folio_tarea START 1;

CREATE TABLE public.tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio TEXT NOT NULL UNIQUE,
  sede_id TEXT NOT NULL REFERENCES public.sedes(id) ON DELETE RESTRICT,
  proyecto_id UUID NOT NULL,
  departamento_id UUID NOT NULL,
  responsable_id UUID NOT NULL,
  titulo TEXT NOT NULL CHECK (length(btrim(titulo)) > 0),
  alcance TEXT NOT NULL CHECK (length(btrim(alcance)) > 0),
  fecha_limite TIMESTAMPTZ NOT NULL,
  estado TEXT NOT NULL DEFAULT 'ASIGNADA'
    CHECK (estado IN ('ASIGNADA', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA')),
  porcentaje_avance INT NOT NULL DEFAULT 0 CHECK (porcentaje_avance BETWEEN 0 AND 100),
  sequence_ics INT NOT NULL DEFAULT 0 CHECK (sequence_ics >= 0),
  creado_por UUID NOT NULL REFERENCES public.perfiles_usuario(id) ON DELETE RESTRICT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_tarea_proyecto_sede FOREIGN KEY (proyecto_id, sede_id)
    REFERENCES public.proyectos(id, sede_id) ON DELETE RESTRICT,
  CONSTRAINT fk_tarea_depto_sede FOREIGN KEY (departamento_id, sede_id)
    REFERENCES public.departamentos(id, sede_id) ON DELETE RESTRICT,
  CONSTRAINT fk_tarea_responsable_sede FOREIGN KEY (responsable_id, sede_id)
    REFERENCES public.perfiles_usuario(id, sede_id) ON DELETE RESTRICT,
  CONSTRAINT uq_tarea_id_sede UNIQUE (id, sede_id)
);
CREATE INDEX idx_tareas_sede_estado ON public.tareas (sede_id, estado);
CREATE INDEX idx_tareas_responsable ON public.tareas (responsable_id);
CREATE INDEX idx_tareas_proyecto ON public.tareas (proyecto_id);
CREATE INDEX idx_tareas_fecha_limite ON public.tareas (fecha_limite);

-- 6. DAT-003: Solicitudes de Autorización (EXCLUSIVAMENTE PRORROGA_FECHA y CAMBIO_ALCANCE)
CREATE SEQUENCE public.seq_folio_solicitud START 1;

CREATE TABLE public.solicitudes_autorizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio TEXT NOT NULL UNIQUE,
  tarea_id UUID NOT NULL,
  sede_id TEXT NOT NULL REFERENCES public.sedes(id) ON DELETE RESTRICT,
  solicitante_id UUID NOT NULL REFERENCES public.perfiles_usuario(id) ON DELETE RESTRICT,
  idempotency_key UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('PRORROGA_FECHA', 'CAMBIO_ALCANCE')),
  fecha_referencia TIMESTAMPTZ NOT NULL,
  alcance_referencia TEXT NOT NULL,
  fecha_propuesta TIMESTAMPTZ NULL,
  alcance_propuesto TEXT NULL,
  dias_naturales_solicitados INT NULL,
  cambio_solicitado TEXT NOT NULL CHECK (length(btrim(cambio_solicitado)) > 0),
  motivo_solicitud TEXT NOT NULL CHECK (length(btrim(motivo_solicitud)) > 0),
  rol_resolver TEXT NOT NULL CHECK (rol_resolver IN ('GS', 'DN')),
  estado TEXT NOT NULL DEFAULT 'PENDIENTE_REVISION'
    CHECK (estado IN ('PENDIENTE_REVISION', 'APROBADA', 'RECHAZADA', 'INVALIDADA_POR_DESACTUALIZACION')),
  motivo_invalidacion TEXT NULL,
  invalidada_en TIMESTAMPTZ NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_solicitud_idempotencia UNIQUE (solicitante_id, idempotency_key),
  CONSTRAINT fk_solicitud_tarea_sede FOREIGN KEY (tarea_id, sede_id)
    REFERENCES public.tareas(id, sede_id) ON DELETE RESTRICT,
  CONSTRAINT chk_solicitud_payload_por_tipo CHECK (
    (tipo = 'PRORROGA_FECHA'
      AND fecha_propuesta IS NOT NULL
      AND fecha_propuesta > fecha_referencia
      AND alcance_propuesto IS NULL)
    OR
    (tipo = 'CAMBIO_ALCANCE'
      AND alcance_propuesto IS NOT NULL
      AND length(btrim(alcance_propuesto)) > 0
      AND fecha_propuesta IS NULL)
  ),
  CONSTRAINT chk_solicitud_motivo_invalidacion CHECK (
    (estado = 'INVALIDADA_POR_DESACTUALIZACION'
      AND motivo_invalidacion IS NOT NULL
      AND length(btrim(motivo_invalidacion)) > 0
      AND invalidada_en IS NOT NULL)
    OR
    (estado <> 'INVALIDADA_POR_DESACTUALIZACION'
      AND motivo_invalidacion IS NULL
      AND invalidada_en IS NULL)
  )
);
CREATE INDEX idx_solicitudes_tarea_estado ON public.solicitudes_autorizacion (tarea_id, estado);
CREATE INDEX idx_solicitudes_sede_rol_estado ON public.solicitudes_autorizacion (sede_id, rol_resolver, estado);

-- 7. DAT-004: Bitácora de Autorizaciones Append-Only (SIN CAMPO IP — RES-002, PER-008)
CREATE TABLE public.bitacora_autorizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id UUID NOT NULL UNIQUE REFERENCES public.solicitudes_autorizacion(id) ON DELETE RESTRICT,
  tarea_id UUID NOT NULL,
  sede_id TEXT NOT NULL REFERENCES public.sedes(id) ON DELETE RESTRICT,
  usuario_resolutor_id UUID NOT NULL REFERENCES public.perfiles_usuario(id) ON DELETE RESTRICT,
  resolutor_nombre_snapshot TEXT NOT NULL CHECK (length(btrim(resolutor_nombre_snapshot)) > 0),
  resolutor_rol_snapshot TEXT NOT NULL CHECK (resolutor_rol_snapshot IN ('GS', 'DN')),
  idempotency_key UUID NULL UNIQUE,
  dictamen TEXT NOT NULL CHECK (dictamen IN ('APROBADA', 'RECHAZADA')),
  motivo_resolucion TEXT NOT NULL CHECK (length(btrim(motivo_resolucion)) > 0),
  valor_anterior TEXT NOT NULL,
  valor_nuevo TEXT NOT NULL,
  resuelto_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bitacora_tarea_sede FOREIGN KEY (tarea_id, sede_id)
    REFERENCES public.tareas(id, sede_id) ON DELETE RESTRICT
);
CREATE INDEX idx_bitacora_tarea ON public.bitacora_autorizaciones (tarea_id, resuelto_en DESC);
CREATE INDEX idx_bitacora_sede ON public.bitacora_autorizaciones (sede_id, resuelto_en DESC);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.bitacora_autorizaciones
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.bitacora_autorizaciones TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_bloquear_mutacion_bitacora()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'ERR-005: La bitácora de autorizaciones es de solo adición (append-only). Operación % prohibida.', TG_OP
    USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER trg_bloquear_mutacion_bitacora
  BEFORE UPDATE OR DELETE OR TRUNCATE ON public.bitacora_autorizaciones
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.fn_bloquear_mutacion_bitacora();

CREATE OR REPLACE FUNCTION public.fn_cp002_fallo_simulado_bitacora()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.simular_fallo_bitacora', true) = 'true' THEN
    RAISE EXCEPTION 'ERR-005: Fallo provocado en escritura de bitácora (CP-002).'
      USING ERRCODE = 'P0005';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cp002_fallo_simulado_bitacora
  BEFORE INSERT ON public.bitacora_autorizaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cp002_fallo_simulado_bitacora();

-- 8. DAT-005: Documentos por tarea (1:N) y versiones consecutivas v1, v2, v3... (1:N)
CREATE TABLE public.documentos_tarea (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID NOT NULL,
  sede_id TEXT NOT NULL REFERENCES public.sedes(id) ON DELETE RESTRICT,
  nombre_documento TEXT NOT NULL CHECK (length(btrim(nombre_documento)) > 0),
  creado_por UUID NOT NULL REFERENCES public.perfiles_usuario(id) ON DELETE RESTRICT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_doc_tarea_sede FOREIGN KEY (tarea_id, sede_id)
    REFERENCES public.tareas(id, sede_id) ON DELETE RESTRICT,
  CONSTRAINT uq_doc_tarea_nombre UNIQUE (tarea_id, nombre_documento),
  CONSTRAINT uq_doc_id_sede UNIQUE (id, sede_id)
);

CREATE TABLE public.documento_versiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL,
  sede_id TEXT NOT NULL REFERENCES public.sedes(id) ON DELETE RESTRICT,
  numero_version INT NOT NULL CHECK (numero_version >= 1),
  etiqueta TEXT GENERATED ALWAYS AS ('v' || numero_version::text) STORED,
  archivo_path TEXT NOT NULL CHECK (length(btrim(archivo_path)) > 0),
  nombre_original TEXT NOT NULL CHECK (length(btrim(nombre_original)) > 0),
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  tamano_bytes BIGINT NOT NULL CHECK (tamano_bytes > 0 AND tamano_bytes <= 52428800),
  hash_sha256 TEXT NOT NULL CHECK (hash_sha256 ~ '^[0-9a-f]{64}$'),
  hash_duplicado_en_documento BOOLEAN NOT NULL DEFAULT FALSE,
  autor_id UUID NOT NULL REFERENCES public.perfiles_usuario(id) ON DELETE RESTRICT,
  descripcion_cambio TEXT NOT NULL CHECK (length(btrim(descripcion_cambio)) > 0),
  es_vigente BOOLEAN NOT NULL DEFAULT FALSE,
  designada_por UUID NULL REFERENCES public.perfiles_usuario(id) ON DELETE RESTRICT,
  designada_en TIMESTAMPTZ NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_version_doc_sede FOREIGN KEY (documento_id, sede_id)
    REFERENCES public.documentos_tarea(id, sede_id) ON DELETE RESTRICT,
  CONSTRAINT uq_doc_numero_version UNIQUE (documento_id, numero_version)
);

CREATE UNIQUE INDEX uq_documento_unica_version_vigente
  ON public.documento_versiones (documento_id)
  WHERE es_vigente = TRUE;

CREATE INDEX idx_versiones_doc_hash ON public.documento_versiones (documento_id, hash_sha256);

-- 9. DAT-006 / DEC-006: Bandeja de Correos Simulados con idempotencia
CREATE TABLE public.correos_simulados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave_evento TEXT NOT NULL UNIQUE,
  sede_id TEXT NOT NULL REFERENCES public.sedes(id) ON DELETE RESTRICT,
  destinatario_usuario_id UUID NULL REFERENCES public.perfiles_usuario(id) ON DELETE RESTRICT,
  destinatario TEXT NOT NULL CHECK (length(btrim(destinatario)) > 0),
  motivo_aviso TEXT NOT NULL CHECK (
    motivo_aviso IN ('ASIGNACION', 'SOLICITUD', 'RESOLUCION', 'RECORDATORIO_48H', 'RECORDATORIO_24H')
  ),
  es_urgente_menor_24h BOOLEAN NOT NULL DEFAULT FALSE,
  combina_recordatorio TEXT NULL CHECK (combina_recordatorio IN ('48H', '24H')),
  tarea_id UUID NULL REFERENCES public.tareas(id) ON DELETE RESTRICT,
  solicitud_id UUID NULL REFERENCES public.solicitudes_autorizacion(id) ON DELETE RESTRICT,
  asunto TEXT NOT NULL CHECK (length(btrim(asunto)) > 0),
  contenido TEXT NOT NULL CHECK (length(btrim(contenido)) > 0),
  fecha_hora_prevista TIMESTAMPTZ NOT NULL,
  emitido_en TIMESTAMPTZ NULL,
  es_simulado BOOLEAN NOT NULL DEFAULT TRUE CHECK (es_simulado = TRUE),
  estado TEXT NOT NULL CHECK (estado IN ('EMITIDO', 'PROGRAMADO', 'CANCELADO')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_correos_sede_estado ON public.correos_simulados (sede_id, estado, fecha_hora_prevista DESC);
CREATE INDEX idx_correos_tarea_estado ON public.correos_simulados (tarea_id, estado);
