'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarCog, FileCheck2, ShieldAlert } from 'lucide-react';
import { AvanceOperativoForm } from '@/components/tareas/AvanceOperativoForm';
import { EditarTareaGerenciaModal } from '@/components/tareas/EditarTareaGerenciaModal';
import { ExportIcsButton } from '@/components/tareas/ExportIcsButton';
import { SolicitudFormModal } from '@/components/autorizaciones/SolicitudFormModal';
import { SolicitudEstadoBadge } from '@/components/autorizaciones/SolicitudEstadoBadge';
import { ResolverSolicitudModal } from '@/components/autorizaciones/ResolverSolicitudModal';
import { DocumentosTareaPanel } from '@/components/documentos/DocumentosTareaPanel';
import { useSessionGuard } from '@/components/session/SessionInactivityGuard';
import { isNetworkError } from '@/lib/offline/client';
import { formatMexicoCityDateTime } from '@/lib/dates/mexicoCity';
import type {
  BitacoraEnriquecida,
  DocumentoConVersiones,
  PerfilUsuario,
  SolicitudEnriquecida,
  TareaEnriquecida,
} from '@/lib/supabase/types';

export function TareaDetalleClient({
  actor,
  initialTarea,
  initialSolicitudes,
  initialBitacora,
  initialDocumentos,
}: {
  actor: PerfilUsuario;
  initialTarea: TareaEnriquecida;
  initialSolicitudes: SolicitudEnriquecida[];
  initialBitacora: BitacoraEnriquecida[];
  initialDocumentos: DocumentoConVersiones[];
}) {
  const { effectiveOnline, reportNetworkFailure } = useSessionGuard();
  const [tarea, setTarea] = useState(initialTarea);
  const [solicitudes, setSolicitudes] = useState(initialSolicitudes);
  const [bitacora, setBitacora] = useState(initialBitacora);
  const [documentos, setDocumentos] = useState(initialDocumentos);

  const [showSolicitudModal, setShowSolicitudModal] = useState(false);
  const [showEditarGsModal, setShowEditarGsModal] = useState(false);
  const [resolvingSolicitud, setResolvingSolicitud] = useState<SolicitudEnriquecida | null>(null);

  const refreshAll = async () => {
    if (!effectiveOnline) return;
    try {
      const [tRes, sRes, bRes, dRes] = await Promise.all([
        fetch(`/api/tareas/${tarea.id}`),
        fetch('/api/solicitudes'),
        fetch(`/api/bitacora?tarea_id=${tarea.id}`),
        fetch(`/api/tareas/${tarea.id}/documentos`),
      ]);

      const tJson = (await tRes.json()) as { tarea?: TareaEnriquecida };
      if (tJson.tarea) setTarea(tJson.tarea);

      const sJson = (await sRes.json()) as { solicitudes?: SolicitudEnriquecida[] };
      if (sJson.solicitudes) {
        setSolicitudes(sJson.solicitudes.filter((s) => s.tarea_id === tarea.id));
      }

      const bJson = (await bRes.json()) as { registros?: BitacoraEnriquecida[] };
      if (bJson.registros) setBitacora(bJson.registros);

      const dJson = (await dRes.json()) as { documentos?: DocumentoConVersiones[] };
      if (dJson.documentos) setDocumentos(dJson.documentos);
    } catch (err) {
      if (isNetworkError(err)) {
        reportNetworkFailure();
      }
    }
  };

  const canRequestAuth =
    (actor.rol === 'OP' || actor.rol === 'GS') &&
    tarea.estado !== 'COMPLETADA' &&
    tarea.estado !== 'CANCELADA';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/tareas" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> Volver a tareas
        </Link>

        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
          <ExportIcsButton tareaId={tarea.id} label="Exportar calendario (.ics)" />
          {actor.rol === 'GS' && (
            <button
              type="button"
              onClick={() => setShowEditarGsModal(true)}
              className="flex-1 sm:flex-initial justify-center min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800"
            >
              <CalendarCog className="w-4 h-4 text-brand-600" /> Administrar Tarea
            </button>
          )}
          {canRequestAuth && (
            <button
              type="button"
              onClick={() => setShowSolicitudModal(true)}
              className="w-full sm:w-auto justify-center min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
            >
              <FileCheck2 className="w-4 h-4" /> Solicitar Prórroga / Cambio de Alcance
            </button>
          )}
        </div>
      </div>

      {/* Ficha de la tarea */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-brand-50 text-brand-800 border border-brand-200">
                {tarea.folio}
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {tarea.estado} ({tarea.porcentaje_avance}%)
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2 break-words">{tarea.titulo}</h1>
            <p className="text-sm text-slate-600 mt-1 break-words">{tarea.alcance}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="text-slate-500">Sede y Departamento</p>
            <p className="font-semibold text-slate-900">
              {tarea.sede_nombre} · {tarea.departamento_nombre}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Proyecto (Fin: {tarea.proyecto_fecha_fin})</p>
            <p className="font-semibold text-slate-900">{tarea.proyecto_nombre}</p>
          </div>
          <div>
            <p className="text-slate-500">Responsable</p>
            <p className="font-semibold text-slate-900">{tarea.responsable_nombre}</p>
          </div>
          <div>
            <p className="text-slate-500">Fecha Límite Vigente (America/Mexico_City)</p>
            <p className="font-mono font-bold text-slate-900">{formatMexicoCityDateTime(tarea.fecha_limite)}</p>
          </div>
        </div>

        {actor.rol === 'OP' && (
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Registrar Avance Operativo
            </h3>
            <AvanceOperativoForm tarea={tarea} onUpdated={refreshAll} />
          </div>
        )}
      </div>

      {/* Documentos con Versionado Consecutivo */}
      <DocumentosTareaPanel
        tareaId={tarea.id}
        actorRol={actor.rol}
        documentos={documentos}
        onChanged={refreshAll}
      />

      {/* Solicitudes de Autorización de la Tarea */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Solicitudes de Autorización ({solicitudes.length})
        </h3>
        {solicitudes.length === 0 ? (
          <p className="text-xs text-slate-500">Aún no existen solicitudes para esta tarea.</p>
        ) : (
          <div className="space-y-2.5">
            {solicitudes.map((s) => {
              const canResolve =
                s.estado === 'PENDIENTE_REVISION' &&
                actor.rol === s.rol_resolver &&
                actor.id !== s.solicitante_id;
              return (
                <div key={s.id} className="border border-slate-200 rounded-lg p-3.5 text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{s.folio}</span>
                      <SolicitudEstadoBadge estado={s.estado} />
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        Resolutor: {s.rol_resolver}
                      </span>
                    </div>
                    {canResolve && (
                      <button
                        type="button"
                        onClick={() => setResolvingSolicitud(s)}
                        className="px-3 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold"
                      >
                        Resolver
                      </button>
                    )}
                  </div>
                  <p className="font-semibold text-slate-800">{s.cambio_solicitado}</p>
                  <p className="text-slate-600">
                    <strong>Motivo original:</strong> {s.motivo_solicitud}
                  </p>
                  {s.motivo_invalidacion && (
                    <p className="text-rose-700 bg-rose-50 border border-rose-200 rounded px-2.5 py-1.5">
                      <strong>Motivo de invalidación:</strong> {s.motivo_invalidacion}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de Autorizaciones de la Tarea */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-emerald-600" />
          Historial de Autorizaciones de la Tarea ({bitacora.length})
        </h3>
        {bitacora.length === 0 ? (
          <p className="text-xs text-slate-500">Sin resoluciones registradas en bitácora.</p>
        ) : (
          <div className="space-y-2">
            {bitacora.map((b) => (
              <div key={b.id} className="border border-slate-200 rounded-lg p-3 text-xs space-y-1 bg-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">
                    {b.solicitud_folio} · {b.dictamen} por {b.resolutor_nombre_snapshot} ({b.resolutor_rol_snapshot})
                  </span>
                  <span className="font-mono text-slate-500">{formatMexicoCityDateTime(b.resuelto_en, true)} MX</span>
                </div>
                <p className="text-slate-700 break-words">
                  <strong>Motivo:</strong> {b.motivo_resolucion}
                </p>
                <p className="font-mono text-[11px] text-slate-600 break-words">
                  {b.valor_anterior} → {b.valor_nuevo}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showSolicitudModal && (
        <SolicitudFormModal
          tarea={tarea}
          actorRol={actor.rol}
          onClose={() => setShowSolicitudModal(false)}
          onSuccess={refreshAll}
        />
      )}

      {showEditarGsModal && (
        <EditarTareaGerenciaModal
          tarea={tarea}
          onClose={() => setShowEditarGsModal(false)}
          onUpdated={refreshAll}
        />
      )}

      {resolvingSolicitud && (
        <ResolverSolicitudModal
          solicitud={resolvingSolicitud}
          onClose={() => setResolvingSolicitud(null)}
          onResolved={refreshAll}
        />
      )}
    </div>
  );
}
