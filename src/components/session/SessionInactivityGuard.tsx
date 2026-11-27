'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Clock, LogOut, Wifi, WifiOff } from 'lucide-react';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import { createSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface SessionGuardContextValue {
  isOnline: boolean;
  justReconnected: boolean;
  dismissReconnectedBanner: () => void;
  effectiveOnline: boolean;
  registerActivity: () => void;
}

const SessionGuardContext = createContext<SessionGuardContextValue>({
  isOnline: true,
  justReconnected: false,
  dismissReconnectedBanner: () => {},
  effectiveOnline: true,
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
  const [justReconnected, setJustReconnected] = useState(false);

  const effectiveOnline = isOnline;

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

  const handleExpire = useCallback(async () => {
    try {
      sessionStorage.clear();
    } catch {
      // Ignorar
    }

    try {
      if (isSupabaseConfigured()) {
        const supabase = createSupabaseBrowserClient();
        await supabase?.auth.signOut({ scope: 'local' });
      }
      if (navigator.onLine) {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
      }
    } catch {
      // Continuar incluso sin conexión
    }

    router.replace('/login?reason=timeout');
  }, [router]);

  const timer = useInactivityTimer({
    enabled,
    onExpire: handleExpire,
  });

  return (
    <SessionGuardContext.Provider
      value={{
        isOnline,
        justReconnected,
        dismissReconnectedBanner: () => setJustReconnected(false),
        effectiveOnline,
        registerActivity: timer.registerActivity,
      }}
    >
      {timer.isExpired ? (
        <div className="min-h-[100dvh] flex items-center justify-center bg-slate-900 text-white p-4 sm:p-6">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-6 text-center space-y-4">
            <LogOut className="w-10 h-10 text-red-400 mx-auto" />
            <h2 className="text-lg font-semibold">Sesión expirada por inactividad</h2>
            <p className="text-sm text-slate-300">
              Por seguridad, tu sesión venció tras 15 minutos sin actividad y los borradores locales fueron eliminados.
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

          {/* Modal de advertencia al minuto 13 */}
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
                    className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
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
        className="bg-red-600 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 break-words"
      >
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>
          Sin conexión con el servidor central: los cambios no se han guardado. Tus borradores activos se conservan
          localmente en este navegador.
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
