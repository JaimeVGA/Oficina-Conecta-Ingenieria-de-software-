'use client';

import React, { useMemo, useState } from 'react';
import { AlertCircle, Plus, X } from 'lucide-react';
import { useIdempotentDraft } from '@/hooks/useIdempotentDraft';
import { useSessionGuard } from '@/components/session/SessionInactivityGuard';
import { mexicoCityLocalToIso, toMexicoCityInputValue } from '@/lib/dates/mexicoCity';
import type { Departamento, PerfilUsuario, Proyecto } from '@/lib/supabase/types';

export function CrearTareaModal({
  proyectos,
  departamentos,
  operativos,
  onClose,
  onCreated,
}: {
  proyectos: Proyecto[];
  departamentos: Departamento[];
  operativos: PerfilUsuario[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { effectiveOnline } = useSessionGuard();
  const defaultDeadline = useMemo(
    () => toMexicoCityInputValue(new Date(Date.now() + 72 * 3600_000)),
    []
  );

  const draft = useIdempotentDraft('oc_draft_crear_tarea', {
    proyecto_id: proyectos[0]?.id ?? '',
    departamento_id: proyectos[0]?.departamento_id ?? departamentos[0]?.id ?? '',
    responsable_id: operativos[0]?.id ?? '',
    titulo: '',
    alcance: '',
    fecha_limite_local: defaultDeadline,
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedProject = proyectos.find((p) => p.id === draft.data.proyecto_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!effectiveOnline) {
      setErrorMsg('Sin conexión con el servidor central: los cambios no se han guardado.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyecto_id: draft.data.proyecto_id,
          departamento_id: draft.data.departamento_id,
          responsable_id: draft.data.responsable_id,
          titulo: draft.data.titulo,
          alcance: draft.data.alcance,
          fecha_limite: mexicoCityLocalToIso(draft.data.fecha_limite_local),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setErrorMsg(json.message ?? 'Error al crear la tarea.');
        return;
      }
      draft.clearDraft();
      onCreated();
      onClose();
    } catch {
      setErrorMsg('Sin conexión con el servidor central: los cambios no se han guardado.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-xl max-h-[92dvh] sm:max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl shadow-2xl p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4">
        <div className="flex items-start justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Nueva Tarea</h3>
            <p className="text-xs text-slate-500">Asigna una nueva tarea y notifica automáticamente al responsable.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg min-h-[40px] min-w-[40px] inline-flex items-center justify-center text-slate-400 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {draft.hasRestoredDraft && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-[11px] font-medium text-amber-900">
            Se restauró tu borrador guardado localmente.
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Proyecto</label>
              <select
                required
                value={draft.data.proyecto_id}
                onChange={(e) => {
                  const p = proyectos.find((x) => x.id === e.target.value);
                  draft.updateDraft((prev) => ({
                    ...prev,
                    proyecto_id: e.target.value,
                    departamento_id: p?.departamento_id ?? prev.departamento_id,
                  }));
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} (Fin: {p.fecha_fin_proyecto})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Departamento</label>
              <select
                required
                value={draft.data.departamento_id}
                onChange={(e) => draft.updateDraft((p) => ({ ...p, departamento_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Responsable (Personal Operativo)</label>
              <select
                required
                value={draft.data.responsable_id}
                onChange={(e) => draft.updateDraft((p) => ({ ...p, responsable_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                {operativos.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre_completo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha límite (America/Mexico_City)
              </label>
              <input
                type="datetime-local"
                required
                value={draft.data.fecha_limite_local}
                onChange={(e) => draft.updateDraft((p) => ({ ...p, fecha_limite_local: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
              {selectedProject && (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tope del proyecto: {selectedProject.fecha_fin_proyecto}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Título de la tarea</label>
            <input
              type="text"
              required
              value={draft.data.titulo}
              onChange={(e) => draft.updateDraft((p) => ({ ...p, titulo: e.target.value }))}
              placeholder="Ej. Calibración de Tableros"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Alcance y entregables</label>
            <textarea
              rows={3}
              required
              value={draft.data.alcance}
              onChange={(e) => draft.updateDraft((p) => ({ ...p, alcance: e.target.value }))}
              placeholder="Describa el alcance esperado..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto justify-center min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto justify-center min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Guardando...' : 'Crear y Asignar Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
