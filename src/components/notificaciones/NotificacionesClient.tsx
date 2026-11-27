'use client';

import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { BandejaSimuladaTable } from '@/components/notificaciones/BandejaSimuladaTable';
import type { CorreoSimulado, EstadoAviso, MotivoAviso } from '@/lib/supabase/types';

export function NotificacionesClient({
  initialCorreos,
}: {
  initialCorreos: CorreoSimulado[];
}) {
  const [correos, setCorreos] = useState(initialCorreos);
  const [motivoFilter, setMotivoFilter] = useState<'TODOS' | MotivoAviso>('TODOS');
  const [estadoFilter, setEstadoFilter] = useState<'TODOS' | EstadoAviso>('TODOS');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    return correos.filter((c) => {
      if (motivoFilter !== 'TODOS' && c.motivo_aviso !== motivoFilter) return false;
      if (estadoFilter !== 'TODOS' && c.estado !== estadoFilter) return false;
      return true;
    });
  }, [correos, motivoFilter, estadoFilter]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/notificaciones/simular-tiempo', { method: 'POST' }).catch(() => null);
      const res = await fetch('/api/notificaciones');
      const json = (await res.json()) as { correos?: CorreoSimulado[] };
      if (json.correos) setCorreos(json.correos);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Centro de Notificaciones</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Avisos automáticos de asignación, solicitudes, resoluciones y recordatorios de vencimiento.
          </p>
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={refresh}
          className="w-full sm:w-auto justify-center min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl p-3">
        <select
          value={motivoFilter}
          onChange={(e) => setMotivoFilter(e.target.value as 'TODOS' | MotivoAviso)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
        >
          <option value="TODOS">Todos los motivos</option>
          <option value="ASIGNACION">Asignación</option>
          <option value="SOLICITUD">Solicitud</option>
          <option value="RESOLUCION">Resolución</option>
          <option value="RECORDATORIO_48H">Recordatorio 48h</option>
          <option value="RECORDATORIO_24H">Recordatorio 24h</option>
        </select>

        <select
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value as 'TODOS' | EstadoAviso)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
        >
          <option value="TODOS">Todos los estados</option>
          <option value="EMITIDO">Enviado</option>
          <option value="PROGRAMADO">Programado</option>
          <option value="CANCELADO">Cancelado</option>
        </select>

        <span className="text-xs text-slate-500 ml-auto">
          Mostrando {filtered.length} de {correos.length} registros
        </span>
      </div>

      <BandejaSimuladaTable correos={filtered} />
    </div>
  );
}
