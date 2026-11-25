-- ============================================================================
-- OFICINA CONECTA — MIGRACIÓN 0002: RLS (PER-001..PER-008) Y SUPABASE STORAGE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auth_rol()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT rol FROM public.perfiles_usuario WHERE id = auth.uid() AND activo = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.auth_sede_id()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sede_id FROM public.perfiles_usuario WHERE id = auth.uid() AND activo = TRUE;
$$;

REVOKE ALL ON FUNCTION public.auth_rol() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_rol() TO authenticated;
REVOKE ALL ON FUNCTION public.auth_sede_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_sede_id() TO authenticated;

ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_autorizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora_autorizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_tarea ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documento_versiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.correos_simulados ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.tareas FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.solicitudes_autorizacion FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.documentos_tarea FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.documento_versiones FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.correos_simulados FROM anon, authenticated;

CREATE POLICY pol_sedes_select ON public.sedes FOR SELECT TO authenticated
USING (public.auth_rol() = 'DN' OR id = public.auth_sede_id());

CREATE POLICY pol_deptos_select ON public.departamentos FOR SELECT TO authenticated
USING (public.auth_rol() = 'DN' OR sede_id = public.auth_sede_id());

CREATE POLICY pol_deptos_gs_insert ON public.departamentos FOR INSERT TO authenticated
WITH CHECK (public.auth_rol() = 'GS' AND sede_id = public.auth_sede_id());

CREATE POLICY pol_deptos_gs_update ON public.departamentos FOR UPDATE TO authenticated
USING (public.auth_rol() = 'GS' AND sede_id = public.auth_sede_id())
WITH CHECK (public.auth_rol() = 'GS' AND sede_id = public.auth_sede_id());

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE ON public.departamentos TO authenticated;
GRANT INSERT, UPDATE ON public.proyectos TO authenticated;

CREATE POLICY pol_perfiles_select ON public.perfiles_usuario FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.auth_rol() = 'DN'
  OR (public.auth_rol() = 'GS' AND sede_id = public.auth_sede_id())
);

CREATE POLICY pol_proyectos_select ON public.proyectos FOR SELECT TO authenticated
USING (
  public.auth_rol() = 'DN'
  OR (public.auth_rol() = 'GS' AND sede_id = public.auth_sede_id())
  OR (public.auth_rol() = 'OP' AND EXISTS (
    SELECT 1 FROM public.tareas t WHERE t.proyecto_id = proyectos.id AND t.responsable_id = auth.uid()
  ))
);

CREATE POLICY pol_proyectos_gs_insert ON public.proyectos FOR INSERT TO authenticated
WITH CHECK (public.auth_rol() = 'GS' AND sede_id = public.auth_sede_id() AND creado_por = auth.uid());

CREATE POLICY pol_proyectos_gs_update ON public.proyectos FOR UPDATE TO authenticated
USING (public.auth_rol() = 'GS' AND sede_id = public.auth_sede_id())
WITH CHECK (public.auth_rol() = 'GS' AND sede_id = public.auth_sede_id());

CREATE POLICY pol_tareas_select ON public.tareas FOR SELECT TO authenticated
USING (
  public.auth_rol() = 'DN'
  OR (public.auth_rol() = 'GS' AND sede_id = public.auth_sede_id())
  OR (public.auth_rol() = 'OP' AND responsable_id = auth.uid())
);

CREATE POLICY pol_solicitudes_select ON public.solicitudes_autorizacion FOR SELECT TO authenticated
USING (
  public.auth_rol() = 'DN'
  OR (public.auth_rol() = 'GS' AND sede_id = public.auth_sede_id())
  OR (public.auth_rol() = 'OP' AND EXISTS (
    SELECT 1 FROM public.tareas t WHERE t.id = solicitudes_autorizacion.tarea_id AND t.responsable_id = auth.uid()
  ))
);

CREATE POLICY pol_bitacora_select ON public.bitacora_autorizaciones FOR SELECT TO authenticated
USING (
  public.auth_rol() = 'DN'
  OR (public.auth_rol() = 'GS' AND sede_id = public.auth_sede_id())
  OR (public.auth_rol() = 'OP' AND EXISTS (
    SELECT 1 FROM public.tareas t WHERE t.id = bitacora_autorizaciones.tarea_id AND t.responsable_id = auth.uid()
  ))
);

CREATE POLICY pol_docs_select ON public.documentos_tarea FOR SELECT TO authenticated
USING (
  public.auth_rol() = 'DN'
  OR (public.auth_rol() = 'GS' AND sede_id = public.auth_sede_id())
  OR (public.auth_rol() = 'OP' AND EXISTS (
    SELECT 1 FROM public.tareas t WHERE t.id = documentos_tarea.tarea_id AND t.responsable_id = auth.uid()
  ))
);

CREATE POLICY pol_versiones_select ON public.documento_versiones FOR SELECT TO authenticated
USING (
  public.auth_rol() = 'DN'
  OR (public.auth_rol() = 'GS' AND sede_id = public.auth_sede_id())
  OR (public.auth_rol() = 'OP' AND EXISTS (
    SELECT 1
    FROM public.documentos_tarea d
    JOIN public.tareas t ON t.id = d.tarea_id
    WHERE d.id = documento_versiones.documento_id AND t.responsable_id = auth.uid()
  ))
);

CREATE POLICY pol_correos_select ON public.correos_simulados FOR SELECT TO authenticated
USING (
  public.auth_rol() = 'DN'
  OR (public.auth_rol() = 'GS' AND sede_id = public.auth_sede_id())
  OR (public.auth_rol() = 'OP' AND (
    destinatario_usuario_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tareas t WHERE t.id = correos_simulados.tarea_id AND t.responsable_id = auth.uid())
  ))
);

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documentos-tareas', 'documentos-tareas', FALSE, 52428800)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY pol_storage_docs_select ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos-tareas'
  AND (
    public.auth_rol() = 'DN'
    OR (public.auth_rol() = 'GS' AND (storage.foldername(name))[1] = public.auth_sede_id())
    OR (public.auth_rol() = 'OP' AND EXISTS (
      SELECT 1 FROM public.tareas t
      WHERE t.id::text = (storage.foldername(name))[2]
        AND t.sede_id = (storage.foldername(name))[1]
        AND t.responsable_id = auth.uid()
    ))
  )
);

CREATE POLICY pol_storage_docs_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documentos-tareas'
  AND (
    (public.auth_rol() = 'GS' AND (storage.foldername(name))[1] = public.auth_sede_id())
    OR (public.auth_rol() = 'OP' AND EXISTS (
      SELECT 1 FROM public.tareas t
      WHERE t.id::text = (storage.foldername(name))[2]
        AND t.sede_id = (storage.foldername(name))[1]
        AND t.responsable_id = auth.uid()
    ))
  )
);
