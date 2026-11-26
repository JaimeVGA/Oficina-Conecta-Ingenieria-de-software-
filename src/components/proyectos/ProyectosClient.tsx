'use client';

import React, { useState } from 'react';
import { Building2, FolderPlus, Layers, Lock } from 'lucide-react';
import type { Departamento, PerfilUsuario, Proyecto, Sede } from '@/lib/supabase/types';

export function ProyectosClient({
  actor,
  initialProyectos,
  initialDepartamentos,
  sedes,
}: {
  actor: PerfilUsuario;
  initialProyectos: Proyecto[];
  initialDepartamentos: Departamento[];
  sedes: Sede[];
}) {
  const [proyectos, setProyectos] = useState(initialProyectos);
  const [departamentos, setDepartamentos] = useState(initialDepartamentos);
  const [newDeptoName, setNewDeptoName] = useState('');
  const [nombreProyecto, setNombreProyecto] = useState('');
  const [deptoId, setDeptoId] = useState(initialDepartamentos[0]?.id ?? '');
  const [fechaFin, setFechaFin] = useState('2026-12-20');
  const [descripcion, setDescripcion] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const canManage = actor.rol === 'GS';

  const reload = async () => {
    const res = await fetch('/api/proyectos');
    const json = (await res.json()) as { proyectos?: Proyecto[]; departamentos?: Departamento[] };
    if (json.proyectos) setProyectos(json.proyectos);
    if (json.departamentos) setDepartamentos(json.departamentos);
  };

  const handleCreateDepto = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = await fetch('/api/proyectos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'departamento', nombre: newDeptoName }),
    });
    const json = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !json.ok) {
      setFeedback(json.message ?? 'Error al crear departamento.');
      return;
    }
    setNewDeptoName('');
    setFeedback('Departamento creado en su sede.');
    await reload();
  };

  const handleCreateProyecto = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = await fetch('/api/proyectos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'proyecto',
        departamento_id: deptoId,
        nombre: nombreProyecto,
        descripcion,
        fecha_fin_proyecto: fechaFin,
      }),
    });
    const json = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !json.ok) {
      setFeedback(json.message ?? 'Error al crear proyecto.');
      return;
    }
    setNombreProyecto('');
    setDescripcion('');
    setFeedback('Proyecto creado en su sede.');
    await reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Sedes Piloto, Departamentos y Proyectos</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Jerarquía cerrada (DAT-001): Sede → Departamento → Proyectos → Tareas. Cada proyecto pertenece a una única sede.
        </p>
      </div>

      {feedback && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5 text-xs text-indigo-900 font-medium">
          {feedback}
        </div>
      )}

      {!canManage && (
        <div className="bg-slate-100 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-slate-700 flex items-center gap-2">
          <Lock className="w-4 h-4 text-slate-500" />
          Modo solo lectura ({actor.rol}): únicamente la Gerencia de Sede administra departamentos y proyectos locales
          (PER-002 / PER-003).
        </div>
      )}

      {/* Departamentos */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600" /> Departamentos Visibles ({departamentos.length})
          </h2>

          {canManage && (
            <form onSubmit={handleCreateDepto} className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                required
                value={newDeptoName}
                onChange={(e) => setNewDeptoName(e.target.value)}
                placeholder="Nuevo departamento en mi sede"
                className="w-full sm:w-56 min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
              <button
                type="submit"
                className="min-h-[40px] inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
              >
                Agregar
              </button>
            </form>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {departamentos.map((d) => {
            const sede = sedes.find((s) => s.id === d.sede_id);
            return (
              <div key={d.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <p className="font-semibold text-sm text-slate-900">{d.nombre}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <Building2 className="w-3.5 h-3.5" /> {sede?.nombre ?? d.sede_id}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Crear Proyecto (solo GS) */}
      {canManage && (
        <form onSubmit={handleCreateProyecto} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-brand-600" /> Crear Proyecto en Mi Sede ({actor.sede_id})
          </h2>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del proyecto</label>
              <input
                type="text"
                required
                value={nombreProyecto}
                onChange={(e) => setNombreProyecto(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Departamento</label>
              <select
                required
                value={deptoId}
                onChange={(e) => setDeptoId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha fin proyecto (DATE)</label>
              <input
                type="date"
                required
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
          >
            Guardar Proyecto
          </button>
        </form>
      )}

      {/* Tarjetas de Proyectos (Móvil) */}
      <div className="md:hidden space-y-3">
        {proyectos.map((p) => {
          const depto = departamentos.find((d) => d.id === p.departamento_id);
          const sede = sedes.find((s) => s.id === p.sede_id);
          return (
            <article key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-sm text-slate-900 break-words">{p.nombre}</h3>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-semibold shrink-0">
                  {p.estado}
                </span>
              </div>
              {p.descripcion && <p className="text-xs text-slate-500 break-words">{p.descripcion}</p>}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 rounded-lg p-2.5">
                <div>
                  <p className="text-[11px] text-slate-500">Sede / Depto</p>
                  <p className="font-medium text-slate-900 break-words">
                    {sede?.nombre ?? p.sede_id} · {depto?.nombre ?? '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Fecha Fin</p>
                  <p className="font-mono font-semibold text-slate-900">{p.fecha_fin_proyecto}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Listado de Proyectos (Tablet y Escritorio) */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
            <tr>
              <th className="px-4 py-3">Proyecto</th>
              <th className="px-4 py-3">Sede</th>
              <th className="px-4 py-3">Departamento</th>
              <th className="px-4 py-3">Fecha Fin</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {proyectos.map((p) => {
              const depto = departamentos.find((d) => d.id === p.departamento_id);
              const sede = sedes.find((s) => s.id === p.sede_id);
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{p.nombre}</p>
                    <p className="text-slate-500">{p.descripcion}</p>
                  </td>
                  <td className="px-4 py-3">{sede?.nombre ?? p.sede_id}</td>
                  <td className="px-4 py-3">{depto?.nombre ?? '-'}</td>
                  <td className="px-4 py-3 font-mono">{p.fecha_fin_proyecto}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                      {p.estado}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
