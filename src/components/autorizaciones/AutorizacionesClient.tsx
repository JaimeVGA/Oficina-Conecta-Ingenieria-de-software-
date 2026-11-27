'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckSquare, ShieldAlert } from 'lucide-react';
import { SolicitudEstadoBadge } from '@/components/autorizaciones/SolicitudEstadoBadge';
import { ResolverSolicitudModal } from '@/components/autorizaciones/ResolverSolicitudModal';
import { useSessionGuard } from '@/components/session/SessionInactivityGuard';
import { isNetworkError } from '@/lib/offline/client';
import { formatMexicoCityDateTime } from '@/lib/dates/mexicoCity';
import type { EstadoSolicitud, PerfilUsuario, SolicitudEnriquecida } from '@/lib/supabase/types';

export function AutorizacionesClient({
  actor,
  initialSolicitudes,
}: {
  actor: PerfilUsuario;
  initialSolicitudes: SolicitudEnriquecida[];
}) {
  const { effectiveOnline, reportNetworkFailure } = useSessionGuard();
  const [solicitudes, setSolicitudes] = useState(initialSolicitudes);
  const [filterEstado, setFilterEstado] = useState<'TODAS' | EstadoSolicitud>('TODAS');
  const [resolving, setResolving] = useState<SolicitudEnriquecida | null>(null);

  const filtered = useMemo(() => {
    if (filterEstado === 'TODAS') return solicitudes;
    return solicitudes.filter((s) => s.estado === filterEstado);
  }, [solicitudes, filterEstado]);

  const refresh = async () => {
    if (!effectiveOnline) return;
    try {
      const res = await fetch('/api/solicitudes');
      const json = (await res.json()) as { solicitudes?: SolicitudEnriquecida[] };
      if (json.solicitudes) setSolicitudes(json.solicitudes);
    } catch (err) {
      if (isNetworkError(err)) {
        reportNetworkFailure();
      }
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bandeja de Solicitudes de Autorización</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Solicitudes de prórroga y cambio de alcance. Nadie puede aprobar o rechazar su propia solicitud.
          </p>
        </div>
      </div>

      {/* Tabs de estado */}
      <div className="flex overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 sm:flex-wrap gap-2">
        {(
          [
            'TODAS',
            'PENDIENTE_REVISION',
            'APROBADA',
            'RECHAZADA',
            'INVALIDADA_POR_DESACTUALIZACION',
          ] as const
        ).map((est) => (
          <button
            key={est}
            type="button"
            onClick={() => setFilterEstado(est)}
            className={`whitespace-nowrap shrink-0 min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              filterEstado === est
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {est}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          No hay solicitudes en este estado.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const isOwnRequest = s.solicitante_id === actor.id;
            const canResolve =
              s.estado === 'PENDIENTE_REVISION' && actor.rol === s.rol_resolver && !isOwnRequest;

            return (
              <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm text-brand-700">{s.folio}</span>
                    <SolicitudEstadoBadge estado={s.estado} />
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      {s.tipo}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-semibold">
                      Autoriza: {s.rol_resolver}
                    </span>
                  </div>

                  <div className="w-full sm:w-auto flex flex-wrap items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <Link
                      href={`/tareas/${s.tarea_id}`}
                      className="text-xs font-semibold text-slate-600 hover:underline"
                    >
                      Ver tarea {s.tarea_folio}
                    </Link>

                    {canResolve && (
                      <button
                        type="button"
                        onClick={() => setResolving(s)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
                      >
                        <CheckSquare className="w-3.5 h-3.5" /> Resolver Solicitud
                      </button>
                    )}

                    {s.estado === 'PENDIENTE_REVISION' && isOwnRequest && (actor.rol === 'GS' || actor.rol === 'DN') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-slate-500 text-[11px]">
                        <ShieldAlert className="w-3.5 h-3.5" /> Auto-aprobación no permitida
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm font-semibold text-slate-900">
                  {s.tarea_titulo} ({s.sede_nombre})
                </p>
                <p className="text-xs text-slate-800">{s.cambio_solicitado}</p>

                <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
                  <p>
                    <strong>Solicitante:</strong> {s.solicitante_nombre} ({s.solicitante_rol})
                  </p>
                  <p>
                    <strong>Fecha ref. al solicitar:</strong> {formatMexicoCityDateTime(s.fecha_referencia)} MX
                  </p>
                  <p className="sm:col-span-2">
                    <strong>Motivo original:</strong> {s.motivo_solicitud}
                  </p>
                </div>

                {s.motivo_invalidacion && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-900">
                    <p>
                      <strong>Motivo de invalidación ({s.invalidada_en ? formatMexicoCityDateTime(s.invalidada_en) : ''}):</strong>{' '}
                      {s.motivo_invalidacion}
                    </p>
                  </div>
                )}

                {s.bitacora && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900">
                    <strong>Dictamen en Bitácora:</strong> {s.bitacora.dictamen} por{' '}
                    {s.bitacora.resolutor_nombre_snapshot} el{' '}
                    {formatMexicoCityDateTime(s.bitacora.resuelto_en, true)} MX — Motivo:{' '}
                    {s.bitacora.motivo_resolucion}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {resolving && (
        <ResolverSolicitudModal
          solicitud={resolving}
          onClose={() => setResolving(null)}
          onResolved={refresh}
        />
      )}
    </div>
  );
}
