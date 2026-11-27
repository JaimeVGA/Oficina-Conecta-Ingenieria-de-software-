'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

export default function DashboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <div className="min-h-[60dvh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl shadow-lg p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl ${isOnline ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
            {isOnline ? <AlertTriangle className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isOnline ? 'No se pudo completar la carga del módulo' : 'Modo sin conexión activo'}
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {isOnline
                ? 'Ocurrió un error temporal al consultar el servidor. Tus borradores locales no se perdieron.'
                : 'Se perdió la conexión al servidor central. Los borradores locales almacenados en este navegador (sessionStorage) siguen seguros y disponibles al volver a tu vista anterior.'}
            </p>
          </div>
        </div>

        {error?.message && isOnline && (
          <p className="text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 break-words">
            {error.message}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => reset()}
            className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
          >
            <RefreshCw className="w-4 h-4" /> Reintentar
          </button>
          <button
            type="button"
            disabled={!isOnline}
            onClick={() => window.location.reload()}
            className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold"
          >
            Recargar vista
          </button>
        </div>
      </div>
    </div>
  );
}
