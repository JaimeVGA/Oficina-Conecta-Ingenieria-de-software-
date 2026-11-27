'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { formatMexicoCityDateTime } from '@/lib/dates/mexicoCity';
import type { BitacoraEnriquecida } from '@/lib/supabase/types';

export function BitacoraClient({ registros }: { registros: BitacoraEnriquecida[] }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-600" />
            Bitácora de Autorizaciones
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Historial inmutable de resoluciones y cambios autorizados sobre tareas.
          </p>
        </div>
      </div>

      {/* Tarjetas de Bitácora (Móvil) */}
      <div className="md:hidden space-y-3">
        {registros.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
            No existen registros en bitácora dentro de su alcance.
          </div>
        ) : (
          registros.map((r) => (
            <article key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded font-mono font-semibold ${
                      r.dictamen === 'APROBADA' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {r.dictamen}
                  </span>
                  <span className="font-mono font-semibold text-slate-900">{r.solicitud_folio}</span>
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  {formatMexicoCityDateTime(r.resuelto_en, true)}
                </span>
              </div>

              <div>
                <p className="font-semibold text-slate-900">
                  {r.tarea_folio} · {r.sede_nombre}
                </p>
                <p className="text-slate-600">
                  Resolutor: {r.resolutor_nombre_snapshot} ({r.resolutor_rol_snapshot}) · {r.solicitud_tipo}
                </p>
              </div>

              <p className="text-slate-700 break-words">
                <strong>Motivo:</strong> {r.motivo_resolucion}
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-[11px] space-y-1">
                <p className="text-slate-500 break-words">Antes: {r.valor_anterior}</p>
                <p className="text-slate-900 font-semibold break-words">Nuevo: {r.valor_nuevo}</p>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Tabla de Bitácora (Tablet y Escritorio) */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-x-auto">
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
