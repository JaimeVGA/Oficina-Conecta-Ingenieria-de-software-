'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import { clearOfflineUserCache, registerOfflineServiceWorker } from '@/lib/offline/client';

const TEST_ACCOUNTS = [
  {
    correo: 'roberto.salinas@oficinaconecta.mx',
    nombre: 'Roberto Salinas',
    rol: 'DN',
    sede: 'Dirección Nacional (Todas)',
  },
  {
    correo: 'carlos.mendez@oficinaconecta.mx',
    nombre: 'Carlos Méndez',
    rol: 'GS',
    sede: 'Puebla de Zaragoza',
  },
  {
    correo: 'sofia.morales@oficinaconecta.mx',
    nombre: 'Sofía Morales',
    rol: 'OP',
    sede: 'Puebla de Zaragoza',
  },
  {
    correo: 'pedro.ramirez@oficinaconecta.mx',
    nombre: 'Pedro Ramírez',
    rol: 'OP',
    sede: 'Puebla (Redes y Soporte)',
  },
  {
    correo: 'laura.gomez@oficinaconecta.mx',
    nombre: 'Laura Gómez',
    rol: 'GS',
    sede: 'Ciudad de México',
  },
  {
    correo: 'miguel.torres@oficinaconecta.mx',
    nombre: 'Miguel Torres',
    rol: 'OP',
    sede: 'Ciudad de México',
  },
  {
    correo: 'elena.vasquez@oficinaconecta.mx',
    nombre: 'Elena Vásquez',
    rol: 'GS',
    sede: 'Oaxaca de Juárez',
  },
  {
    correo: 'diego.cruz@oficinaconecta.mx',
    nombre: 'Diego Cruz',
    rol: 'OP',
    sede: 'Oaxaca de Juárez',
  },
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [showDemoPass, setShowDemoPass] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    void clearOfflineUserCache();
    void registerOfflineServiceWorker();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setIsOnline(false);
      setErrorMsg('Sin conexión con el servidor central. Verifica tu conexión a internet para iniciar sesión.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setErrorMsg(json.message ?? 'No fue posible iniciar sesión.');
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setErrorMsg('Sin conexión con el servidor central. Verifica tu conexión a internet para iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex items-start md:items-center justify-center px-3 py-5 sm:p-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {!isOnline && (
          <div
            role="alert"
            className="bg-red-600 text-white px-4 py-2.5 text-xs font-medium flex items-center gap-2"
          >
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Sin conexión con el servidor central. Verifica tu conexión a internet para iniciar sesión.</span>
          </div>
        )}
        <div className="min-w-0 p-5 sm:p-8 space-y-5 sm:space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-brand-600 text-white font-bold flex items-center justify-center">
              OC
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900">Oficina Conecta</h1>
              <p className="text-xs text-slate-500">Plataforma de Gestión Multisede</p>
            </div>
          </div>

          {reason === 'timeout' && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold">Sesión cerrada por inactividad (15 minutos)</p>
                <p className="mt-0.5 break-words">
                  Por seguridad, tu sesión se cerró automáticamente. Inicia sesión nuevamente para continuar.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="break-words">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                Correo institucional
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="usuario@oficinaconecta.mx"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPasswordInput ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[44px] pl-3 pr-11 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordInput((v) => !v)}
                  aria-label={showPasswordInput ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-700"
                >
                  {showPasswordInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              {loading ? 'Verificando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1.5">
            <p className="flex items-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>Sedes activas: CDMX, Oaxaca de Juárez y Puebla de Zaragoza.</span>
            </p>
            <p className="flex items-start gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>Por seguridad, la sesión se cierra automáticamente tras 15 minutos de inactividad.</span>
            </p>
          </div>
        </div>

        <div className="min-w-0 bg-slate-50 px-5 py-3.5 sm:px-8 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setShowAccounts((v) => !v)}
            aria-expanded={showAccounts}
            className="w-full min-h-[44px] flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <Building2 className="w-4 h-4 shrink-0 text-brand-600" />
              <span className="truncate">Perfiles de prueba ({TEST_ACCOUNTS.length})</span>
            </span>
            {showAccounts ? (
              <ChevronUp className="w-4 h-4 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 shrink-0" />
            )}
          </button>

          {showAccounts && (
            <>
              <div className="mt-3 space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                {TEST_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.correo}
                    type="button"
                    onClick={() => {
                      setEmail(acc.correo);
                      setPassword('OficinaConecta2026!');
                      setShowAccounts(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full min-h-[44px] text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                      email === acc.correo
                        ? 'bg-brand-50 border-brand-500 text-brand-900'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 font-semibold min-w-0">
                      <span className="truncate">{acc.nombre}</span>
                      <span className="shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                        {acc.rol}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate min-w-0">
                      {acc.sede} · {acc.correo}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/70 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                <span>Contraseña:</span>
                {showDemoPass ? (
                  <code className="bg-slate-200 px-1.5 py-0.5 rounded break-all">OficinaConecta2026!</code>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDemoPass(true)}
                    className="min-h-[36px] text-brand-600 font-semibold hover:underline"
                  >
                    Mostrar clave
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-slate-900" />}>
      <LoginContent />
    </Suspense>
  );
}
