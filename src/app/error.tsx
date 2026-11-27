'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

export default function AppErrorBoundary({
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
    <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl ${isOnline ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
            {isOnline ? <AlertTriangle className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">
              {isOnline ? 'Ocurrió un problema al cargar la vista' : 'Sin conexión con el servidor central'}
            </h1>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {isOnline
                ? 'La operación fue interrumpida de forma segura. Puedes reintentar ahora.'
                : 'Se interrumpió la conexión mientras cargabas esta sección. Tus borradores locales guardados en sessionStorage permanecen intactos.'}
            </p>
          </div>
        </div>

        {error?.message && isOnline && (
          <p className="text-[11px] font-mono bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-slate-700 break-words">
            {error.message}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
          >
            <RefreshCw className="w-4 h-4" /> Reintentar
          </button>
          <button
            type="button"
            disabled={!isOnline}
            onClick={() => window.location.reload()}
            className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold"
          >
            Recargar vista
          </button>
        </div>
      </div>
    </div>
  );
}
