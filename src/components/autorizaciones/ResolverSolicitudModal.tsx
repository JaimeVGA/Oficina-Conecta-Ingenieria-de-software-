'use client';

import React, { useState } from 'react';
import { CheckCircle2, ShieldAlert, X, XCircle } from 'lucide-react';
import { useIdempotentDraft } from '@/hooks/useIdempotentDraft';
import { formatMexicoCityDateTime } from '@/lib/dates/mexicoCity';
import type { Dictamen, SolicitudEnriquecida } from '@/lib/supabase/types';

export function ResolverSolicitudModal({
  solicitud,
  onClose,
  onResolved,
}: {
  solicitud: SolicitudEnriquecida;
  onClose: () => void;
  onResolved: () => void;
}) {
  const draft = useIdempotentDraft<{ dictamen: Dictamen; motivo: string }>(
    `oc_draft_resolver_${solicitud.id}`,
    {
      dictamen: 'APROBADA',
      motivo: '',
    }
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorPayload, setErrorPayload] = useState<{
    message: string;
    motivo_original?: string;
    motivo_invalidacion?: string;
  } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorPayload(null);

    if (draft.data.motivo.trim().length === 0) {
      setErrorPayload({
        message: 'El motivo de la resolución es obligatorio.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/solicitudes/${solicitud.id}/resolver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dictamen: draft.data.dictamen,
          motivo_resolucion: draft.data.motivo,
          idempotency_key: draft.idempotencyKey,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        dictamen?: string;
        valor_anterior?: string;
        valor_nuevo?: string;
        motivo_original?: string;
        motivo_invalidacion?: string;
      };

      if (!res.ok || !json.ok) {
        setErrorPayload({
          message: json.message ?? 'No fue posible resolver la solicitud.',
          motivo_original: json.motivo_original,
          motivo_invalidacion: json.motivo_invalidacion,
        });
        onResolved();
        return;
      }

      draft.clearDraft();
      setSuccessMsg(
        `Dictamen ${json.dictamen} registrado correctamente. Cambio aplicado: ${json.valor_anterior} -> ${json.valor_nuevo}.`
      );
      onResolved();
    } catch {
      setErrorPayload({
        message: 'Error de conexión al intentar resolver. Por favor intenta nuevamente.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-xl max-h-[92dvh] sm:max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl shadow-2xl p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Resolver Solicitud {solicitud.folio} ({solicitud.rol_resolver})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 break-words">
              {solicitud.tarea_folio} — {solicitud.tarea_titulo} · Solicitante: {solicitud.solicitante_nombre}
            </p>
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

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5 text-slate-700">
          <p className="break-words">
            <strong>Cambio solicitado:</strong> {solicitud.cambio_solicitado}
          </p>
          <p className="break-words">
            <strong>Motivo original del solicitante:</strong> {solicitud.motivo_solicitud}
          </p>
          <p>
            <strong>Fecha límite de referencia:</strong> {formatMexicoCityDateTime(solicitud.fecha_referencia)}
          </p>
        </div>

        {errorPayload && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 rounded-lg p-3.5 text-xs text-red-900 space-y-1.5"
          >
            <div className="flex items-center gap-2 font-bold">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorPayload.message}</span>
            </div>
            {errorPayload.motivo_original && (
              <p>
                <strong>Motivo original conservado:</strong> {errorPayload.motivo_original}
              </p>
            )}
            {errorPayload.motivo_invalidacion && (
              <p>
                <strong>Motivo de invalidación:</strong> {errorPayload.motivo_invalidacion}
              </p>
            )}
          </div>
        )}

        {successMsg ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3 text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Resolución Registrada
            </div>
            <p>{successMsg}</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResolve} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => draft.updateDraft((p) => ({ ...p, dictamen: 'APROBADA' }))}
                className={`min-h-[42px] py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                  draft.data.dictamen === 'APROBADA'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                    : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" /> Aprobar Solicitud
              </button>
              <button
                type="button"
                onClick={() => draft.updateDraft((p) => ({ ...p, dictamen: 'RECHAZADA' }))}
                className={`min-h-[42px] py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                  draft.data.dictamen === 'RECHAZADA'
                    ? 'bg-rose-50 border-rose-600 text-rose-900'
                    : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                <XCircle className="w-4 h-4" /> Rechazar Solicitud
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo del dictamen</label>
              <textarea
                rows={3}
                value={draft.data.motivo}
                onChange={(e) => draft.updateDraft((p) => ({ ...p, motivo: e.target.value }))}
                placeholder="Ej. Verificado aviso oficial de CFE, se autoriza ajuste..."
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
                className="w-full sm:w-auto justify-center min-h-[42px] px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-semibold"
              >
                {submitting ? 'Procesando...' : `Confirmar ${draft.data.dictamen}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
