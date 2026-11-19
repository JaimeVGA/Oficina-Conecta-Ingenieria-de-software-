'use client';

import React, { useState } from 'react';
import { AlertCircle, CalendarCog, X } from 'lucide-react';
import { mexicoCityLocalToIso, toMexicoCityInputValue } from '@/lib/dates/mexicoCity';
import type { EstadoTarea, TareaEnriquecida } from '@/lib/supabase/types';

export function EditarTareaGerenciaModal({
  tarea,
  onClose,
  onUpdated,
}: {
  tarea: TareaEnriquecida;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const demoTools = process.env.NEXT_PUBLIC_ENABLE_DEMO_TOOLS !== 'false';
  const [titulo, setTitulo] = useState(tarea.titulo);
  const [fechaLocal, setFechaLocal] = useState(toMexicoCityInputValue(tarea.fecha_limite));
  const [estado, setEstado] = useState<EstadoTarea>(tarea.estado);
  const [motivoCambio, setMotivoCambio] = useState('');
  const [diferirCp004, setDiferirCp004] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/tareas/${tarea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modo: 'gerencia',
          titulo,
          fecha_limite: mexicoCityLocalToIso(fechaLocal),
          estado,
          motivo_cambio: motivoCambio,
          diferir_invalidacion_cp004: diferirCp004,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setErrorMsg(json.message ?? 'No fue posible actualizar la tarea.');
        return;
      }
      onUpdated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-start justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Administrar Tarea — {tarea.folio}</h3>
            <p className="text-xs text-slate-500">
              Cambiar fecha límite incrementa <code>sequence_ics</code> e invalida solicitudes pendientes.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Título</label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha límite (America/Mexico_City)
              </label>
              <input
                type="datetime-local"
                required
                value={fechaLocal}
                onChange={(e) => setFechaLocal(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoTarea)}
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
              value={motivoCambio}
              onChange={(e) => setMotivoCambio(e.target.value)}
              placeholder="Ej. Reprogramación administrativa de sede"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          {demoTools && (
            <label className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <input
                type="checkbox"
                checked={diferirCp004}
                onChange={(e) => setDiferirCp004(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <strong>Modo prueba CP-004:</strong> Diferir invalidación automática hasta que el autorizador haga clic
                en &quot;Aprobar/Rechazar&quot; en su pantalla ya abierta.
              </span>
            </label>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
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
