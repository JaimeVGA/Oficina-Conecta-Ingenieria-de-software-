'use client';

import React, { useMemo, useState } from 'react';
import { BandejaSimuladaTable } from '@/components/notificaciones/BandejaSimuladaTable';
import { SimularTiempoPanel } from '@/components/notificaciones/SimularTiempoPanel';
import type { CorreoSimulado, EstadoAviso, MotivoAviso, RolUsuario } from '@/lib/supabase/types';

export function NotificacionesClient({
  actorRol,
  initialCorreos,
}: {
  actorRol: RolUsuario;
  initialCorreos: CorreoSimulado[];
}) {
  const [correos, setCorreos] = useState(initialCorreos);
  const [motivoFilter, setMotivoFilter] = useState<'TODOS' | MotivoAviso>('TODOS');
  const [estadoFilter, setEstadoFilter] = useState<'TODOS' | EstadoAviso>('TODOS');

  const filtered = useMemo(() => {
    return correos.filter((c) => {
      if (motivoFilter !== 'TODOS' && c.motivo_aviso !== motivoFilter) return false;
      if (estadoFilter !== 'TODOS' && c.estado !== estadoFilter) return false;
      return true;
    });
  }, [correos, motivoFilter, estadoFilter]);

  const refresh = async () => {
    const res = await fetch('/api/notificaciones');
    const json = (await res.json()) as { correos?: CorreoSimulado[] };
    if (json.correos) setCorreos(json.correos);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Bandeja de Notificaciones Simuladas (INT-003)</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Todos los avisos mostrados son <strong>SIMULADOS</strong> (no se envían correos reales ni se conectan APIs de
          Google/Microsoft). Clave de evento única impide duplicados al recargar.
        </p>
      </div>

      <SimularTiempoPanel actorRol={actorRol} onEvaluated={refresh} />

      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl p-3">
        <select
          value={motivoFilter}
          onChange={(e) => setMotivoFilter(e.target.value as 'TODOS' | MotivoAviso)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
        >
          <option value="TODOS">Todos los motivos</option>
          <option value="ASIGNACION">ASIGNACION</option>
          <option value="SOLICITUD">SOLICITUD</option>
          <option value="RESOLUCION">RESOLUCION</option>
          <option value="RECORDATORIO_48H">RECORDATORIO_48H</option>
          <option value="RECORDATORIO_24H">RECORDATORIO_24H</option>
        </select>

        <select
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value as 'TODOS' | EstadoAviso)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
        >
          <option value="TODOS">Todos los estados</option>
          <option value="EMITIDO">EMITIDO</option>
          <option value="PROGRAMADO">PROGRAMADO</option>
          <option value="CANCELADO">CANCELADO</option>
        </select>

        <span className="text-xs text-slate-500 ml-auto">
          Mostrando {filtered.length} de {correos.length} registros
        </span>
      </div>

      <BandejaSimuladaTable correos={filtered} />
    </div>
  );
}
