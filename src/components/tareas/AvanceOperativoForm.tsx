'use client';

import React, { useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import type { EstadoTarea, TareaEnriquecida } from '@/lib/supabase/types';

export function AvanceOperativoForm({
  tarea,
  onUpdated,
}: {
  tarea: TareaEnriquecida;
  onUpdated: () => void;
}) {
  const [estado, setEstado] = useState<EstadoTarea>(tarea.estado);
  const [porcentaje, setPorcentaje] = useState<number>(tarea.porcentaje_avance);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/tareas/${tarea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modo: 'avance',
          estado,
          porcentaje_avance: estado === 'COMPLETADA' ? 100 : porcentaje,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setMsg(json.message ?? 'Error al guardar avance.');
        return;
      }
      setMsg(
        estado === 'COMPLETADA'
          ? 'Tarea completada. Los recordatorios programados pendientes fueron cancelados.'
          : 'Avance actualizado correctamente.'
      );
      onUpdated();
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
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Estado de ejecución</label>
          <select
            value={estado}
            onChange={(e) => {
              const next = e.target.value as EstadoTarea;
              setEstado(next);
              if (next === 'COMPLETADA') setPorcentaje(100);
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
            Porcentaje de avance ({porcentaje}%)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={estado === 'COMPLETADA' ? 100 : porcentaje}
            onChange={(e) => setPorcentaje(Number(e.target.value))}
            className="w-full mt-2"
          />
        </div>
      </div>

      {msg && (
        <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
      >
        <Save className="w-3.5 h-3.5" />
        {saving ? 'Guardando...' : 'Guardar Avance'}
      </button>
    </form>
  );
}
