'use client';

import React, { useMemo, useState } from 'react';
import { AlertCircle, CalendarCog, WifiOff, X } from 'lucide-react';
import { useIdempotentDraft } from '@/hooks/useIdempotentDraft';
import { useSessionGuard } from '@/components/session/SessionInactivityGuard';
import { OFFLINE_ERROR_MESSAGE } from '@/lib/offline/client';
import { mexicoCityLocalToIso, toMexicoCityInputValue } from '@/lib/dates/mexicoCity';
import type { EstadoTarea, TareaEnriquecida } from '@/lib/supabase/types';

interface EditarTareaDraft {
  titulo: string;
  fechaLocal: string;
  estado: EstadoTarea;
  motivoCambio: string;
}

export function EditarTareaGerenciaModal({
  tarea,
  onClose,
  onUpdated,
}: {
  tarea: TareaEnriquecida;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { effectiveOnline, justReconnected, reportNetworkFailure } = useSessionGuard();

  const defaultFechaLocal = useMemo(() => toMexicoCityInputValue(tarea.fecha_limite), [tarea.fecha_limite]);

  const draft = useIdempotentDraft<EditarTareaDraft>(`oc_draft_editar_tarea_${tarea.id}`, {
    titulo: tarea.titulo,
    fechaLocal: defaultFechaLocal,
    estado: tarea.estado,
    motivoCambio: '',
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!effectiveOnline) {
      setErrorMsg(OFFLINE_ERROR_MESSAGE);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/tareas/${tarea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modo: 'gerencia',
          titulo: draft.data.titulo,
          fecha_limite: mexicoCityLocalToIso(draft.data.fechaLocal),
          estado: draft.data.estado,
          motivo_cambio: draft.data.motivoCambio,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setErrorMsg(json.message ?? 'No fue posible actualizar la tarea.');
        return;
      }
      draft.clearDraft();
      onUpdated();
      onClose();
    } catch {
      reportNetworkFailure();
      setErrorMsg(OFFLINE_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg max-h-[92dvh] sm:max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl shadow-2xl p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4">
        <div className="flex items-start justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Administrar Tarea — {tarea.folio}</h3>
            <p className="text-xs text-slate-500">
              Cambiar la fecha límite actualiza el calendario e invalida solicitudes pendientes de revisión.
            </p>
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs font-medium text-amber-900">
            Se restauró tu borrador guardado localmente.
          </div>
        )}

        {justReconnected && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-900 font-medium">
            Conexión restablecida. Revise su información antes de guardar (no se realizó envío automático).
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-center gap-2"
          >
            {effectiveOnline ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <WifiOff className="w-4 h-4 shrink-0" />
            )}
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Título</label>
            <input
              type="text"
              required
              value={draft.data.titulo}
              onChange={(e) => draft.updateDraft((prev) => ({ ...prev, titulo: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha límite (America/Mexico_City)
              </label>
              <input
                type="datetime-local"
                required
                value={draft.data.fechaLocal}
                onChange={(e) => draft.updateDraft((prev) => ({ ...prev, fechaLocal: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estado</label>
              <select
                value={draft.data.estado}
                onChange={(e) =>
                  draft.updateDraft((prev) => ({ ...prev, estado: e.target.value as EstadoTarea }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="ASIGNADA">ASIGNADA</option>
                <option value="EN_PROCESO">EN_PROCESO</option>
                <option value="COMPLETADA">COMPLETADA</option>
                <option value="CANCELADA">CANCELADA</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo de ajuste (opcional, se registra al invalidar solicitudes pendientes)
            </label>
            <input
              type="text"
              value={draft.data.motivoCambio}
              onChange={(e) => draft.updateDraft((prev) => ({ ...prev, motivoCambio: e.target.value }))}
              placeholder="Ej. Reprogramación administrativa de sede"
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
              disabled={saving}
              className="w-full sm:w-auto justify-center min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-semibold"
            >
              <CalendarCog className="w-4 h-4" />
              {saving ? 'Aplicando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
