'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Building2, Lock, LogIn, ShieldCheck } from 'lucide-react';

const DEMO_ACCOUNTS = [
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
  const demoTools = process.env.NEXT_PUBLIC_ENABLE_DEMO_TOOLS !== 'false';

  const [email, setEmail] = useState('carlos.mendez@oficinaconecta.mx');
  const [password, setPassword] = useState('OficinaConecta2026!');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
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
      setErrorMsg('Sin conexión con el servidor central.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white font-bold flex items-center justify-center">
              OC
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Oficina Conecta</h1>
              <p className="text-xs text-slate-500">Acceso Autenticado · Grupo 502-A Equipo I</p>
            </div>
          </div>

          {reason === 'timeout' && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Sesión cerrada por inactividad (15 minutos)</p>
                <p className="mt-0.5">
                  Todos los borradores locales en <code>sessionStorage</code> fueron purgados. Autentíquese nuevamente
                  para continuar.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="usuario@oficinaconecta.mx"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Verificando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
            <p className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Sedes piloto cerradas: CDMX, Oaxaca de Juárez y Puebla de Zaragoza.
            </p>
            <p className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Advertencia de inactividad a los 13 min y cierre con purga a los 15 min.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 p-6 border-t md:border-t-0 md:border-l border-slate-200 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              {demoTools ? 'Cuentas Piloto para Demostración' : 'Roles del Sistema'}
            </h2>

            {demoTools && (
              <div className="space-y-1.5">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.correo}
                    type="button"
                    onClick={() => {
                      setEmail(acc.correo);
                      setPassword('OficinaConecta2026!');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                      email === acc.correo
                        ? 'bg-brand-50 border-brand-500 text-brand-900'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>{acc.nombre}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                        {acc.rol}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {acc.sede} · {acc.correo}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="mt-4 text-[11px] text-slate-500">
            Contraseña de cuentas piloto: <code className="bg-slate-200 px-1.5 py-0.5 rounded">OficinaConecta2026!</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <LoginContent />
    </Suspense>
  );
}
