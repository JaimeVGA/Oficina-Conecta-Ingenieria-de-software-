'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface StoredDraftEnvelope<T> {
  data: T;
  idempotencyKey: string;
  savedAt: string;
  dirty?: boolean;
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
  const [isDirty, setIsDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const dataRef = useRef<T>(initialData);
  const idempotencyKeyRef = useRef<string>('');

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredDraftEnvelope<T>;
        if (parsed && parsed.idempotencyKey && parsed.data) {
          const restoredDirty = parsed.dirty !== false;
          dataRef.current = parsed.data;
          idempotencyKeyRef.current = parsed.idempotencyKey;
          setDataState(parsed.data);
          setIdempotencyKey(parsed.idempotencyKey);
          setSavedAt(parsed.savedAt ?? null);
          setIsDirty(restoredDirty);
          setHasRestoredDraft(restoredDirty);
          return;
        }
      }
      const newKey = crypto.randomUUID();
      const envelope: StoredDraftEnvelope<T> = {
        data: initialData,
        idempotencyKey: newKey,
        savedAt: new Date().toISOString(),
        dirty: false,
      };
      sessionStorage.setItem(draftKey, JSON.stringify(envelope));
      dataRef.current = initialData;
      idempotencyKeyRef.current = newKey;
      setIdempotencyKey(newKey);
      setDataState(initialData);
      setSavedAt(envelope.savedAt);
      setIsDirty(false);
      setHasRestoredDraft(false);
    } catch {
      const fallbackKey = crypto.randomUUID();
      idempotencyKeyRef.current = fallbackKey;
      setIdempotencyKey(fallbackKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  const updateDraft = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const nextData = typeof updater === 'function' ? (updater as (p: T) => T)(dataRef.current) : updater;
      const nextSavedAt = new Date().toISOString();
      let activeKey = idempotencyKeyRef.current;

      try {
        const existingRaw = sessionStorage.getItem(draftKey);
        if (existingRaw) {
          const parsed = JSON.parse(existingRaw) as StoredDraftEnvelope<T>;
          if (parsed?.idempotencyKey) {
            activeKey = parsed.idempotencyKey;
          }
        }
      } catch {
        // Ignorar
      }

      if (!activeKey) {
        activeKey = crypto.randomUUID();
      }

      dataRef.current = nextData;
      idempotencyKeyRef.current = activeKey;
      setDataState(nextData);
      setIdempotencyKey(activeKey);
      setSavedAt(nextSavedAt);
      setIsDirty(true);

      try {
        const envelope: StoredDraftEnvelope<T> = {
          data: nextData,
          idempotencyKey: activeKey,
          savedAt: nextSavedAt,
          dirty: true,
        };
        sessionStorage.setItem(draftKey, JSON.stringify(envelope));
      } catch {
        // sessionStorage no disponible
      }
    },
    [draftKey]
  );

  const clearDraft = useCallback(() => {
    setIsDirty(false);
    setHasRestoredDraft(false);
    try {
      sessionStorage.removeItem(draftKey);
    } catch {
      // Ignorar
    }
  }, [draftKey]);

  const regenerateKey = useCallback(() => {
    const newKey = crypto.randomUUID();
    idempotencyKeyRef.current = newKey;
    setIdempotencyKey(newKey);
    try {
      const envelope: StoredDraftEnvelope<T> = {
        data: dataRef.current,
        idempotencyKey: newKey,
        savedAt: new Date().toISOString(),
        dirty: isDirty,
      };
      sessionStorage.setItem(draftKey, JSON.stringify(envelope));
    } catch {
      // Ignorar
    }
    return newKey;
  }, [draftKey, isDirty]);

  return {
    data,
    idempotencyKey,
    hasRestoredDraft,
    isDirty,
    savedAt,
    isLocalDraft: true as const,
    draftLabel: 'Borrador local no guardado en servidor' as const,
    updateDraft,
    clearDraft,
    regenerateKey,
  };
}
