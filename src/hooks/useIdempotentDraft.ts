'use client';

import { useCallback, useEffect, useState } from 'react';

export interface StoredDraftEnvelope<T> {
  data: T;
  idempotencyKey: string;
  savedAt: string;
}

/**
 * Hook de borrador local en sessionStorage con clave de idempotencia UUID estable (INT-001, RN-004):
 * - Al abrir el formulario crea o recupera { data, idempotencyKey }.
 * - Conserva EXACTAMENTE el mismo idempotencyKey ante fallos de red o reintentos.
 * - Nunca realiza auto-envío al reconectarse a internet.
 * - Se purga automáticamente al confirmar HTTP 200/201 o al expirar/cerrar sesión (sessionStorage.clear()).
 */
export function useIdempotentDraft<T>(draftKey: string, initialData: T) {
  const [data, setDataState] = useState<T>(initialData);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredDraftEnvelope<T>;
        if (parsed && parsed.idempotencyKey && parsed.data) {
          setDataState(parsed.data);
          setIdempotencyKey(parsed.idempotencyKey);
          setSavedAt(parsed.savedAt ?? null);
          setHasRestoredDraft(true);
          return;
        }
      }
      const newKey = crypto.randomUUID();
      const envelope: StoredDraftEnvelope<T> = {
        data: initialData,
        idempotencyKey: newKey,
        savedAt: new Date().toISOString(),
      };
      sessionStorage.setItem(draftKey, JSON.stringify(envelope));
      setIdempotencyKey(newKey);
      setDataState(initialData);
      setSavedAt(envelope.savedAt);
    } catch {
      setIdempotencyKey(crypto.randomUUID());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  const updateDraft = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setDataState((prev) => {
        const nextData = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
        const nextSavedAt = new Date().toISOString();
        setSavedAt(nextSavedAt);
        try {
          const existingRaw = sessionStorage.getItem(draftKey);
          const existingKey = existingRaw
            ? (JSON.parse(existingRaw) as StoredDraftEnvelope<T>).idempotencyKey
            : idempotencyKey || crypto.randomUUID();
          const envelope: StoredDraftEnvelope<T> = {
            data: nextData,
            idempotencyKey: existingKey,
            savedAt: nextSavedAt,
          };
          sessionStorage.setItem(draftKey, JSON.stringify(envelope));
        } catch {
          // sessionStorage no disponible
        }
        return nextData;
      });
    },
    [draftKey, idempotencyKey]
  );

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(draftKey);
    } catch {
      // Ignorar
    }
  }, [draftKey]);

  const regenerateKey = useCallback(() => {
    const newKey = crypto.randomUUID();
    setIdempotencyKey(newKey);
    try {
      const envelope: StoredDraftEnvelope<T> = {
        data,
        idempotencyKey: newKey,
        savedAt: new Date().toISOString(),
      };
      sessionStorage.setItem(draftKey, JSON.stringify(envelope));
    } catch {
      // Ignorar
    }
    return newKey;
  }, [data, draftKey]);

  return {
    data,
    idempotencyKey,
    hasRestoredDraft,
    savedAt,
    isLocalDraft: true as const,
    draftLabel: 'Borrador local no guardado en servidor' as const,
    updateDraft,
    clearDraft,
    regenerateKey,
  };
}
