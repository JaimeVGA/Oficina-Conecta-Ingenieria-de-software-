'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Clock, Info, LogOut, RefreshCw, Wifi, WifiOff, X } from 'lucide-react';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import { createSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  clearOfflineUserCache,
  hasDirtyLocalDrafts,
  OFFLINE_NAV_BLOCKED_MESSAGE,
  probeServerConnection,
} from '@/lib/offline/client';

interface SessionGuardContextValue {
  isOnline: boolean;
  justReconnected: boolean;
  dismissReconnectedBanner: () => void;
  effectiveOnline: boolean;
  registerActivity: () => void;
  reportNetworkFailure: () => void;
  checkConnectionNow: () => Promise<boolean>;
  checkingConnection: boolean;
  offlineNotice: string | null;
  showOfflineNotice: (msg: string) => void;
  dismissOfflineNotice: () => void;
}

const SessionGuardContext = createContext<SessionGuardContextValue>({
  isOnline: true,
  justReconnected: false,
  dismissReconnectedBanner: () => {},
  effectiveOnline: true,
  registerActivity: () => {},
  reportNetworkFailure: () => {},
  checkConnectionNow: async () => true,
  checkingConnection: false,
  offlineNotice: null,
  showOfflineNotice: () => {},
  dismissOfflineNotice: () => {},
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
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const [expiredOfflineError, setExpiredOfflineError] = useState<string | null>(null);

  const effectiveOnline = isOnline;

  const dismissOfflineNotice = useCallback(() => {
    setOfflineNotice(null);
  }, []);

  const showOfflineNotice = useCallback((msg: string) => {
    setOfflineNotice(msg);
  }, []);

  const reportNetworkFailure = useCallback(() => {
    setIsOnline(false);
    setJustReconnected(false);
  }, []);

  const checkConnectionNow = useCallback(async (): Promise<boolean> => {
    setCheckingConnection(true);
    try {
      const connected = await probeServerConnection();
      if (connected) {
        setIsOnline(true);
        setJustReconnected(true);
        setOfflineNotice(null);
        setExpiredOfflineError(null);
        return true;
      }
      setIsOnline(false);
      setJustReconnected(false);
      setOfflineNotice('Sin conexión con el servidor central. Tus borradores activos siguen protegidos.');
      return false;
    } finally {
      setCheckingConnection(false);
    }
  }, []);

  useEffect(() => {
    const initialOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsOnline(initialOnline);

    const onOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      setOfflineNotice(null);
      setExpiredOfflineError(null);
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

  // Interceptor global de navegación offline para proteger el árbol React actual y borradores
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const offlineNow = !effectiveOnline || (typeof navigator !== 'undefined' && navigator.onLine === false);
      if (!offlineNow) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const rawHref = anchor.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#')) return;

      try {
        const parsed = new URL(rawHref, window.location.href);
        if (parsed.origin !== window.location.origin) return;

        const sameDocumentHash =
          parsed.pathname === window.location.pathname &&
          parsed.search === window.location.search &&
          parsed.hash !== '';

        const pointsToAnotherViewOrApi =
          parsed.pathname.startsWith('/api/') ||
          (!sameDocumentHash &&
            (parsed.pathname !== window.location.pathname || parsed.search !== window.location.search));

        if (pointsToAnotherViewOrApi) {
          e.preventDefault();
          e.stopPropagation();
          if (effectiveOnline) {
            setIsOnline(false);
            setJustReconnected(false);
          }
          showOfflineNotice(OFFLINE_NAV_BLOCKED_MESSAGE);
        }
      } catch {
        // Ignorar href inválido
      }
    };

    document.addEventListener('click', handleDocumentClick, { capture: true });
    return () => document.removeEventListener('click', handleDocumentClick, { capture: true });
  }, [effectiveOnline, showOfflineNotice]);

  // Evitar cierre/recarga accidental mientras está offline con borradores modificados sin enviar
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const offlineNow = !effectiveOnline || (typeof navigator !== 'undefined' && navigator.onLine === false);
      if (offlineNow && hasDirtyLocalDrafts()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [effectiveOnline]);

  const handleExpire = useCallback(async () => {
    try {
      sessionStorage.clear();
    } catch {
      // Ignorar
    }

    await clearOfflineUserCache();

    try {
      if (isSupabaseConfigured()) {
        const supabase = createSupabaseBrowserClient();
        await supabase?.auth.signOut({ scope: 'local' });
      }
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
      }
    } catch {
      // Continuar incluso sin conexión
    }

    if (typeof navigator === 'undefined' || navigator.onLine) {
      router.replace('/login?reason=timeout');
    }
  }, [router]);

  const timer = useInactivityTimer({
    enabled,
    onExpire: handleExpire,
  });

  const handleExpiredGoToLogin = async () => {
    setExpiredOfflineError(null);
    const connected = await checkConnectionNow();
    if (!connected) {
      setExpiredOfflineError('Sin conexión a internet. Restablece tu conexión para volver a iniciar sesión.');
      return;
    }
    router.replace('/login?reason=timeout');
  };

  return (
    <SessionGuardContext.Provider
      value={{
        isOnline,
        justReconnected,
        dismissReconnectedBanner: () => setJustReconnected(false),
        effectiveOnline,
        registerActivity: timer.registerActivity,
        reportNetworkFailure,
        checkConnectionNow,
        checkingConnection,
        offlineNotice,
        showOfflineNotice,
        dismissOfflineNotice,
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
            {expiredOfflineError && (
              <div
                role="alert"
                className="bg-red-950/70 border border-red-700/60 text-red-200 rounded-lg p-3 text-xs flex items-center justify-center gap-2"
              >
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>{expiredOfflineError}</span>
              </div>
            )}
            <button
              type="button"
              disabled={checkingConnection}
              onClick={() => void handleExpiredGoToLogin()}
              className="w-full py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-60 font-medium text-sm inline-flex items-center justify-center gap-2"
            >
              {checkingConnection && <RefreshCw className="w-4 h-4 animate-spin" />}
              {checkingConnection ? 'Verificando conexión...' : 'Ir a Iniciar Sesión'}
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
  const {
    effectiveOnline,
    justReconnected,
    dismissReconnectedBanner,
    checkConnectionNow,
    checkingConnection,
    offlineNotice,
    dismissOfflineNotice,
  } = useSessionGuard();

  if (!effectiveOnline) {
    return (
      <div className="sticky top-0 z-40">
        <div
          role="alert"
          className="bg-red-600 text-white px-4 py-2 text-xs sm:text-sm font-medium flex flex-wrap items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span className="break-words">
              Sin conexión con el servidor central: los cambios no se han guardado. Modo sin conexión activo: tus
              borradores se conservan localmente en este navegador.
            </span>
          </div>
          <button
            type="button"
            disabled={checkingConnection}
            onClick={() => void checkConnectionNow()}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 disabled:opacity-60 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingConnection ? 'animate-spin' : ''}`} />
            {checkingConnection ? 'Verificando...' : 'Verificar conexión'}
          </button>
        </div>

        {offlineNotice && (
          <div
            role="status"
            className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs font-medium flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-amber-700" />
              <span>{offlineNotice}</span>
            </span>
            <button
              type="button"
              onClick={dismissOfflineNotice}
              aria-label="Ocultar aviso"
              className="p-1 rounded hover:bg-amber-200/60 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  if (justReconnected) {
    return (
      <div className="sticky top-0 z-40">
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
      </div>
    );
  }

  if (offlineNotice) {
    return (
      <div className="sticky top-0 z-40">
        <div
          role="status"
          className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs font-medium flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-700" />
            <span>{offlineNotice}</span>
          </span>
          <button
            type="button"
            onClick={dismissOfflineNotice}
            aria-label="Ocultar aviso"
            className="p-1 rounded hover:bg-amber-200/60 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
