'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, X, XCircle } from 'lucide-react';
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
  const demoTools = process.env.NEXT_PUBLIC_ENABLE_DEMO_TOOLS !== 'false';
  const draft = useIdempotentDraft<{ dictamen: Dictamen; motivo: string }>(
    `oc_draft_resolver_${solicitud.id}`,
    {
      dictamen: 'APROBADA',
      motivo: '',
    }
  );

  const [simularFalloBitacora, setSimularFalloBitacora] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorPayload, setErrorPayload] = useState<{
    error_code?: string;
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
        error_code: 'ERR-002',
        message: 'ERR-002: El motivo de la resolución es obligatorio (no puede estar vacío).',
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
          simular_fallo_bitacora: simularFalloBitacora,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error_code?: string;
        message?: string;
        dictamen?: string;
        valor_anterior?: string;
        valor_nuevo?: string;
        motivo_original?: string;
        motivo_invalidacion?: string;
      };

      if (!res.ok || !json.ok) {
        setErrorPayload({
          error_code: json.error_code,
          message: json.message ?? 'No fue posible resolver la solicitud.',
          motivo_original: json.motivo_original,
          motivo_invalidacion: json.motivo_invalidacion,
        });
        onResolved(); // Refrescar por si pasó a INVALIDADA o fue resuelta por otro usuario
        return;
      }

      draft.clearDraft();
      setSuccessMsg(
        `Dictamen ${json.dictamen} confirmado atómicamente en tarea y bitácora. Cambio: ${json.valor_anterior} -> ${json.valor_nuevo}.`
      );
      onResolved();
    } catch {
      setErrorPayload({
        error_code: 'ERR-005',
        message: 'Error de conexión al intentar resolver. Sus datos locales permanecen con el mismo UUID.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Resolver Solicitud {solicitud.folio} ({solicitud.rol_resolver})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {solicitud.tarea_folio} — {solicitud.tarea_titulo} · Solicitante: {solicitud.solicitante_nombre}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5 text-slate-700">
          <p>
            <strong>Cambio solicitado:</strong> {solicitud.cambio_solicitado}
          </p>
          <p>
            <strong>Motivo original del solicitante:</strong> {solicitud.motivo_solicitud}
          </p>
          <p>
            <strong>Fecha límite de referencia:</strong> {formatMexicoCityDateTime(solicitud.fecha_referencia)}
          </p>
        </div>

        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-[11px] text-amber-900">
          <span className="font-semibold">{draft.draftLabel}</span>
          <span className="font-mono">UUID: {draft.idempotencyKey}</span>
        </div>

        {errorPayload && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 rounded-lg p-3.5 text-xs text-red-900 space-y-1.5"
          >
            <div className="flex items-center gap-2 font-bold">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>
                {errorPayload.error_code ? `[${errorPayload.error_code}] ` : ''}
                {errorPayload.message}
              </span>
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
              Resolución Atómica Completada
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
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => draft.updateDraft((p) => ({ ...p, dictamen: 'APROBADA' }))}
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
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
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                  draft.data.dictamen === 'RECHAZADA'
                    ? 'bg-rose-50 border-rose-600 text-rose-900'
                    : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                <XCircle className="w-4 h-4" /> Rechazar Solicitud
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo del dictamen (obligatorio, sin mínimo artificial — RN-002)
              </label>
              <textarea
                rows={3}
                value={draft.data.motivo}
                onChange={(e) => draft.updateDraft((p) => ({ ...p, motivo: e.target.value }))}
                placeholder="Ej. Verificado aviso oficial de CFE, se autoriza ajuste..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            {demoTools && (
              <label className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simularFalloBitacora}
                  onChange={(e) => setSimularFalloBitacora(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <strong className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    Simular fallo en bitácora (Demostración CP-002)
                  </strong>
                  Fuerza una excepción al insertar en <code>bitacora_autorizaciones</code> para comprobar el{' '}
                  <strong>ROLLBACK total</strong> de la tarea y la solicitud.
                </span>
              </label>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-semibold"
              >
                {submitting ? 'Procesando transacción...' : `Confirmar ${draft.data.dictamen}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
