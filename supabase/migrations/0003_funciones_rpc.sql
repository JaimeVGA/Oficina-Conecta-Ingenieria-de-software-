-- ============================================================================
-- OFICINA CONECTA — MIGRACIÓN 0003: FUNCIONES RPC ATÓMICAS (PL/pgSQL)
-- Orden global de bloqueo anti-deadlock: tareas -> solicitudes -> proyectos
-- ============================================================================

CREATE OR REPLACE FUNCTION public._programar_avisos_tarea(
  p_tarea_id UUID,
  p_incluir_asignacion BOOLEAN,
  p_ahora TIMESTAMPTZ DEFAULT now()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_t RECORD;
  v_diff_sec NUMERIC;
  v_fecha_mx TEXT;
BEGIN
  SELECT
    t.id, t.folio, t.sede_id, t.titulo, t.fecha_limite, t.estado, t.sequence_ics,
    t.responsable_id, p.nombre AS proyecto_nombre,
    u.correo AS resp_correo, u.nombre_completo AS resp_nombre
  INTO v_t
  FROM public.tareas t
  JOIN public.proyectos p ON p.id = t.proyecto_id
  JOIN public.perfiles_usuario u ON u.id = t.responsable_id
  WHERE t.id = p_tarea_id;

  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.correos_simulados
  SET estado = 'CANCELADO'
  WHERE tarea_id = p_tarea_id
    AND motivo_aviso IN ('RECORDATORIO_48H', 'RECORDATORIO_24H')
    AND estado = 'PROGRAMADO';

  IF v_t.estado IN ('COMPLETADA', 'CANCELADA') THEN
    RETURN;
  END IF;

  v_fecha_mx := to_char(v_t.fecha_limite AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI')
                || ' (America/Mexico_City)';
  v_diff_sec := EXTRACT(EPOCH FROM (v_t.fecha_limite - p_ahora));

  IF v_diff_sec > (48 * 3600 + 60) THEN
    IF p_incluir_asignacion THEN
      INSERT INTO public.correos_simulados (
        clave_evento, sede_id, destinatario_usuario_id, destinatario, motivo_aviso,
        tarea_id, asunto, contenido, fecha_hora_prevista, emitido_en, estado
      ) VALUES (
        format('tarea:%s:seq:%s:asig', v_t.id, v_t.sequence_ics),
        v_t.sede_id, v_t.responsable_id, v_t.resp_correo, 'ASIGNACION',
        v_t.id,
        format('[SIMULADO] Asignación de tarea %s: %s', v_t.folio, v_t.titulo),
        format('Hola %s, se te asignó la tarea "%s" (%s) en el proyecto "%s". Fecha límite vigente: %s.',
               v_t.resp_nombre, v_t.titulo, v_t.folio, v_t.proyecto_nombre, v_fecha_mx),
        p_ahora, p_ahora, 'EMITIDO'
      ) ON CONFLICT (clave_evento) DO NOTHING;
    END IF;

    INSERT INTO public.correos_simulados (
      clave_evento, sede_id, destinatario_usuario_id, destinatario, motivo_aviso,
      tarea_id, asunto, contenido, fecha_hora_prevista, estado
    ) VALUES
    (
      format('tarea:%s:seq:%s:rec48', v_t.id, v_t.sequence_ics),
      v_t.sede_id, v_t.responsable_id, v_t.resp_correo, 'RECORDATORIO_48H',
      v_t.id,
      format('[SIMULADO] Recordatorio 48h — %s: %s', v_t.folio, v_t.titulo),
      format('Recordatorio preventivo (48h): la tarea "%s" (%s) vence el %s.', v_t.titulo, v_t.folio, v_fecha_mx),
      v_t.fecha_limite - INTERVAL '48 hours', 'PROGRAMADO'
    ),
    (
      format('tarea:%s:seq:%s:rec24', v_t.id, v_t.sequence_ics),
      v_t.sede_id, v_t.responsable_id, v_t.resp_correo, 'RECORDATORIO_24H',
      v_t.id,
      format('[SIMULADO] Recordatorio 24h — %s: %s', v_t.folio, v_t.titulo),
      format('Recordatorio preventivo (24h): la tarea "%s" (%s) vence el %s.', v_t.titulo, v_t.folio, v_fecha_mx),
      v_t.fecha_limite - INTERVAL '24 hours', 'PROGRAMADO'
    ) ON CONFLICT (clave_evento) DO NOTHING;

  ELSIF ABS(v_diff_sec - 48 * 3600) <= 60 THEN
    IF p_incluir_asignacion THEN
      INSERT INTO public.correos_simulados (
        clave_evento, sede_id, destinatario_usuario_id, destinatario, motivo_aviso,
        combina_recordatorio, tarea_id, asunto, contenido, fecha_hora_prevista, emitido_en, estado
      ) VALUES (
        format('tarea:%s:seq:%s:asig_rec48', v_t.id, v_t.sequence_ics),
        v_t.sede_id, v_t.responsable_id, v_t.resp_correo, 'ASIGNACION',
        '48H', v_t.id,
        format('[SIMULADO] Asignación + Recordatorio 48h — %s: %s', v_t.folio, v_t.titulo),
        format('Aviso combinado (Asignación y umbral exacto de 48h): tarea "%s" (%s) del proyecto "%s". Fecha límite vigente: %s.',
               v_t.titulo, v_t.folio, v_t.proyecto_nombre, v_fecha_mx),
        p_ahora, p_ahora, 'EMITIDO'
      ) ON CONFLICT (clave_evento) DO NOTHING;
    ELSE
      INSERT INTO public.correos_simulados (
        clave_evento, sede_id, destinatario_usuario_id, destinatario, motivo_aviso,
        tarea_id, asunto, contenido, fecha_hora_prevista, emitido_en, estado
      ) VALUES (
        format('tarea:%s:seq:%s:rec48', v_t.id, v_t.sequence_ics),
        v_t.sede_id, v_t.responsable_id, v_t.resp_correo, 'RECORDATORIO_48H',
        v_t.id,
        format('[SIMULADO] Recordatorio 48h — %s: %s', v_t.folio, v_t.titulo),
        format('Umbral exacto de 48h alcanzado tras actualización de fecha: la tarea "%s" (%s) vence el %s.',
               v_t.titulo, v_t.folio, v_fecha_mx),
        p_ahora, p_ahora, 'EMITIDO'
      ) ON CONFLICT (clave_evento) DO NOTHING;
    END IF;

    INSERT INTO public.correos_simulados (
      clave_evento, sede_id, destinatario_usuario_id, destinatario, motivo_aviso,
      tarea_id, asunto, contenido, fecha_hora_prevista, estado
    ) VALUES (
      format('tarea:%s:seq:%s:rec24', v_t.id, v_t.sequence_ics),
      v_t.sede_id, v_t.responsable_id, v_t.resp_correo, 'RECORDATORIO_24H',
      v_t.id,
      format('[SIMULADO] Recordatorio 24h — %s: %s', v_t.folio, v_t.titulo),
      format('Recordatorio preventivo (24h): la tarea "%s" (%s) vence el %s.', v_t.titulo, v_t.folio, v_fecha_mx),
      v_t.fecha_limite - INTERVAL '24 hours', 'PROGRAMADO'
    ) ON CONFLICT (clave_evento) DO NOTHING;

  ELSIF v_diff_sec > (24 * 3600 + 60) THEN
    IF p_incluir_asignacion THEN
      INSERT INTO public.correos_simulados (
        clave_evento, sede_id, destinatario_usuario_id, destinatario, motivo_aviso,
        tarea_id, asunto, contenido, fecha_hora_prevista, emitido_en, estado
      ) VALUES (
        format('tarea:%s:seq:%s:asig', v_t.id, v_t.sequence_ics),
        v_t.sede_id, v_t.responsable_id, v_t.resp_correo, 'ASIGNACION',
        v_t.id,
        format('[SIMULADO] Asignación de tarea %s: %s', v_t.folio, v_t.titulo),
        format('Hola %s, se te asignó la tarea "%s" (%s) del proyecto "%s". Fecha límite vigente: %s. (Aviso de 48h omitido por plazo menor a 48h).',
               v_t.resp_nombre, v_t.titulo, v_t.folio, v_t.proyecto_nombre, v_fecha_mx),
        p_ahora, p_ahora, 'EMITIDO'
      ) ON CONFLICT (clave_evento) DO NOTHING;
    END IF;

    INSERT INTO public.correos_simulados (
      clave_evento, sede_id, destinatario_usuario_id, destinatario, motivo_aviso,
      tarea_id, asunto, contenido, fecha_hora_prevista, estado
    ) VALUES (
      format('tarea:%s:seq:%s:rec24', v_t.id, v_t.sequence_ics),
      v_t.sede_id, v_t.responsable_id, v_t.resp_correo, 'RECORDATORIO_24H',
      v_t.id,
      format('[SIMULADO] Recordatorio 24h — %s: %s', v_t.folio, v_t.titulo),
      format('Recordatorio preventivo (24h): la tarea "%s" (%s) vence el %s.', v_t.titulo, v_t.folio, v_fecha_mx),
      v_t.fecha_limite - INTERVAL '24 hours', 'PROGRAMADO'
    ) ON CONFLICT (clave_evento) DO NOTHING;

  ELSIF ABS(v_diff_sec - 24 * 3600) <= 60 THEN
    IF p_incluir_asignacion THEN
      INSERT INTO public.correos_simulados (
        clave_evento, sede_id, destinatario_usuario_id, destinatario, motivo_aviso,
        combina_recordatorio, tarea_id, asunto, contenido, fecha_hora_prevista, emitido_en, estado
      ) VALUES (
        format('tarea:%s:seq:%s:asig_rec24', v_t.id, v_t.sequence_ics),
        v_t.sede_id, v_t.responsable_id, v_t.resp_correo, 'ASIGNACION',
        '24H', v_t.id,
        format('[SIMULADO] Asignación + Recordatorio 24h — %s: %s', v_t.folio, v_t.titulo),
        format('Aviso combinado (Asignación y umbral exacto de 24h): tarea "%s" (%s) del proyecto "%s". Fecha límite vigente: %s.',
               v_t.titulo, v_t.folio, v_t.proyecto_nombre, v_fecha_mx),
        p_ahora, p_ahora, 'EMITIDO'
      ) ON CONFLICT (clave_evento) DO NOTHING;
    ELSE
      INSERT INTO public.correos_simulados (
        clave_evento, sede_id, destinatario_usuario_id, destinatario, motivo_aviso,
        tarea_id, asunto, contenido, fecha_hora_prevista, emitido_en, estado
      ) VALUES (
        format('tarea:%s:seq:%s:rec24', v_t.id, v_t.sequence_ics),
        v_t.sede_id, v_t.responsable_id, v_t.resp_correo, 'RECORDATORIO_24H',
        v_t.id,
        format('[SIMULADO] Recordatorio 24h — %s: %s', v_t.folio, v_t.titulo),
        format('Umbral exacto de 24h alcanzado tras actualización de fecha: la tarea "%s" (%s) vence el %s.',
               v_t.titulo, v_t.folio, v_fecha_mx),
        p_ahora, p_ahora, 'EMITIDO'
      ) ON CONFLICT (clave_evento) DO NOTHING;
    END IF;

  ELSE
    IF p_incluir_asignacion THEN
      INSERT INTO public.correos_simulados (
        clave_evento, sede_id, destinatario_usuario_id, destinatario, motivo_aviso,
        es_urgente_menor_24h, tarea_id, asunto, contenido, fecha_hora_prevista, emitido_en, estado
      ) VALUES (
        format('tarea:%s:seq:%s:asig_urgente', v_t.id, v_t.sequence_ics),
        v_t.sede_id, v_t.responsable_id, v_t.resp_correo, 'ASIGNACION',
        TRUE, v_t.id,
        format('[SIMULADO][PLAZO <24H] Asignación urgente %s: %s', v_t.folio, v_t.titulo),
        format('AVISO URGENTE (plazo menor a 24 horas): Hola %s, se te asignó la tarea "%s" (%s). Fecha límite vigente: %s. No se programarán recordatorios preventivos adicionales.',
               v_t.resp_nombre, v_t.titulo, v_t.folio, v_fecha_mx),
        p_ahora, p_ahora, 'EMITIDO'
      ) ON CONFLICT (clave_evento) DO NOTHING;
    END IF;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public._programar_avisos_tarea(UUID, BOOLEAN, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.crear_tarea(
  p_proyecto_id UUID, p_departamento_id UUID, p_responsable_id UUID,
  p_titulo TEXT, p_alcance TEXT, p_fecha_limite TIMESTAMPTZ
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor RECORD; v_proyecto RECORD; v_resp RECORD;
  v_folio TEXT; v_tarea_id UUID; v_fecha_limite_mx DATE;
BEGIN
  SELECT id, rol, sede_id INTO v_actor FROM public.perfiles_usuario WHERE id = auth.uid() AND activo = TRUE;
  IF NOT FOUND OR v_actor.rol <> 'GS' THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403,
      'message', 'Solo la Gerencia de Sede puede crear y asignar tareas en su sede.');
  END IF;

  IF p_titulo IS NULL OR length(btrim(p_titulo)) = 0 OR p_alcance IS NULL OR length(btrim(p_alcance)) = 0 OR p_fecha_limite IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-002', 'http_status', 422,
      'message', 'Título, alcance y fecha límite son obligatorios.');
  END IF;

  SELECT p.id, p.sede_id, p.fecha_fin_proyecto, s.codigo_corto INTO v_proyecto
  FROM public.proyectos p JOIN public.sedes s ON s.id = p.sede_id WHERE p.id = p_proyecto_id;
  IF NOT FOUND OR v_proyecto.sede_id <> v_actor.sede_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403,
      'message', 'Acceso denegado: el proyecto no pertenece a su sede.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.departamentos d WHERE d.id = p_departamento_id AND d.sede_id = v_actor.sede_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403,
      'message', 'Acceso denegado: el departamento no pertenece a su sede.');
  END IF;

  SELECT id, rol, sede_id INTO v_resp FROM public.perfiles_usuario WHERE id = p_responsable_id AND activo = TRUE;
  IF NOT FOUND OR v_resp.sede_id <> v_actor.sede_id OR v_resp.rol <> 'OP' THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403,
      'message', 'El responsable debe ser Personal Operativo activo perteneciente a su sede.');
  END IF;

  v_fecha_limite_mx := (p_fecha_limite AT TIME ZONE 'America/Mexico_City')::date;
  IF v_fecha_limite_mx > v_proyecto.fecha_fin_proyecto THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-002', 'http_status', 422,
      'message', format('La fecha límite (%s) no puede superar el fin del proyecto (%s).', v_fecha_limite_mx, v_proyecto.fecha_fin_proyecto));
  END IF;

  v_folio := format('TAR-%s-%s', v_proyecto.codigo_corto, lpad(nextval('public.seq_folio_tarea')::text, 3, '0'));
  INSERT INTO public.tareas (
    folio, sede_id, proyecto_id, departamento_id, responsable_id,
    titulo, alcance, fecha_limite, estado, sequence_ics, creado_por
  ) VALUES (
    v_folio, v_actor.sede_id, p_proyecto_id, p_departamento_id, p_responsable_id,
    btrim(p_titulo), btrim(p_alcance), p_fecha_limite, 'ASIGNADA', 0, v_actor.id
  ) RETURNING id INTO v_tarea_id;

  PERFORM public._programar_avisos_tarea(v_tarea_id, TRUE, now());
  RETURN jsonb_build_object('ok', TRUE, 'http_status', 201, 'tarea_id', v_tarea_id, 'folio', v_folio, 'sequence_ics', 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.actualizar_avance_tarea(
  p_tarea_id UUID, p_estado TEXT, p_porcentaje_avance INT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor RECORD; v_tarea RECORD;
BEGIN
  SELECT id, rol, sede_id INTO v_actor FROM public.perfiles_usuario WHERE id = auth.uid() AND activo = TRUE;
  IF NOT FOUND OR v_actor.rol <> 'OP' THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403,
      'message', 'Solo el Personal Operativo responsable puede registrar avances con esta operación.');
  END IF;
  IF p_estado NOT IN ('ASIGNADA', 'EN_PROCESO', 'COMPLETADA') OR p_porcentaje_avance < 0 OR p_porcentaje_avance > 100 THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-002', 'http_status', 422, 'message', 'Estado o porcentaje inválido.');
  END IF;

  SELECT * INTO v_tarea FROM public.tareas WHERE id = p_tarea_id FOR UPDATE;
  IF NOT FOUND OR v_tarea.responsable_id <> v_actor.id THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403,
      'message', 'Acceso denegado: la tarea no está asignada a su usuario.');
  END IF;
  IF v_tarea.estado = 'CANCELADA' THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-004', 'http_status', 409, 'message', 'No se puede avanzar una tarea cancelada.');
  END IF;

  UPDATE public.tareas
  SET estado = p_estado,
      porcentaje_avance = CASE WHEN p_estado = 'COMPLETADA' THEN 100 ELSE p_porcentaje_avance END,
      actualizado_en = now()
  WHERE id = p_tarea_id;

  IF p_estado = 'COMPLETADA' THEN
    PERFORM public._programar_avisos_tarea(p_tarea_id, FALSE, now());
  END IF;
  RETURN jsonb_build_object('ok', TRUE, 'http_status', 200, 'tarea_id', p_tarea_id, 'estado', p_estado);
END;
$$;

CREATE OR REPLACE FUNCTION public.actualizar_tarea_gerencia(
  p_tarea_id UUID, p_titulo TEXT DEFAULT NULL, p_fecha_limite TIMESTAMPTZ DEFAULT NULL,
  p_estado TEXT DEFAULT NULL, p_motivo_cambio TEXT DEFAULT NULL,
  p_diferir_invalidacion_cp004 BOOLEAN DEFAULT FALSE
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor RECORD; v_tarea RECORD; v_proyecto RECORD;
  v_cambio_fecha BOOLEAN := FALSE; v_invalidadas INT := 0; v_permite_test BOOLEAN := FALSE;
BEGIN
  SELECT id, rol, sede_id INTO v_actor FROM public.perfiles_usuario WHERE id = auth.uid() AND activo = TRUE;
  IF NOT FOUND OR v_actor.rol <> 'GS' THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403,
      'message', 'Solo la Gerencia de Sede puede modificar tareas de su sede.');
  END IF;

  SELECT * INTO v_tarea FROM public.tareas WHERE id = p_tarea_id FOR UPDATE;
  IF NOT FOUND OR v_tarea.sede_id <> v_actor.sede_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403,
      'message', 'Acceso denegado: la tarea pertenece a otra sede.');
  END IF;
  SELECT * INTO v_proyecto FROM public.proyectos WHERE id = v_tarea.proyecto_id;

  IF p_fecha_limite IS NOT NULL AND p_fecha_limite IS DISTINCT FROM v_tarea.fecha_limite THEN
    IF (p_fecha_limite AT TIME ZONE 'America/Mexico_City')::date > v_proyecto.fecha_fin_proyecto THEN
      RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403,
        'message', 'La nueva fecha excede el fin del proyecto; tramite solicitud ante Dirección Nacional.');
    END IF;
    v_cambio_fecha := TRUE;
  END IF;

  UPDATE public.tareas
  SET titulo = COALESCE(NULLIF(btrim(p_titulo), ''), titulo),
      fecha_limite = COALESCE(p_fecha_limite, fecha_limite),
      estado = COALESCE(p_estado, estado),
      sequence_ics = CASE WHEN v_cambio_fecha OR (p_estado IS NOT NULL AND p_estado <> v_tarea.estado)
                          THEN sequence_ics + 1 ELSE sequence_ics END,
      actualizado_en = now()
  WHERE id = p_tarea_id;

  IF v_cambio_fecha THEN
    SELECT valor INTO v_permite_test FROM public.configuracion_pruebas WHERE clave = 'permitir_fallo_bitacora_cp002';
    IF NOT (p_diferir_invalidacion_cp004 AND COALESCE(v_permite_test, FALSE)) THEN
      UPDATE public.solicitudes_autorizacion
      SET estado = 'INVALIDADA_POR_DESACTUALIZACION',
          motivo_invalidacion = format(
            'La fecha límite de la tarea cambió de %s a %s por Gerencia de Sede%s.',
            to_char(v_tarea.fecha_limite AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI'),
            to_char(p_fecha_limite AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI'),
            CASE WHEN p_motivo_cambio IS NOT NULL AND length(btrim(p_motivo_cambio)) > 0
                 THEN ' (' || btrim(p_motivo_cambio) || ')' ELSE '' END
          ),
          invalidada_en = now(), actualizado_en = now()
      WHERE tarea_id = p_tarea_id AND estado = 'PENDIENTE_REVISION';
      GET DIAGNOSTICS v_invalidadas = ROW_COUNT;
    END IF;
  END IF;

  IF v_cambio_fecha OR (p_estado IN ('COMPLETADA', 'CANCELADA')) THEN
    PERFORM public._programar_avisos_tarea(p_tarea_id, FALSE, now());
  END IF;
  RETURN jsonb_build_object('ok', TRUE, 'http_status', 200, 'tarea_id', p_tarea_id, 'solicitudes_invalidadas', v_invalidadas);
END;
$$;

CREATE OR REPLACE FUNCTION public.crear_solicitud_autorizacion(
  p_tarea_id UUID, p_tipo TEXT, p_motivo_solicitud TEXT, p_idempotency_key UUID,
  p_fecha_propuesta TIMESTAMPTZ DEFAULT NULL, p_alcance_propuesto TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor RECORD; v_existente RECORD; v_tarea RECORD; v_proyecto RECORD; v_dest RECORD;
  v_dias INT := NULL; v_rol_resolver TEXT; v_cambio_texto TEXT; v_folio TEXT; v_solicitud_id UUID;
  v_fecha_ref_mx DATE; v_fecha_prop_mx DATE;
BEGIN
  SELECT id, nombre_completo, rol, sede_id INTO v_actor FROM public.perfiles_usuario WHERE id = auth.uid() AND activo = TRUE;
  IF NOT FOUND OR v_actor.rol NOT IN ('OP', 'GS') THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403,
      'message', 'Solo Personal Operativo o Gerencia de Sede pueden enviar solicitudes.');
  END IF;

  SELECT id, folio, rol_resolver, estado INTO v_existente
  FROM public.solicitudes_autorizacion WHERE solicitante_id = v_actor.id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', TRUE, 'http_status', 200, 'idempotent_replay', TRUE,
      'solicitud_id', v_existente.id, 'folio', v_existente.folio,
      'rol_resolver', v_existente.rol_resolver, 'estado', v_existente.estado);
  END IF;

  IF p_tipo NOT IN ('PRORROGA_FECHA', 'CAMBIO_ALCANCE') THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-002', 'http_status', 422,
      'message', 'Tipo de solicitud inválido. Solo se admiten PRORROGA_FECHA y CAMBIO_ALCANCE.');
  END IF;
  IF p_motivo_solicitud IS NULL OR length(btrim(p_motivo_solicitud)) = 0 THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-002', 'http_status', 422,
      'message', 'Debe proporcionar una explicación/motivo para la solicitud.');
  END IF;

  SELECT * INTO v_tarea FROM public.tareas WHERE id = p_tarea_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-002', 'http_status', 404, 'message', 'Tarea no encontrada.');
  END IF;
  IF v_actor.rol = 'OP' AND v_tarea.responsable_id <> v_actor.id THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403,
      'message', 'Acceso denegado: solo puede solicitar autorizaciones sobre sus propias tareas.');
  END IF;
  IF v_actor.rol = 'GS' AND v_tarea.sede_id <> v_actor.sede_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403,
      'message', 'Acceso denegado: la tarea pertenece a otra sede.');
  END IF;
  IF v_tarea.estado IN ('COMPLETADA', 'CANCELADA') THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-004', 'http_status', 409,
      'message', 'No se pueden crear solicitudes sobre tareas completadas o canceladas.');
  END IF;

  SELECT * INTO v_proyecto FROM public.proyectos WHERE id = v_tarea.proyecto_id;

  IF p_tipo = 'PRORROGA_FECHA' THEN
    IF p_fecha_propuesta IS NULL OR p_fecha_propuesta <= v_tarea.fecha_limite THEN
      RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-002', 'http_status', 422,
        'message', 'La fecha propuesta debe ser posterior a la fecha límite vigente.');
    END IF;
    v_fecha_ref_mx := (v_tarea.fecha_limite AT TIME ZONE 'America/Mexico_City')::date;
    v_fecha_prop_mx := (p_fecha_propuesta AT TIME ZONE 'America/Mexico_City')::date;
    v_dias := (v_fecha_prop_mx - v_fecha_ref_mx);
    IF v_actor.rol = 'OP' AND v_dias <= 5 AND v_fecha_prop_mx <= v_proyecto.fecha_fin_proyecto THEN
      v_rol_resolver := 'GS';
    ELSE
      v_rol_resolver := 'DN';
    END IF;
    v_cambio_texto := format('Prórroga de %s a %s (+%s días naturales)',
      to_char(v_tarea.fecha_limite AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI'),
      to_char(p_fecha_propuesta AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI'), v_dias);
  ELSE
    IF p_alcance_propuesto IS NULL OR length(btrim(p_alcance_propuesto)) = 0 THEN
      RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-002', 'http_status', 422,
        'message', 'Debe describir el alcance propuesto.');
    END IF;
    v_rol_resolver := 'DN';
    v_cambio_texto := 'Cambio de alcance: ' || btrim(p_alcance_propuesto);
  END IF;

  v_folio := format('AUT-%s-%s', to_char(now() AT TIME ZONE 'America/Mexico_City', 'YYYY'),
                    lpad(nextval('public.seq_folio_solicitud')::text, 3, '0'));

  INSERT INTO public.solicitudes_autorizacion (
    folio, tarea_id, sede_id, solicitante_id, idempotency_key,
    tipo, fecha_referencia, alcance_referencia, fecha_propuesta, alcance_propuesto,
    dias_naturales_solicitados, cambio_solicitado, motivo_solicitud, rol_resolver, estado
  ) VALUES (
    v_folio, v_tarea.id, v_tarea.sede_id, v_actor.id, p_idempotency_key,
    p_tipo, v_tarea.fecha_limite, v_tarea.alcance,
    CASE WHEN p_tipo = 'PRORROGA_FECHA' THEN p_fecha_propuesta ELSE NULL END,
    CASE WHEN p_tipo = 'CAMBIO_ALCANCE' THEN btrim(p_alcance_propuesto) ELSE NULL END,
    v_dias, v_cambio_texto, btrim(p_motivo_solicitud), v_rol_resolver, 'PENDIENTE_REVISION'
  ) RETURNING id INTO v_solicitud_id;

  FOR v_dest IN
    SELECT id, correo FROM public.perfiles_usuario
    WHERE activo = TRUE AND ((v_rol_resolver = 'DN' AND rol = 'DN') OR (v_rol_resolver = 'GS' AND rol = 'GS' AND sede_id = v_tarea.sede_id))
  LOOP
    INSERT INTO public.correos_simulados (
      clave_evento, sede_id, destinatario_usuario_id, destinatario, motivo_aviso,
      tarea_id, solicitud_id, asunto, contenido, fecha_hora_prevista, emitido_en, estado
    ) VALUES (
      format('sol:%s:creada:dest:%s', v_solicitud_id, v_dest.id), v_tarea.sede_id, v_dest.id, v_dest.correo, 'SOLICITUD',
      v_tarea.id, v_solicitud_id, format('[SIMULADO] Nueva solicitud %s (%s) — %s', v_folio, p_tipo, v_tarea.folio),
      format('%s solicitó %s sobre "%s" (%s). Motivo: %s. Asignada a: %s.',
             v_actor.nombre_completo, v_cambio_texto, v_tarea.titulo, v_tarea.folio, btrim(p_motivo_solicitud), v_rol_resolver),
      now(), now(), 'EMITIDO'
    ) ON CONFLICT (clave_evento) DO NOTHING;
  END LOOP;

  RETURN jsonb_build_object('ok', TRUE, 'http_status', 201, 'idempotent_replay', FALSE,
    'solicitud_id', v_solicitud_id, 'folio', v_folio, 'rol_resolver', v_rol_resolver,
    'estado', 'PENDIENTE_REVISION', 'dias_naturales', v_dias);
END;
$$;

CREATE OR REPLACE FUNCTION public.resolver_solicitud_autorizacion(
  p_solicitud_id UUID, p_dictamen TEXT, p_motivo_resolucion TEXT,
  p_idempotency_key UUID, p_simular_fallo_bitacora BOOLEAN DEFAULT FALSE
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor RECORD; v_sol_meta RECORD; v_tarea RECORD; v_sol RECORD; v_proyecto RECORD; v_bit RECORD; v_solicitante RECORD;
  v_valor_anterior TEXT; v_valor_nuevo TEXT; v_bitacora_id UUID; v_permite_fallo BOOLEAN := FALSE; v_motivo_inval TEXT; v_fecha_prop_mx DATE;
BEGIN
  SELECT id, nombre_completo, rol, sede_id INTO v_actor FROM public.perfiles_usuario WHERE id = auth.uid() AND activo = TRUE;
  IF NOT FOUND OR v_actor.rol NOT IN ('GS', 'DN') THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403,
      'message', 'Solo Gerencia de Sede o Dirección Nacional pueden resolver solicitudes.');
  END IF;
  IF p_dictamen NOT IN ('APROBADA', 'RECHAZADA') THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-002', 'http_status', 422, 'message', 'El dictamen debe ser APROBADA o RECHAZADA.');
  END IF;
  IF p_motivo_resolucion IS NULL OR length(btrim(p_motivo_resolucion)) = 0 THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-002', 'http_status', 422, 'message', 'Debe ingresar el motivo de la resolución.');
  END IF;

  SELECT id, tarea_id INTO v_sol_meta FROM public.solicitudes_autorizacion WHERE id = p_solicitud_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-002', 'http_status', 404, 'message', 'Solicitud no encontrada.');
  END IF;

  SELECT * INTO v_tarea FROM public.tareas WHERE id = v_sol_meta.tarea_id FOR UPDATE;
  SELECT * INTO v_sol FROM public.solicitudes_autorizacion WHERE id = p_solicitud_id FOR UPDATE;
  SELECT * INTO v_proyecto FROM public.proyectos WHERE id = v_tarea.proyecto_id FOR UPDATE;

  IF v_actor.rol = 'GS' AND v_sol.sede_id <> v_actor.sede_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403, 'message', 'Acceso denegado: la solicitud pertenece a otra sede.');
  END IF;
  IF v_sol.solicitante_id = v_actor.id THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-003', 'http_status', 403, 'message', 'ERR-003: Ningún usuario puede autorizar su propia solicitud.');
  END IF;
  IF v_actor.rol <> v_sol.rol_resolver THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403,
      'message', format('Acceso denegado: esta solicitud debe ser resuelta por %s.', v_sol.rol_resolver));
  END IF;

  IF v_sol.estado IN ('APROBADA', 'RECHAZADA') THEN
    SELECT * INTO v_bit FROM public.bitacora_autorizaciones WHERE solicitud_id = v_sol.id;
    IF v_bit.idempotency_key IS NOT NULL AND v_bit.idempotency_key = p_idempotency_key AND v_bit.usuario_resolutor_id = v_actor.id THEN
      RETURN jsonb_build_object('ok', TRUE, 'http_status', 200, 'idempotent_replay', TRUE,
        'solicitud_id', v_sol.id, 'bitacora_id', v_bit.id, 'dictamen', v_bit.dictamen, 'resuelto_en', v_bit.resuelto_en);
    END IF;
    RETURN jsonb_build_object(
      'ok', FALSE, 'error_code', 'ERR-004', 'http_status', 409,
      'message', format('La solicitud ya fue resuelta previamente por %s con dictamen %s el %s.',
        v_bit.resolutor_nombre_snapshot, v_bit.dictamen,
        to_char(v_bit.resuelto_en AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI:SS')),
      'resuelto_por', v_bit.resolutor_nombre_snapshot, 'dictamen', v_bit.dictamen, 'resuelto_en', v_bit.resuelto_en
    );
  END IF;

  IF v_sol.estado = 'INVALIDADA_POR_DESACTUALIZACION' THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-004', 'http_status', 409,
      'message', format('La solicitud fue invalidada por desactualización: %s', v_sol.motivo_invalidacion),
      'motivo_original', v_sol.motivo_solicitud, 'motivo_invalidacion', v_sol.motivo_invalidacion, 'invalidada_en', v_sol.invalidada_en);
  END IF;

  IF v_tarea.fecha_limite IS DISTINCT FROM v_sol.fecha_referencia THEN
    v_motivo_inval := format('Fecha límite de referencia desactualizada al resolver: era %s al solicitar y actualmente es %s.',
      to_char(v_sol.fecha_referencia AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI'),
      to_char(v_tarea.fecha_limite AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI'));
    UPDATE public.solicitudes_autorizacion
    SET estado = 'INVALIDADA_POR_DESACTUALIZACION', motivo_invalidacion = v_motivo_inval, invalidada_en = now(), actualizado_en = now()
    WHERE id = v_sol.id;
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-004', 'http_status', 409,
      'estado', 'INVALIDADA_POR_DESACTUALIZACION',
      'message', 'ERR-004: La fecha límite de la tarea cambió antes de resolver. Solicitud invalidada por desactualización.',
      'motivo_original', v_sol.motivo_solicitud, 'motivo_invalidacion', v_motivo_inval);
  END IF;

  IF v_sol.tipo = 'PRORROGA_FECHA' THEN
    v_valor_anterior := to_char(v_tarea.fecha_limite AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI') || ' (America/Mexico_City)';
    IF p_dictamen = 'APROBADA' THEN
      v_valor_nuevo := to_char(v_sol.fecha_propuesta AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI') || ' (America/Mexico_City)';
      v_fecha_prop_mx := (v_sol.fecha_propuesta AT TIME ZONE 'America/Mexico_City')::date;
      IF v_fecha_prop_mx > v_proyecto.fecha_fin_proyecto THEN
        UPDATE public.proyectos SET fecha_fin_proyecto = v_fecha_prop_mx, actualizado_en = now() WHERE id = v_proyecto.id;
        v_valor_nuevo := v_valor_nuevo || format(' [Fin proyecto ajustado a %s]', v_fecha_prop_mx);
      END IF;
      UPDATE public.tareas SET fecha_limite = v_sol.fecha_propuesta, sequence_ics = sequence_ics + 1, actualizado_en = now() WHERE id = v_tarea.id;
      UPDATE public.solicitudes_autorizacion
      SET estado = 'INVALIDADA_POR_DESACTUALIZACION',
          motivo_invalidacion = format('Otra prórroga (%s) modificó la fecha límite vigente a %s.', v_sol.folio,
            to_char(v_sol.fecha_propuesta AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI')),
          invalidada_en = now(), actualizado_en = now()
      WHERE tarea_id = v_tarea.id AND id <> v_sol.id AND estado = 'PENDIENTE_REVISION';
    ELSE
      v_valor_nuevo := v_valor_anterior || ' (Sin cambio — solicitud rechazada)';
    END IF;
  ELSE
    v_valor_anterior := v_tarea.alcance;
    IF p_dictamen = 'APROBADA' THEN
      v_valor_nuevo := v_sol.alcance_propuesto;
      UPDATE public.tareas SET alcance = v_sol.alcance_propuesto, sequence_ics = sequence_ics + 1, actualizado_en = now() WHERE id = v_tarea.id;
    ELSE
      v_valor_nuevo := v_valor_anterior || ' (Sin cambio — solicitud rechazada)';
    END IF;
  END IF;

  UPDATE public.solicitudes_autorizacion SET estado = p_dictamen, actualizado_en = now() WHERE id = v_sol.id;

  IF p_simular_fallo_bitacora THEN
    SELECT valor INTO v_permite_fallo FROM public.configuracion_pruebas WHERE clave = 'permitir_fallo_bitacora_cp002';
    IF COALESCE(v_permite_fallo, FALSE) THEN
      PERFORM set_config('app.simular_fallo_bitacora', 'true', TRUE);
    END IF;
  END IF;

  INSERT INTO public.bitacora_autorizaciones (
    solicitud_id, tarea_id, sede_id, usuario_resolutor_id, resolutor_nombre_snapshot,
    resolutor_rol_snapshot, idempotency_key, dictamen, motivo_resolucion, valor_anterior, valor_nuevo
  ) VALUES (
    v_sol.id, v_tarea.id, v_tarea.sede_id, v_actor.id, v_actor.nombre_completo,
    v_actor.rol, p_idempotency_key, p_dictamen, btrim(p_motivo_resolucion), v_valor_anterior, v_valor_nuevo
  ) RETURNING id INTO v_bitacora_id;

  IF p_dictamen = 'APROBADA' AND v_sol.tipo = 'PRORROGA_FECHA' THEN
    PERFORM public._programar_avisos_tarea(v_tarea.id, FALSE, now());
  END IF;

  SELECT correo INTO v_solicitante FROM public.perfiles_usuario WHERE id = v_sol.solicitante_id;
  INSERT INTO public.correos_simulados (
    clave_evento, sede_id, destinatario_usuario_id, destinatario, motivo_aviso,
    tarea_id, solicitud_id, asunto, contenido, fecha_hora_prevista, emitido_en, estado
  ) VALUES (
    format('sol:%s:resuelta', v_sol.id), v_tarea.sede_id, v_sol.solicitante_id, v_solicitante.correo, 'RESOLUCION',
    v_tarea.id, v_sol.id, format('[SIMULADO] Solicitud %s %s — %s', v_sol.folio, p_dictamen, v_tarea.folio),
    format('Tu solicitud %s sobre "%s" fue %s por %s (%s). Motivo: %s. Cambio: %s -> %s.',
           v_sol.folio, v_tarea.titulo, p_dictamen, v_actor.nombre_completo, v_actor.rol, btrim(p_motivo_resolucion), v_valor_anterior, v_valor_nuevo),
    now(), now(), 'EMITIDO'
  ) ON CONFLICT (clave_evento) DO NOTHING;

  RETURN jsonb_build_object('ok', TRUE, 'http_status', 200, 'idempotent_replay', FALSE,
    'solicitud_id', v_sol.id, 'bitacora_id', v_bitacora_id, 'dictamen', p_dictamen,
    'valor_anterior', v_valor_anterior, 'valor_nuevo', v_valor_nuevo);
END;
$$;

CREATE OR REPLACE FUNCTION public.verificar_hash_documento(
  p_tarea_id UUID, p_nombre_documento TEXT, p_hash_sha256 TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor RECORD; v_tarea RECORD; v_etiqueta TEXT;
BEGIN
  SELECT id, rol, sede_id INTO v_actor FROM public.perfiles_usuario WHERE id = auth.uid() AND activo = TRUE;
  SELECT id, sede_id, responsable_id INTO v_tarea FROM public.tareas WHERE id = p_tarea_id;
  IF NOT FOUND OR NOT ((v_actor.rol = 'GS' AND v_tarea.sede_id = v_actor.sede_id) OR (v_actor.rol = 'OP' AND v_tarea.responsable_id = v_actor.id)) THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403, 'message', 'No tiene permiso para cargar documentos en esta tarea.');
  END IF;
  SELECT v.etiqueta INTO v_etiqueta
  FROM public.documentos_tarea d JOIN public.documento_versiones v ON v.documento_id = d.id
  WHERE d.tarea_id = p_tarea_id AND lower(d.nombre_documento) = lower(btrim(p_nombre_documento)) AND v.hash_sha256 = lower(p_hash_sha256)
  ORDER BY v.numero_version DESC LIMIT 1;

  RETURN jsonb_build_object('ok', TRUE, 'duplicado_en_mismo_documento', v_etiqueta IS NOT NULL, 'version_coincidente', v_etiqueta,
    'advertencia', CASE WHEN v_etiqueta IS NOT NULL THEN format('El archivo cargado es idéntico a una versión previa (%s) de este documento.', v_etiqueta) ELSE NULL END);
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_version_documento(
  p_tarea_id UUID, p_nombre_documento TEXT, p_archivo_path TEXT, p_nombre_original TEXT,
  p_mime_type TEXT, p_tamano_bytes BIGINT, p_hash_sha256 TEXT, p_descripcion_cambio TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor RECORD; v_tarea RECORD; v_doc_id UUID; v_next INT; v_dup TEXT; v_ver_id UUID; v_etq TEXT;
BEGIN
  SELECT id, rol, sede_id INTO v_actor FROM public.perfiles_usuario WHERE id = auth.uid() AND activo = TRUE;
  IF NOT FOUND OR v_actor.rol NOT IN ('OP', 'GS') THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403, 'message', 'Solo el responsable asignado o la Gerencia de Sede pueden subir revisiones.');
  END IF;
  IF p_nombre_documento IS NULL OR length(btrim(p_nombre_documento)) = 0 OR p_descripcion_cambio IS NULL OR length(btrim(p_descripcion_cambio)) = 0 THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-002', 'http_status', 422, 'message', 'El nombre del documento y la descripción del cambio son obligatorios.');
  END IF;

  SELECT * INTO v_tarea FROM public.tareas WHERE id = p_tarea_id FOR UPDATE;
  IF NOT FOUND OR (v_actor.rol = 'OP' AND v_tarea.responsable_id <> v_actor.id) OR (v_actor.rol = 'GS' AND v_tarea.sede_id <> v_actor.sede_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403, 'message', 'Acceso denegado: no está autorizado para subir documentos a esta tarea.');
  END IF;

  INSERT INTO public.documentos_tarea (tarea_id, sede_id, nombre_documento, creado_por)
  VALUES (v_tarea.id, v_tarea.sede_id, btrim(p_nombre_documento), v_actor.id)
  ON CONFLICT (tarea_id, nombre_documento) DO NOTHING;

  SELECT id INTO v_doc_id FROM public.documentos_tarea
  WHERE tarea_id = v_tarea.id AND nombre_documento = btrim(p_nombre_documento) FOR UPDATE;

  SELECT etiqueta INTO v_dup FROM public.documento_versiones
  WHERE documento_id = v_doc_id AND hash_sha256 = lower(p_hash_sha256) ORDER BY numero_version DESC LIMIT 1;

  SELECT COALESCE(MAX(numero_version), 0) + 1 INTO v_next FROM public.documento_versiones WHERE documento_id = v_doc_id;

  INSERT INTO public.documento_versiones (
    documento_id, sede_id, numero_version, archivo_path, nombre_original, mime_type,
    tamano_bytes, hash_sha256, hash_duplicado_en_documento, autor_id, descripcion_cambio, es_vigente
  ) VALUES (
    v_doc_id, v_tarea.sede_id, v_next, p_archivo_path, p_nombre_original,
    COALESCE(NULLIF(p_mime_type, ''), 'application/octet-stream'), p_tamano_bytes, lower(p_hash_sha256),
    (v_dup IS NOT NULL), v_actor.id, btrim(p_descripcion_cambio), FALSE
  ) RETURNING id, etiqueta INTO v_ver_id, v_etq;

  RETURN jsonb_build_object('ok', TRUE, 'http_status', 201, 'documento_id', v_doc_id, 'version_id', v_ver_id,
    'etiqueta', v_etq, 'es_vigente', FALSE,
    'advertencia_hash_duplicado', CASE WHEN v_dup IS NOT NULL THEN format('El archivo cargado es idéntico a una versión previa (%s) de este documento.', v_dup) ELSE NULL END);
END;
$$;

CREATE OR REPLACE FUNCTION public.designar_version_vigente(p_version_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor RECORD; v_ver RECORD;
BEGIN
  SELECT id, rol, sede_id INTO v_actor FROM public.perfiles_usuario WHERE id = auth.uid() AND activo = TRUE;
  IF NOT FOUND OR v_actor.rol <> 'GS' THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403,
      'message', 'ERR-001: Únicamente la Gerencia de Sede puede designar una versión como Oficial / Vigente.');
  END IF;
  SELECT id, documento_id, sede_id, etiqueta INTO v_ver FROM public.documento_versiones WHERE id = p_version_id;
  IF NOT FOUND OR v_ver.sede_id <> v_actor.sede_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403, 'message', 'Acceso denegado: el documento no pertenece a su sede.');
  END IF;

  PERFORM 1 FROM public.documentos_tarea WHERE id = v_ver.documento_id FOR UPDATE;
  UPDATE public.documento_versiones SET es_vigente = FALSE WHERE documento_id = v_ver.documento_id AND es_vigente = TRUE;
  UPDATE public.documento_versiones SET es_vigente = TRUE, designada_por = v_actor.id, designada_en = now() WHERE id = v_ver.id;

  RETURN jsonb_build_object('ok', TRUE, 'http_status', 200, 'documento_id', v_ver.documento_id, 'version_id', v_ver.id, 'etiqueta', v_ver.etiqueta);
END;
$$;

CREATE OR REPLACE FUNCTION public.evaluar_recordatorios_simulados(p_fecha_evaluacion TIMESTAMPTZ DEFAULT now())
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor RECORD; v_emitidos INT := 0; v_cancelados INT := 0;
BEGIN
  SELECT id, rol, sede_id INTO v_actor FROM public.perfiles_usuario WHERE id = auth.uid() AND activo = TRUE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403, 'message', 'Sesión no autenticada.'); END IF;

  UPDATE public.correos_simulados c SET estado = 'CANCELADO'
  FROM public.tareas t
  WHERE c.tarea_id = t.id AND c.estado = 'PROGRAMADO'
    AND c.motivo_aviso IN ('RECORDATORIO_48H', 'RECORDATORIO_24H')
    AND t.estado IN ('COMPLETADA', 'CANCELADA')
    AND (v_actor.rol = 'DN' OR (v_actor.rol = 'GS' AND c.sede_id = v_actor.sede_id) OR (v_actor.rol = 'OP' AND t.responsable_id = v_actor.id));
  GET DIAGNOSTICS v_cancelados = ROW_COUNT;

  UPDATE public.correos_simulados c SET estado = 'EMITIDO', emitido_en = p_fecha_evaluacion
  FROM public.tareas t
  WHERE c.tarea_id = t.id AND c.estado = 'PROGRAMADO'
    AND c.motivo_aviso IN ('RECORDATORIO_48H', 'RECORDATORIO_24H')
    AND t.estado IN ('ASIGNADA', 'EN_PROCESO')
    AND c.fecha_hora_prevista <= p_fecha_evaluacion
    AND (v_actor.rol = 'DN' OR (v_actor.rol = 'GS' AND c.sede_id = v_actor.sede_id) OR (v_actor.rol = 'OP' AND t.responsable_id = v_actor.id));
  GET DIAGNOSTICS v_emitidos = ROW_COUNT;

  RETURN jsonb_build_object('ok', TRUE, 'http_status', 200, 'fecha_evaluada', p_fecha_evaluacion,
    'recordatorios_emitidos', v_emitidos, 'recordatorios_cancelados', v_cancelados);
END;
$$;

CREATE OR REPLACE FUNCTION public.obtener_metricas_dashboard()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor RECORD; v_resumen JSONB;
BEGIN
  SELECT id, rol, sede_id INTO v_actor FROM public.perfiles_usuario WHERE id = auth.uid() AND activo = TRUE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', FALSE, 'error_code', 'ERR-001', 'http_status', 403); END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(m)), '[]'::jsonb) INTO v_resumen FROM (
    SELECT s.id AS sede_id, s.nombre AS sede_nombre,
           COUNT(t.id) AS total_tareas,
           COUNT(t.id) FILTER (WHERE t.estado IN ('ASIGNADA', 'EN_PROCESO')) AS pendientes,
           COUNT(t.id) FILTER (WHERE t.estado IN ('ASIGNADA', 'EN_PROCESO') AND t.fecha_limite < now()) AS retrasadas,
           COUNT(t.id) FILTER (WHERE t.estado = 'COMPLETADA') AS completadas,
           COALESCE(ROUND(AVG(t.porcentaje_avance) FILTER (WHERE t.estado <> 'CANCELADA'), 1), 0) AS avance_promedio,
           (SELECT COUNT(*) FROM public.solicitudes_autorizacion sa WHERE sa.sede_id = s.id AND sa.estado = 'PENDIENTE_REVISION') AS solicitudes_pendientes
    FROM public.sedes s
    LEFT JOIN public.tareas t ON t.sede_id = s.id
      AND (v_actor.rol = 'DN' OR (v_actor.rol = 'GS' AND t.sede_id = v_actor.sede_id) OR (v_actor.rol = 'OP' AND t.responsable_id = v_actor.id))
    WHERE v_actor.rol = 'DN' OR s.id = v_actor.sede_id
    GROUP BY s.id, s.nombre ORDER BY s.id
  ) m;

  RETURN jsonb_build_object('ok', TRUE, 'rol', v_actor.rol, 'sedes', v_resumen);
END;
$$;

REVOKE ALL ON FUNCTION public.crear_tarea(UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_tarea(UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
REVOKE ALL ON FUNCTION public.actualizar_avance_tarea(UUID, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.actualizar_avance_tarea(UUID, TEXT, INT) TO authenticated;
REVOKE ALL ON FUNCTION public.actualizar_tarea_gerencia(UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.actualizar_tarea_gerencia(UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN) TO authenticated;
REVOKE ALL ON FUNCTION public.crear_solicitud_autorizacion(UUID, TEXT, TEXT, UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_solicitud_autorizacion(UUID, TEXT, TEXT, UUID, TIMESTAMPTZ, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.resolver_solicitud_autorizacion(UUID, TEXT, TEXT, UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolver_solicitud_autorizacion(UUID, TEXT, TEXT, UUID, BOOLEAN) TO authenticated;
REVOKE ALL ON FUNCTION public.verificar_hash_documento(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verificar_hash_documento(UUID, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.registrar_version_documento(UUID, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_version_documento(UUID, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.designar_version_vigente(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.designar_version_vigente(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.evaluar_recordatorios_simulados(TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluar_recordatorios_simulados(TIMESTAMPTZ) TO authenticated;
REVOKE ALL ON FUNCTION public.obtener_metricas_dashboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_metricas_dashboard() TO authenticated;
