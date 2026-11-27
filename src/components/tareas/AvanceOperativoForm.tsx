'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Save, WifiOff } from 'lucide-react';
import { useIdempotentDraft } from '@/hooks/useIdempotentDraft';
import { useSessionGuard } from '@/components/session/SessionInactivityGuard';
import { OFFLINE_ERROR_MESSAGE } from '@/lib/offline/client';
import type { EstadoTarea, TareaEnriquecida } from '@/lib/supabase/types';

export function AvanceOperativoForm({
  tarea,
  onUpdated,
}: {
  tarea: TareaEnriquecida;
  onUpdated: () => void;
}) {
  const { effectiveOnline, justReconnected, reportNetworkFailure } = useSessionGuard();
  const draft = useIdempotentDraft<{ estado: EstadoTarea; porcentaje: number }>(
    `oc_draft_avance_${tarea.id}`,
    {
      estado: tarea.estado,
      porcentaje: tarea.porcentaje_avance,
    }
  );

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!effectiveOnline) {
      setErrorMsg(OFFLINE_ERROR_MESSAGE);
      return;
    }

    setSaving(true);
    try {
      const targetPorcentaje = draft.data.estado === 'COMPLETADA' ? 100 : draft.data.porcentaje;
      const res = await fetch(`/api/tareas/${tarea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modo: 'avance',
          estado: draft.data.estado,
          porcentaje_avance: targetPorcentaje,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setErrorMsg(json.message ?? 'Error al guardar avance.');
        return;
      }
      draft.clearDraft();
      setSuccessMsg(
        draft.data.estado === 'COMPLETADA'
          ? 'Tarea completada. Los recordatorios programados pendientes fueron cancelados.'
          : 'Avance actualizado correctamente.'
      );
      onUpdated();
    } catch {
      reportNetworkFailure();
      setErrorMsg(OFFLINE_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  };

  if (tarea.estado === 'CANCELADA') {
    return (
      <p className="text-xs text-slate-500">La tarea está cancelada; no admite cambios de avance.</p>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      {draft.hasRestoredDraft && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs font-medium text-amber-900">
          Se restauró tu borrador local de avance no guardado en servidor.
        </div>
      )}

      {justReconnected && draft.isDirty && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-900 font-medium">
          Conexión restablecida. Revise su avance antes de guardar (no se realizó envío automático).
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Estado de ejecución</label>
          <select
            value={draft.data.estado}
            onChange={(e) => {
              const next = e.target.value as EstadoTarea;
              draft.updateDraft((prev) => ({
                estado: next,
                porcentaje: next === 'COMPLETADA' ? 100 : prev.porcentaje,
              }));
            }}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="ASIGNADA">ASIGNADA</option>
            <option value="EN_PROCESO">EN_PROCESO</option>
            <option value="COMPLETADA">COMPLETADA</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Porcentaje de avance ({draft.data.estado === 'COMPLETADA' ? 100 : draft.data.porcentaje}%)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={draft.data.estado === 'COMPLETADA' ? 100 : draft.data.porcentaje}
            onChange={(e) =>
              draft.updateDraft((prev) => ({
                ...prev,
                porcentaje: Number(e.target.value),
              }))
            }
            className="w-full mt-2"
          />
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-1.5"
        >
          {effectiveOnline ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <WifiOff className="w-4 h-4 shrink-0" />
          )}
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold"
      >
        <Save className="w-3.5 h-3.5" />
        {saving ? 'Guardando...' : 'Guardar Avance'}
      </button>
    </form>
  );
}
