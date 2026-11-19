'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export const INACTIVITY_WARN_MS = 13 * 60 * 1000; // 13 minutos (780,000 ms)
export const INACTIVITY_EXPIRE_MS = 15 * 60 * 1000; // 15 minutos (900,000 ms)
const LAST_ACTIVITY_STORAGE_KEY = 'oc_last_activity_ms';

export interface UseInactivityTimerOptions {
  enabled: boolean;
  onExpire: () => void;
}

export interface InactivityTimerState {
  showWarningModal: boolean;
  isExpired: boolean;
  remainingSeconds: number;
  registerActivity: () => void;
  /** Exclusivo para pruebas/demostración (CP-003): simula alcanzar el minuto 13 o 15. */
  simulateElapsedMs: (elapsedMs: number) => void;
}

/**
 * Monitor de inactividad real conforme a INT-001, RN-004 y CP-003:
 * - Solo cuentan como actividad: keydown en entradas, click en controles y navegación de rutas.
 * - Ignora explícitamente scroll, wheel y mousemove (mantener pantalla abierta no evita el cierre).
 * - Usa timestamp persistido y visibilitychange/focus para funcionar incluso en pestañas ocultas o sin internet.
 */
export function useInactivityTimer({
  enabled,
  onExpire,
}: UseInactivityTimerOptions): InactivityTimerState {
  const pathname = usePathname();
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.floor(INACTIVITY_EXPIRE_MS / 1000));
  const lastActivityRef = useRef<number>(Date.now());
  const expiredTriggeredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const setLastActivity = useCallback((timestampMs: number) => {
    lastActivityRef.current = timestampMs;
    try {
      sessionStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(timestampMs));
    } catch {
      // sessionStorage no disponible
    }
  }, []);

  const evaluateClock = useCallback(() => {
    if (!enabled || expiredTriggeredRef.current) return;

    let stored = lastActivityRef.current;
    try {
      const raw = sessionStorage.getItem(LAST_ACTIVITY_STORAGE_KEY);
      if (raw) {
        const parsed = Number(raw);
        if (!Number.isNaN(parsed) && parsed > 0) {
          stored = Math.min(stored, parsed) === parsed ? parsed : stored;
        }
      }
    } catch {
      // Ignorar
    }

    const elapsed = Date.now() - stored;
    const leftSec = Math.max(0, Math.ceil((INACTIVITY_EXPIRE_MS - elapsed) / 1000));
    setRemainingSeconds(leftSec);

    if (elapsed >= INACTIVITY_EXPIRE_MS) {
      expiredTriggeredRef.current = true;
      setShowWarningModal(false);
      setIsExpired(true);
      try {
        sessionStorage.clear();
      } catch {
        // Ignorar
      }
      onExpireRef.current();
      return;
    }

    setShowWarningModal(elapsed >= INACTIVITY_WARN_MS);
  }, [enabled]);

  const registerActivity = useCallback(() => {
    if (!enabled || expiredTriggeredRef.current) return;
    setLastActivity(Date.now());
    setShowWarningModal(false);
    setRemainingSeconds(Math.floor(INACTIVITY_EXPIRE_MS / 1000));
  }, [enabled, setLastActivity]);

  const simulateElapsedMs = useCallback(
    (elapsedMs: number) => {
      if (!enabled || expiredTriggeredRef.current) return;
      const syntheticTimestamp = Date.now() - elapsedMs;
      setLastActivity(syntheticTimestamp);
      evaluateClock();
    },
    [enabled, setLastActivity, evaluateClock]
  );

  // Reiniciar marca de actividad al navegar entre rutas
  useEffect(() => {
    if (!enabled) return;
    registerActivity();
  }, [pathname, enabled, registerActivity]);

  useEffect(() => {
    if (!enabled) return;
    expiredTriggeredRef.current = false;
    setIsExpired(false);
    setLastActivity(Date.now());

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        registerActivity();
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest('button, a, input, select, textarea, [role="button"], [role="tab"]')
      ) {
        registerActivity();
      }
    };

    const handleVisibilityOrFocus = () => {
      evaluateClock();
    };

    // NOTA INT-001: NO escuchar scroll, wheel ni mousemove (scroll pasivo ignorado)
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('click', handleClick, { capture: true });
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('pageshow', handleVisibilityOrFocus);

    const intervalId = window.setInterval(evaluateClock, 1000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('click', handleClick, { capture: true });
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('pageshow', handleVisibilityOrFocus);
      window.clearInterval(intervalId);
    };
  }, [enabled, registerActivity, evaluateClock, setLastActivity]);

  return {
    showWarningModal,
    isExpired,
    remainingSeconds,
    registerActivity,
    simulateElapsedMs,
  };
}
