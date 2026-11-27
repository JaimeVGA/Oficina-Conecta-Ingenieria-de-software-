'use client';

import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, Send, WifiOff, X } from 'lucide-react';
import { useIdempotentDraft } from '@/hooks/useIdempotentDraft';
import { useSessionGuard } from '@/components/session/SessionInactivityGuard';
import { OFFLINE_ERROR_MESSAGE } from '@/lib/offline/client';
import {
  diffNaturalDaysMX,
  formatMexicoCityDateTime,
  mexicoCityLocalToIso,
  toMexicoCityDate,
  toMexicoCityInputValue,
} from '@/lib/dates/mexicoCity';
import type { RolUsuario, TareaEnriquecida, TipoSolicitud } from '@/lib/supabase/types';

interface DraftFields {
  tipo: TipoSolicitud;
  fechaPropuestaLocal: string;
  alcancePropuesto: string;
  motivo: string;
}

export function SolicitudFormModal({
  tarea,
  actorRol,
  onClose,
  onSuccess,
}: {
  tarea: TareaEnriquecida;
  actorRol: RolUsuario;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { effectiveOnline, justReconnected, reportNetworkFailure } = useSessionGuard();

  const defaultDuePlus4Days = useMemo(() => {
    const plus4 = new Date(Date.parse(tarea.fecha_limite) + 4 * 86_400_000);
    return toMexicoCityInputValue(plus4);
  }, [tarea.fecha_limite]);

  const draft = useIdempotentDraft<DraftFields>(`oc_draft_solicitud_${tarea.id}`, {
    tipo: 'PRORROGA_FECHA',
    fechaPropuestaLocal: defaultDuePlus4Days,
    alcancePropuesto: tarea.alcance,
    motivo: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failedAfterNetworkCut, setFailedAfterNetworkCut] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    folio: string;
    rol_resolver: string;
  } | null>(null);

  const previewRouting = useMemo(() => {
    if (draft.data.tipo === 'CAMBIO_ALCANCE') {
      return { rol: 'DN', reason: 'Todo cambio de alcance lo resuelve Dirección Nacional.' };
    }
    try {
      const propIso = mexicoCityLocalToIso(draft.data.fechaPropuestaLocal);
      const dias = diffNaturalDaysMX(tarea.fecha_limite, propIso);
      const propMxDate = toMexicoCityDate(propIso);
      if (actorRol === 'GS') {
        return { rol: 'DN', reason: 'Solicitud emitida por Gerencia de Sede escala a Dirección Nacional.' };
      }
      if (dias > 5) {
        return { rol: 'DN', reason: `Prórroga de +${dias} días (> 5 días naturales) escala a Dirección Nacional.` };
      }
      if (propMxDate > tarea.proyecto_fecha_fin) {
        return {
          rol: 'DN',
          reason: `Supera fin de proyecto (${tarea.proyecto_fecha_fin}); escala a Dirección Nacional.`,
        };
      }
      return {
        rol: 'GS',
        reason: `Prórroga de +${dias} días (≤ 5 días naturales y dentro del proyecto); resuelve Gerencia de Sede.`,
      };
    } catch {
      return { rol: 'GS', reason: 'Seleccione una fecha válida.' };
    }
  }, [draft.data.tipo, draft.data.fechaPropuestaLocal, tarea.fecha_limite, tarea.proyecto_fecha_fin, actorRol]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!effectiveOnline) {
      setFailedAfterNetworkCut(true);
      setErrorMsg(OFFLINE_ERROR_MESSAGE);
      return;
    }

    if (draft.data.motivo.trim().length === 0) {
      setErrorMsg('El motivo de la solicitud es obligatorio.');
      return;
    }

    setSubmitting(true);
    try {
      const payload =
        draft.data.tipo === 'PRORROGA_FECHA'
          ? {
              tarea_id: tarea.id,
              tipo: 'PRORROGA_FECHA',
              fecha_propuesta: mexicoCityLocalToIso(draft.data.fechaPropuestaLocal),
              motivo_solicitud: draft.data.motivo,
              idempotency_key: draft.idempotencyKey,
            }
          : {
              tarea_id: tarea.id,
              tipo: 'CAMBIO_ALCANCE',
              alcance_propuesto: draft.data.alcancePropuesto,
              motivo_solicitud: draft.data.motivo,
              idempotency_key: draft.idempotencyKey,
            };

      const res = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        folio?: string;
        rol_resolver?: string;
        message?: string;
      };

      if (!res.ok || !json.ok) {
        setErrorMsg(json.message ?? 'Error al registrar la solicitud.');
        return;
      }

      draft.clearDraft();
      setSuccessInfo({
        folio: json.folio ?? '',
        rol_resolver: json.rol_resolver ?? 'GS',
      });
      onSuccess();
    } catch {
      reportNetworkFailure();
      setFailedAfterNetworkCut(true);
      setErrorMsg(
        `${OFFLINE_ERROR_MESSAGE} Puedes reintentar cuando recuperes la conexión.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-xl max-h-[92dvh] sm:max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl shadow-2xl p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Solicitar Autorización — {tarea.folio}</h3>
            <p className="text-xs text-slate-500 mt-0.5 break-words">{tarea.titulo}</p>
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

        {!successInfo && draft.hasRestoredDraft && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs font-medium text-amber-900">
            Se restauró tu borrador guardado localmente.
          </div>
        )}

        {justReconnected && !successInfo && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-900 font-medium">
            Conexión restablecida. Revise su información antes de enviar (no se realizó envío automático).
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2"
          >
            {effectiveOnline ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{errorMsg}</span>
          </div>
        )}

        {successInfo ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2 text-sm text-emerald-900">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Solicitud {successInfo.folio} registrada
            </div>
            <p className="text-xs">
              Estado: <code>PENDIENTE_REVISION</code> · Asignada para resolución a:{' '}
              <strong>{successInfo.rol_resolver === 'GS' ? 'Gerencia de Sede' : 'Dirección Nacional'}</strong>.
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 space-y-1">
              <p>
                <strong>Fecha límite de referencia vigente:</strong> {formatMexicoCityDateTime(tarea.fecha_limite)}{' '}
                (America/Mexico_City)
              </p>
              <p>
                <strong>Fecha fin del proyecto:</strong> {tarea.proyecto_fecha_fin}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de solicitud</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(['PRORROGA_FECHA', 'CAMBIO_ALCANCE'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => draft.updateDraft((prev) => ({ ...prev, tipo: t }))}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold ${
                      draft.data.tipo === t
                        ? 'bg-brand-50 border-brand-600 text-brand-900'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {t === 'PRORROGA_FECHA' ? 'Prórroga de Fecha Límite' : 'Cambio de Alcance'}
                  </button>
                ))}
              </div>
            </div>

            {draft.data.tipo === 'PRORROGA_FECHA' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nueva fecha límite propuesta (America/Mexico_City)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={draft.data.fechaPropuestaLocal}
                  onChange={(e) =>
                    draft.updateDraft((prev) => ({ ...prev, fechaPropuestaLocal: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nuevo alcance propuesto</label>
                <textarea
                  rows={3}
                  required
                  value={draft.data.alcancePropuesto}
                  onChange={(e) =>
                    draft.updateDraft((prev) => ({ ...prev, alcancePropuesto: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            )}

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-xs text-indigo-900">
              <strong>Flujo de aprobación:</strong> {previewRouting.reason}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo / Justificación</label>
              <textarea
                rows={3}
                value={draft.data.motivo}
                onChange={(e) => draft.updateDraft((prev) => ({ ...prev, motivo: e.target.value }))}
                placeholder="Explique la razón de la solicitud (ej. Corte programado de CFE en zona industrial)..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto justify-center min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto justify-center min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-semibold"
              >
                {failedAfterNetworkCut ? <RefreshCw className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Enviando...' : failedAfterNetworkCut ? 'Reintentar envío' : 'Enviar Solicitud'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
