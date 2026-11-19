'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Clock, LogOut, Wifi, WifiOff } from 'lucide-react';
import {
  INACTIVITY_EXPIRE_MS,
  INACTIVITY_WARN_MS,
  useInactivityTimer,
} from '@/hooks/useInactivityTimer';
import { createSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface SessionGuardContextValue {
  isOnline: boolean;
  justReconnected: boolean;
  dismissReconnectedBanner: () => void;
  simulatedOffline: boolean;
  setSimulatedOffline: (offline: boolean) => void;
  effectiveOnline: boolean;
  simulateInactivityWarning: () => void;
  simulateInactivityExpiry: () => void;
  registerActivity: () => void;
}

const SessionGuardContext = createContext<SessionGuardContextValue>({
  isOnline: true,
  justReconnected: false,
  dismissReconnectedBanner: () => {},
  simulatedOffline: false,
  setSimulatedOffline: () => {},
  effectiveOnline: true,
  simulateInactivityWarning: () => {},
  simulateInactivityExpiry: () => {},
  registerActivity: () => {},
});

export function useSessionGuard() {
  return useContext(SessionGuardContext);
}

export function SessionInactivityGuard({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  const effectiveOnline = isOnline && !simulatedOffline;

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const onOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
    };
    const onOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleSetSimulatedOffline = useCallback((offline: boolean) => {
    setSimulatedOffline(offline);
    if (!offline) {
      setJustReconnected(true);
    } else {
      setJustReconnected(false);
    }
  }, []);

  const handleExpire = useCallback(async () => {
    // 1. Limpieza inmediata e independiente de red (INT-001, RN-004, CAL-002)
    try {
      sessionStorage.clear();
    } catch {
      // Ignorar
    }

    // 2. Cerrar sesión local de Supabase sin depender de respuesta de red (scope: 'local')
    try {
      if (isSupabaseConfigured()) {
        const supabase = createSupabaseBrowserClient();
        await supabase?.auth.signOut({ scope: 'local' });
      }
      if (navigator.onLine && !simulatedOffline) {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
      }
    } catch {
      // Continuar incluso sin conexión
    }

    // 3. Redirigir a pantalla de login exigiendo nueva autenticación
    router.replace('/login?reason=timeout');
  }, [router, simulatedOffline]);

  const timer = useInactivityTimer({
    enabled,
    onExpire: handleExpire,
  });

  const simulateInactivityWarning = useCallback(() => {
    timer.simulateElapsedMs(INACTIVITY_WARN_MS + 1000);
  }, [timer]);

  const simulateInactivityExpiry = useCallback(() => {
    timer.simulateElapsedMs(INACTIVITY_EXPIRE_MS + 1000);
  }, [timer]);

  return (
    <SessionGuardContext.Provider
      value={{
        isOnline,
        justReconnected,
        dismissReconnectedBanner: () => setJustReconnected(false),
        simulatedOffline,
        setSimulatedOffline: handleSetSimulatedOffline,
        effectiveOnline,
        simulateInactivityWarning,
        simulateInactivityExpiry,
        registerActivity: timer.registerActivity,
      }}
    >
      {/* Desmontaje inmediato de vistas/formularios al expirar (CP-003) */}
      {timer.isExpired ? (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-6 text-center space-y-4">
            <LogOut className="w-10 h-10 text-red-400 mx-auto" />
            <h2 className="text-lg font-semibold">Sesión expirada por inactividad</h2>
            <p className="text-sm text-slate-300">
              Por seguridad, su sesión venció tras 15 minutos sin actividad y los borradores locales en{' '}
              <code>sessionStorage</code> fueron eliminados.
            </p>
            <button
              type="button"
              onClick={() => router.replace('/login?reason=timeout')}
              className="w-full py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-500 font-medium text-sm"
            >
              Ir a Iniciar Sesión
            </button>
          </div>
        </div>
      ) : (
        <>
          {children}

          {/* Modal de advertencia al minuto 13 (INT-001, RN-004) */}
          {enabled && timer.showWarningModal && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="inactivity-warning-title"
              className="fixed inset-0 z-50 bg-slate-900/65 flex items-center justify-center p-4"
            >
              <div className="bg-white border border-amber-300 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 id="inactivity-warning-title" className="text-base font-semibold text-slate-900">
                      Advertencia de expiración de sesión
                    </h3>
                    <p className="text-sm text-slate-700 mt-1">
                      Su sesión vencerá en 2 minutos por inactividad. Los borradores locales se perderán.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-900">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-4 h-4" /> Tiempo restante aproximado:
                  </span>
                  <span className="font-mono font-bold">
                    {Math.floor(timer.remainingSeconds / 60)}:
                    {String(timer.remainingSeconds % 60).padStart(2, '0')}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={timer.registerActivity}
                    className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
                  >
                    Continuar sesión activa
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </SessionGuardContext.Provider>
  );
}

export function NetworkStatusBanner() {
  const { effectiveOnline, justReconnected, dismissReconnectedBanner } = useSessionGuard();

  if (!effectiveOnline) {
    return (
      <div
        role="alert"
        className="bg-red-600 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-2"
      >
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>
          Sin conexión con el servidor central: los cambios no se han guardado. Los formularios activos se
          conservan como borrador local en <code>sessionStorage</code>.
        </span>
      </div>
    );
  }

  if (justReconnected) {
    return (
      <div
        role="status"
        className="bg-emerald-600 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-between gap-2"
      >
        <span className="flex items-center gap-2 mx-auto">
          <Wifi className="w-4 h-4 shrink-0" />
          Conexión restablecida. Revise su información antes de enviar (no se realizó envío automático).
        </span>
        <button
          type="button"
          onClick={dismissReconnectedBanner}
          className="text-xs underline hover:no-underline shrink-0"
        >
          Ocultar
        </button>
      </div>
    );
  }

  return null;
}
