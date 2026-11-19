'use client';

import React, { useState } from 'react';
import { Clock, FastForward, Sparkles } from 'lucide-react';
import type { RolUsuario } from '@/lib/supabase/types';

export function SimularTiempoPanel({
  actorRol,
  onEvaluated,
}: {
  actorRol: RolUsuario;
  onEvaluated: () => void;
}) {
  const [adelantarHoras, setAdelantarHoras] = useState<number>(25);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const runEvaluation = async (hoursOffset: number) => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/notificaciones/simular-tiempo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adelantar_horas: hoursOffset }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        recordatorios_emitidos?: number;
        recordatorios_cancelados?: number;
        fecha_evaluada?: string;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        setFeedback(json.message ?? 'Error al evaluar recordatorios.');
        return;
      }
      setFeedback(
        `Evaluación completada (+${hoursOffset}h): ${json.recordatorios_emitidos ?? 0} recordatorios emitidos, ${
          json.recordatorios_cancelados ?? 0
        } cancelados. (Sin duplicados al repetir).`
      );
      onEvaluated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-brand-600" />
            Simulador de Paso del Tiempo y Recordatorios (DEC-006 / RN-006)
          </h3>
          <p className="text-xs text-slate-500">
            Evalúa qué recordatorios programados (48h / 24h) ya alcanzaron su ventana temporal sin generar duplicados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={adelantarHoras}
            onChange={(e) => setAdelantarHoras(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white font-medium"
          >
            <option value={0}>Hora actual (0h)</option>
            <option value={25}>Adelantar +25 horas</option>
            <option value={48}>Adelantar +48 horas</option>
            <option value={120}>Adelantar +5 días (+120h)</option>
            <option value={720}>Adelantar +30 días (+720h)</option>
          </select>

          <button
            type="button"
            disabled={busy}
            onClick={() => runEvaluation(adelantarHoras)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-semibold"
          >
            <FastForward className="w-4 h-4" />
            {busy ? 'Evaluando...' : 'Simular paso del tiempo / Evaluar recordatorios (48h/24h)'}
          </button>
        </div>
      </div>

      {actorRol === 'GS' && (
        <p className="text-[11px] text-slate-500 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Tip CP-005: Cree tareas en su sede con vencimiento a +72h, +48h, +36h, +24h y +12h para comprobar los 5
          umbrales en esta bandeja.
        </p>
      )}

      {feedback && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-900 font-medium">
          {feedback}
        </div>
      )}
    </div>
  );
}
