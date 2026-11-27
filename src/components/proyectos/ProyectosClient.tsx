'use client';

import React, { useState } from 'react';
import { AlertCircle, Building2, CheckCircle2, FolderPlus, Layers, Lock, WifiOff } from 'lucide-react';
import { useIdempotentDraft } from '@/hooks/useIdempotentDraft';
import { useSessionGuard } from '@/components/session/SessionInactivityGuard';
import { isNetworkError, OFFLINE_ERROR_MESSAGE } from '@/lib/offline/client';
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
  const { effectiveOnline, justReconnected, reportNetworkFailure } = useSessionGuard();

  const [proyectos, setProyectos] = useState(initialProyectos);
  const [departamentos, setDepartamentos] = useState(initialDepartamentos);
  const deptoDraft = useIdempotentDraft('oc_draft_nuevo_depto', { nombre: '' });
  const proyectoDraft = useIdempotentDraft('oc_draft_nuevo_proyecto', {
    nombre: '',
    departamentoId: initialDepartamentos[0]?.id ?? '',
    fechaFin: '2026-12-20',
    descripcion: '',
  });
  const [savingDepto, setSavingDepto] = useState(false);
  const [savingProyecto, setSavingProyecto] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canManage = actor.rol === 'GS';

  const reload = async () => {
    if (!effectiveOnline) return;
    try {
      const res = await fetch('/api/proyectos');
      const json = (await res.json()) as { proyectos?: Proyecto[]; departamentos?: Departamento[] };
      if (json.proyectos) setProyectos(json.proyectos);
      if (json.departamentos) setDepartamentos(json.departamentos);
    } catch (err) {
      if (isNetworkError(err)) {
        reportNetworkFailure();
      }
    }
  };

  const handleCreateDepto = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!effectiveOnline) {
      setFeedback({ type: 'error', text: OFFLINE_ERROR_MESSAGE });
      return;
    }

    setSavingDepto(true);
    try {
      const res = await fetch('/api/proyectos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'departamento', nombre: deptoDraft.data.nombre }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setFeedback({ type: 'error', text: json.message ?? 'Error al crear departamento.' });
        return;
      }
      deptoDraft.updateDraft({ nombre: '' });
      deptoDraft.clearDraft();
      setFeedback({ type: 'success', text: 'Departamento creado en su sede.' });
      await reload();
    } catch {
      reportNetworkFailure();
      setFeedback({ type: 'error', text: OFFLINE_ERROR_MESSAGE });
    } finally {
      setSavingDepto(false);
    }
  };

  const handleCreateProyecto = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!effectiveOnline) {
      setFeedback({ type: 'error', text: OFFLINE_ERROR_MESSAGE });
      return;
    }

    setSavingProyecto(true);
    try {
      const res = await fetch('/api/proyectos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'proyecto',
          departamento_id: proyectoDraft.data.departamentoId,
          nombre: proyectoDraft.data.nombre,
          descripcion: proyectoDraft.data.descripcion,
          fecha_fin_proyecto: proyectoDraft.data.fechaFin,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setFeedback({ type: 'error', text: json.message ?? 'Error al crear proyecto.' });
        return;
      }
      proyectoDraft.updateDraft((prev) => ({
        ...prev,
        nombre: '',
        descripcion: '',
      }));
      proyectoDraft.clearDraft();
      setFeedback({ type: 'success', text: 'Proyecto creado en su sede.' });
      await reload();
    } catch {
      reportNetworkFailure();
      setFeedback({ type: 'error', text: OFFLINE_ERROR_MESSAGE });
    } finally {
      setSavingProyecto(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Sedes, Departamentos y Proyectos</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Jerarquía operativa: Sede → Departamento → Proyectos → Tareas. Cada proyecto pertenece a una única sede.
        </p>
      </div>

      {canManage && (deptoDraft.hasRestoredDraft || proyectoDraft.hasRestoredDraft) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-900 font-medium">
          Se restauró tu borrador guardado localmente.
        </div>
      )}

      {canManage && justReconnected && (deptoDraft.isDirty || proyectoDraft.isDirty) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-xs text-emerald-900 font-medium">
          Conexión restablecida. Revise su información antes de guardar (no se realizó envío automático).
        </div>
      )}

      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`rounded-lg px-4 py-2.5 text-xs font-medium flex items-center gap-2 border ${
            feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {feedback.type === 'error' ? (
            effectiveOnline ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <WifiOff className="w-4 h-4 shrink-0" />
            )
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {!canManage && (
        <div className="bg-slate-100 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-slate-700 flex items-center gap-2">
          <Lock className="w-4 h-4 text-slate-500" />
          Modo solo lectura ({actor.rol}): únicamente la Gerencia de Sede administra departamentos y proyectos locales.
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
                value={deptoDraft.data.nombre}
                onChange={(e) => deptoDraft.updateDraft({ nombre: e.target.value })}
                placeholder="Nuevo departamento en mi sede"
                className="w-full sm:w-56 min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
              <button
                type="submit"
                disabled={savingDepto}
                className="min-h-[40px] inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold disabled:opacity-60"
              >
                {savingDepto ? 'Guardando...' : 'Agregar'}
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
                value={proyectoDraft.data.nombre}
                onChange={(e) => proyectoDraft.updateDraft((prev) => ({ ...prev, nombre: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Departamento</label>
              <select
                required
                value={proyectoDraft.data.departamentoId}
                onChange={(e) => proyectoDraft.updateDraft((prev) => ({ ...prev, departamentoId: e.target.value }))}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha fin del proyecto</label>
              <input
                type="date"
                required
                value={proyectoDraft.data.fechaFin}
                onChange={(e) => proyectoDraft.updateDraft((prev) => ({ ...prev, fechaFin: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción</label>
            <input
              type="text"
              value={proyectoDraft.data.descripcion}
              onChange={(e) => proyectoDraft.updateDraft((prev) => ({ ...prev, descripcion: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={savingProyecto}
            className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-semibold"
          >
            {savingProyecto ? 'Guardando...' : 'Guardar Proyecto'}
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
