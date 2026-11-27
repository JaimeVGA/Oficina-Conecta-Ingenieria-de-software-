'use client';

import React, { useState } from 'react';
import { CalendarPlus, Info } from 'lucide-react';
import type { SedeId } from '@/lib/supabase/types';

export function ExportIcsButton({
  tareaId,
  proyectoId,
  sedeId,
  label = 'Exportar Calendario (.ics)',
  compact = false,
}: {
  tareaId?: string;
  proyectoId?: string;
  sedeId?: SedeId;
  label?: string;
  compact?: boolean;
}) {
  const [showHint, setShowHint] = useState(false);

  const params = new URLSearchParams();
  if (tareaId) params.set('tarea_id', tareaId);
  if (proyectoId) params.set('proyecto_id', proyectoId);
  if (sedeId) params.set('sede_id', sedeId);
  const href = `/api/calendario/export${params.toString() ? `?${params.toString()}` : ''}`;

  return (
    <div className="inline-flex items-center gap-1.5 relative">
      <a
        href={href}
        download
        className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'
        }`}
      >
        <CalendarPlus className="w-4 h-4 text-brand-600" />
        <span>{label}</span>
      </a>
      <button
        type="button"
        onClick={() => setShowHint((v) => !v)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        title="Instrucciones de actualización en Google Calendar y Thunderbird"
      >
        <Info className="w-4 h-4" />
      </button>

      {showHint && (
        <div className="fixed inset-x-4 bottom-24 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 z-40 bg-slate-900 text-slate-100 text-xs rounded-xl p-3.5 shadow-xl space-y-1.5">
          <p className="font-bold text-white">Sincronización de calendario (.ics)</p>
          <p className="text-slate-300">
            Al exportar nuevamente tras actualizar la fecha de una tarea e importar el archivo{' '}
            <strong>sobre el mismo calendario</strong> en Google Calendar o Mozilla Thunderbird, las fechas se
            actualizarán automáticamente sin duplicar eventos.
          </p>
        </div>
      )}
    </div>
  );
}
