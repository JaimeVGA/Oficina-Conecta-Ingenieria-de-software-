'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, Search } from 'lucide-react';
import { CrearTareaModal } from '@/components/tareas/CrearTareaModal';
import { ExportIcsButton } from '@/components/tareas/ExportIcsButton';
import { useSessionGuard } from '@/components/session/SessionInactivityGuard';
import { isNetworkError } from '@/lib/offline/client';
import { formatMexicoCityDateTime } from '@/lib/dates/mexicoCity';
import type {
  Departamento,
  PerfilUsuario,
  Proyecto,
  Sede,
  SedeId,
  TareaEnriquecida,
} from '@/lib/supabase/types';

export function TareasListClient({
  actor,
  initialTareas,
  proyectos,
  departamentos,
  usuarios,
  sedes,
}: {
  actor: PerfilUsuario;
  initialTareas: TareaEnriquecida[];
  proyectos: Proyecto[];
  departamentos: Departamento[];
  usuarios: PerfilUsuario[];
  sedes: Sede[];
}) {
  const { effectiveOnline, reportNetworkFailure } = useSessionGuard();
  const [tareas, setTareas] = useState(initialTareas);
  const [search, setSearch] = useState('');
  const [sedeFilter, setSedeFilter] = useState<string>('TODAS');
  const [estadoFilter, setEstadoFilter] = useState<string>('TODOS');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const operativosSede = useMemo(
    () => usuarios.filter((u) => u.rol === 'OP' && u.sede_id === actor.sede_id),
    [usuarios, actor.sede_id]
  );

  const filtered = useMemo(() => {
    return tareas.filter((t) => {
      if (sedeFilter !== 'TODAS' && t.sede_id !== sedeFilter) return false;
      if (estadoFilter !== 'TODOS' && t.estado !== estadoFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !t.folio.toLowerCase().includes(q) &&
          !t.titulo.toLowerCase().includes(q) &&
          !t.proyecto_nombre.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [tareas, sedeFilter, estadoFilter, search]);

  const refresh = async () => {
    if (!effectiveOnline) return;
    try {
      const res = await fetch('/api/tareas');
      const json = (await res.json()) as { tareas?: TareaEnriquecida[] };
      if (json.tareas) setTareas(json.tareas);
    } catch (err) {
      if (isNetworkError(err)) {
        reportNetworkFailure();
      }
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gestión y Seguimiento de Tareas</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {actor.rol === 'OP'
              ? 'Visualizando tus tareas asignadas.'
              : actor.rol === 'GS'
                ? `Administración de tareas en tu sede (${actor.sede_id}).`
                : 'Consulta global de tareas en todas las sedes.'}
          </p>
        </div>

        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
          <ExportIcsButton
            sedeId={sedeFilter !== 'TODAS' ? (sedeFilter as SedeId) : undefined}
            label="Exportar .ics listado"
          />
          {actor.rol === 'GS' && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-1.5 flex-1 sm:flex-initial min-h-[42px] px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" /> Nueva Tarea
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por folio, título o proyecto..."
            className="w-full pl-9 pr-3 py-2 min-h-[40px] rounded-lg border border-slate-300 text-xs"
          />
        </div>

        {actor.rol === 'DN' && (
          <select
            value={sedeFilter}
            onChange={(e) => setSedeFilter(e.target.value)}
            className="w-full sm:w-auto min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
          >
            <option value="TODAS">Todas las sedes</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        )}

        <select
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          className="w-full sm:w-auto min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
        >
          <option value="TODOS">Todos los estados</option>
          <option value="ASIGNADA">ASIGNADA</option>
          <option value="EN_PROCESO">EN_PROCESO</option>
          <option value="COMPLETADA">COMPLETADA</option>
          <option value="CANCELADA">CANCELADA</option>
        </select>
      </div>

      {/* Tarjetas de tareas (Móvil) */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
            No se encontraron tareas con los filtros seleccionados.
          </div>
        ) : (
          filtered.map((t) => (
            <article key={t.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono font-bold text-xs text-brand-700">{t.folio}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] font-semibold text-slate-800">
                    {t.estado} ({t.porcentaje_avance}%)
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 break-words">{t.titulo}</h3>
                <p className="text-xs text-slate-500 mt-0.5 break-words">
                  {t.sede_nombre} · {t.departamento_nombre} · {t.proyecto_nombre}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 rounded-lg p-2.5">
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500">Responsable</p>
                  <p className="font-medium text-slate-900 truncate">{t.responsable_nombre}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500">Fecha límite (MX)</p>
                  <p className="font-mono text-[11px] font-semibold text-slate-900 break-words">
                    {formatMexicoCityDateTime(t.fecha_limite)}
                  </p>
                </div>
              </div>

              <Link
                href={`/tareas/${t.id}`}
                className="w-full min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Abrir Tarea <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </article>
          ))
        )}
      </div>

      {/* Tabla de tareas (Tablet y Escritorio) */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
            <tr>
              <th className="px-4 py-3">Folio / Título</th>
              <th className="px-4 py-3">Sede / Proyecto</th>
              <th className="px-4 py-3">Responsable</th>
              <th className="px-4 py-3">Fecha Límite (MX)</th>
              <th className="px-4 py-3">Estado / Avance</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No se encontraron tareas con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-brand-700">{t.folio}</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{t.titulo}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{t.sede_nombre}</p>
                    <p className="text-slate-500">
                      {t.departamento_nombre} · {t.proyecto_nombre}
                    </p>
                  </td>
                  <td className="px-4 py-3">{t.responsable_nombre}</td>
                  <td className="px-4 py-3 font-mono">{formatMexicoCityDateTime(t.fecha_limite)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-semibold text-slate-800">
                      {t.estado}
                    </span>
                    <span className="ml-1.5 text-slate-600 font-semibold">{t.porcentaje_avance}%</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link
                      href={`/tareas/${t.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800"
                    >
                      Abrir <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <CrearTareaModal
          proyectos={proyectos}
          departamentos={departamentos}
          operativos={operativosSede}
          onClose={() => setShowCreateModal(false)}
          onCreated={refresh}
        />
      )}
    </div>
  );
}
