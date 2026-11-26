'use client';

import React, { useState } from 'react';
import { AlertTriangle, FileUp, X } from 'lucide-react';
import { computeFileSha256 } from '@/lib/crypto/sha256';

export function SubirVersionModal({
  tareaId,
  existingDocumentNames,
  initialDocumentName = '',
  onClose,
  onUploaded,
}: {
  tareaId: string;
  existingDocumentNames: string[];
  initialDocumentName?: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [nombreDocumento, setNombreDocumento] = useState(initialDocumentName || existingDocumentNames[0] || '');
  const [descripcionCambio, setDescripcionCambio] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [hashPreview, setHashPreview] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checkHash = async (selectedFile: File, docName: string) => {
    const hash = await computeFileSha256(selectedFile);
    setHashPreview(hash);
    if (!docName.trim()) {
      setDuplicateWarning(null);
      return;
    }
    const res = await fetch(`/api/tareas/${tareaId}/documentos/verificar-hash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre_documento: docName, hash_sha256: hash }),
    });
    const json = (await res.json()) as { advertencia?: string | null };
    setDuplicateWarning(json.advertencia ?? null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setDuplicateWarning(null);
    if (f) {
      await checkHash(f, nombreDocumento);
    } else {
      setHashPreview(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!file) {
      setErrorMsg('Debe seleccionar un archivo.');
      return;
    }
    if (!nombreDocumento.trim() || !descripcionCambio.trim()) {
      setErrorMsg('ERR-002: El nombre del documento y la descripción del cambio son obligatorios.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('nombre_documento', nombreDocumento.trim());
      formData.append('descripcion_cambio', descripcionCambio.trim());

      const res = await fetch(`/api/tareas/${tareaId}/documentos`, {
        method: 'POST',
        body: formData,
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setErrorMsg(json.message ?? 'Error al subir la versión.');
        return;
      }
      onUploaded();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg max-h-[92dvh] sm:max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl shadow-2xl p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4">
        <div className="flex items-start justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Subir Revisión Documental (v1, v2, v3...)</h3>
            <p className="text-xs text-slate-500">
              Toda nueva versión se registra en estado &quot;En Revisión&quot;. Solo Gerencia de Sede puede marcarla Oficial.
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

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">{errorMsg}</div>
        )}

        <form onSubmit={handleUpload} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre del documento lógico (puede haber varios por tarea)
            </label>
            <input
              type="text"
              required
              list="docs-existentes"
              value={nombreDocumento}
              onChange={(e) => {
                setNombreDocumento(e.target.value);
                if (file) void checkHash(file, e.target.value);
              }}
              placeholder="Ej. Acta de Calibración, Evidencia Fotográfica..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <datalist id="docs-existentes">
              {existingDocumentNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Archivo (máx. 50 MB)</label>
            <input
              type="file"
              required
              accept=".pdf,.txt,.csv,.md,.json,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip,.ics"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-600"
            />
            {hashPreview && (
              <p className="mt-1 font-mono text-[10px] text-slate-500 break-all">SHA-256: {hashPreview}</p>
            )}
          </div>

          {duplicateWarning && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{duplicateWarning}</p>
                <p className="text-[11px] mt-0.5">
                  Advertencia informativa dentro de este mismo documento; puede continuar si desea conservar la revisión.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción del cambio</label>
            <textarea
              rows={2}
              required
              value={descripcionCambio}
              onChange={(e) => setDescripcionCambio(e.target.value)}
              placeholder="Ej. Corrección de lecturas eléctricas del tablero B"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-slate-100">
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
              className="w-full sm:w-auto justify-center min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
            >
              <FileUp className="w-4 h-4" />
              {submitting ? 'Subiendo...' : 'Registrar Versión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
