'use client';

import React, { useState } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import { formatMexicoCityDateTime } from '@/lib/dates/mexicoCity';
import type { BitacoraEnriquecida } from '@/lib/supabase/types';

export function BitacoraClient({ registros }: { registros: BitacoraEnriquecida[] }) {
  const demoTools = process.env.NEXT_PUBLIC_ENABLE_DEMO_TOOLS !== 'false';
  const [cp001Result, setCp001Result] = useState<string | null>(null);

  const runCp001Probe = async (method: 'PUT' | 'DELETE') => {
    const res = await fetch('/api/bitacora', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: registros[0]?.id ?? 'probe' }),
    });
    const json = (await res.json()) as { error_code?: string; sqlstate?: string; message?: string };
    setCp001Result(`HTTP ${res.status} · [${json.error_code ?? 'ERR-005'} / SQLSTATE ${json.sqlstate ?? '42501'}] ${json.message}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-600" />
            Bitácora de Autorizaciones (Solo Adición / Append-Only)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            PER-008 / RES-002: Sin edición, sin borrado y sin captura de direcciones IP. Privilegios UPDATE y DELETE
            revocados en PostgreSQL (SQLSTATE 42501).
          </p>
        </div>

        {demoTools && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => runCp001Probe('PUT')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-900 text-xs font-semibold"
            >
              <Lock className="w-3.5 h-3.5" /> Probar PUT directo (CP-001)
            </button>
            <button
              type="button"
              onClick={() => runCp001Probe('DELETE')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-900 text-xs font-semibold"
            >
              <Lock className="w-3.5 h-3.5" /> Probar DELETE directo (CP-001)
            </button>
          </div>
        )}
      </div>

      {cp001Result && (
        <div
          role="status"
          className="bg-slate-900 text-emerald-300 font-mono text-xs rounded-xl p-4 border border-slate-700"
        >
          Respuesta del servidor ante intento de alteración: {cp001Result}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
            <tr>
              <th className="px-4 py-3">Fecha (MX)</th>
              <th className="px-4 py-3">Sede / Tarea</th>
              <th className="px-4 py-3">Solicitud</th>
              <th className="px-4 py-3">Dictamen y Resolutor</th>
              <th className="px-4 py-3">Motivo Resolución</th>
              <th className="px-4 py-3">Cambio Aplicado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {registros.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No existen registros en bitácora dentro de su alcance.
                </td>
              </tr>
            ) : (
              registros.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-mono whitespace-nowrap">
                    {formatMexicoCityDateTime(r.resuelto_en, true)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{r.tarea_folio}</p>
                    <p className="text-slate-500">{r.sede_nombre}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold">{r.solicitud_folio}</p>
                    <p className="text-slate-500">{r.solicitud_tipo}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-semibold ${
                        r.dictamen === 'APROBADA'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {r.dictamen}
                    </span>
                    <p className="mt-1 text-slate-800 font-medium">
                      {r.resolutor_nombre_snapshot} ({r.resolutor_rol_snapshot})
                    </p>
                  </td>
                  <td className="px-4 py-3 max-w-xs">{r.motivo_resolucion}</td>
                  <td className="px-4 py-3 font-mono text-[11px]">
                    <p className="text-slate-500">Antes: {r.valor_anterior}</p>
                    <p className="text-slate-900 font-semibold">Nuevo: {r.valor_nuevo}</p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
