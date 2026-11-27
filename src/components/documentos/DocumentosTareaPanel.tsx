'use client';

import React, { useState } from 'react';
import { Award, Download, FileText, FileUp, Lock, WifiOff } from 'lucide-react';
import { SubirVersionModal } from '@/components/documentos/SubirVersionModal';
import { useSessionGuard } from '@/components/session/SessionInactivityGuard';
import { OFFLINE_ERROR_MESSAGE } from '@/lib/offline/client';
import { formatMexicoCityDateTime } from '@/lib/dates/mexicoCity';
import type { DocumentoConVersiones, RolUsuario } from '@/lib/supabase/types';

export function DocumentosTareaPanel({
  tareaId,
  actorRol,
  documentos,
  onChanged,
}: {
  tareaId: string;
  actorRol: RolUsuario;
  documentos: DocumentoConVersiones[];
  onChanged: () => void;
}) {
  const { effectiveOnline, reportNetworkFailure } = useSessionGuard();
  const [uploadDocName, setUploadDocName] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyVersionId, setBusyVersionId] = useState<string | null>(null);

  const canUpload = actorRol === 'OP' || actorRol === 'GS';
  const canDesignateOfficial = actorRol === 'GS';

  const handleSetVigente = async (versionId: string) => {
    setActionError(null);
    if (!effectiveOnline) {
      setActionError(OFFLINE_ERROR_MESSAGE);
      return;
    }
    setBusyVersionId(versionId);
    try {
      const res = await fetch(`/api/documentos/versiones/${versionId}/vigente`, { method: 'POST' });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setActionError(json.message ?? 'No autorizado para designar vigencia.');
        return;
      }
      onChanged();
    } catch {
      reportNetworkFailure();
      setActionError(OFFLINE_ERROR_MESSAGE);
    } finally {
      setBusyVersionId(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Documentos de la Tarea (Versionado v1, v2, v3...)
          </h3>
          <p className="text-xs text-slate-500">
            Cada documento mantiene su historial de versiones y una única versión Oficial / Vigente designada por
            Gerencia de Sede.
          </p>
        </div>

        {canUpload && (
          <button
            type="button"
            onClick={() => setUploadDocName('')}
            className="w-full sm:w-auto justify-center min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
          >
            <FileUp className="w-4 h-4" />
            Subir Documento / Revisión
          </button>
        )}
      </div>

      {actionError && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-center gap-2">
          {!effectiveOnline && <WifiOff className="w-4 h-4 shrink-0" />}
          <span>{actionError}</span>
        </div>
      )}

      {documentos.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center text-xs text-slate-500">
          No hay documentos cargados aún en esta tarea.
        </div>
      ) : (
        <div className="space-y-4">
          {documentos.map((doc) => (
            <div key={doc.id} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-2 font-semibold text-sm text-slate-900">
                  <FileText className="w-4 h-4 text-brand-600" />
                  <span>{doc.nombre_documento}</span>
                </div>
                {canUpload && (
                  <button
                    type="button"
                    onClick={() => setUploadDocName(doc.nombre_documento)}
                    className="text-xs font-semibold text-brand-700 hover:underline"
                  >
                    + Nueva versión
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100">
                {doc.versiones.map((v) => (
                  <div
                    key={v.id}
                    className={`p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs ${
                      v.es_vigente ? 'bg-emerald-50/60' : 'bg-white'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                          {v.etiqueta}
                        </span>
                        {v.es_vigente ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                            <Award className="w-3.5 h-3.5" /> Oficial / Vigente
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                            En Revisión
                          </span>
                        )}
                        <span className="font-medium text-slate-800 truncate">{v.nombre_original}</span>
                        {v.hash_duplicado_en_documento && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                            Archivo idéntico a una versión anterior
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 break-words">{v.descripcion_cambio}</p>
                      <p className="text-[11px] text-slate-400 font-mono break-all">
                        Autor: {v.autor_nombre ?? v.autor_id} · {formatMexicoCityDateTime(v.creado_en)}
                      </p>
                    </div>

                    <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 shrink-0">
                      <a
                        href={`/api/documentos/versiones/${v.id}/descarga`}
                        className="flex-1 sm:flex-initial justify-center min-h-[38px] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium"
                      >
                        <Download className="w-3.5 h-3.5" /> Descargar
                      </a>

                      {!v.es_vigente &&
                        (canDesignateOfficial ? (
                          <button
                            type="button"
                            disabled={busyVersionId === v.id}
                            onClick={() => handleSetVigente(v.id)}
                            className="flex-1 sm:flex-initial justify-center min-h-[38px] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          >
                            <Award className="w-3.5 h-3.5" />
                            {busyVersionId === v.id ? 'Aplicando...' : 'Marcar Oficial / Vigente'}
                          </button>
                        ) : (
                          <span
                            title="Exclusivo de Gerencia de Sede"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed"
                          >
                            <Lock className="w-3.5 h-3.5" /> Solo GS
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {uploadDocName !== null && (
        <SubirVersionModal
          tareaId={tareaId}
          existingDocumentNames={documentos.map((d) => d.nombre_documento)}
          initialDocumentName={uploadDocName}
          onClose={() => setUploadDocName(null)}
          onUploaded={onChanged}
        />
      )}
    </div>
  );
}
