import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  ShieldAlert,
} from 'lucide-react';
import {
  getCurrentActor,
  listCorreosSimulados,
  listSolicitudes,
  listTareas,
  obtenerMetricasDashboard,
} from '@/lib/backend/adapter';
import { ExportIcsButton } from '@/components/tareas/ExportIcsButton';

export const dynamic = 'force-dynamic';

export default async function DashboardHomePage() {
  const actor = await getCurrentActor();
  if (!actor) return null;

  const [metricas, tareas, solicitudes, correos] = await Promise.all([
    obtenerMetricasDashboard(actor),
    listTareas(actor),
    listSolicitudes(actor),
    listCorreosSimulados(actor),
  ]);

  const totalTareas = metricas.reduce((acc, m) => acc + m.total_tareas, 0);
  const totalPendientes = metricas.reduce((acc, m) => acc + m.pendientes, 0);
  const totalRetrasadas = metricas.reduce((acc, m) => acc + m.retrasadas, 0);
  const totalCompletadas = metricas.reduce((acc, m) => acc + m.completadas, 0);
  const solPendientes = solicitudes.filter((s) => s.estado === 'PENDIENTE_REVISION').length;
  const avisosEmitidos = correos.filter((c) => c.estado === 'EMITIDO').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {actor.rol === 'DN'
              ? 'Tablero Nacional de Operaciones (3 Sedes Piloto)'
              : actor.rol === 'GS'
                ? 'Tablero de Gerencia de Sede'
                : 'Mis Tareas Asignadas'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Seguimiento centralizado, autorizaciones atómicas y control documental · Línea Base v1.0 (FUE-011)
          </p>
        </div>

        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
          <ExportIcsButton label="Exportar Calendario (.ics)" />
          <Link
            href="/tareas"
            className="flex-1 sm:flex-initial min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
          >
            Ver Tareas <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPIs Consolidados */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-brand-600" /> Tareas Visibles
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalTareas}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Pendientes / Activas</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{totalPendientes}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" /> Retrasadas
          </p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{totalRetrasadas}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4 text-indigo-600" /> Autorizaciones Pend.
          </p>
          <p className="text-2xl font-bold text-indigo-700 mt-1">{solPendientes}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Completadas
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{totalCompletadas}</p>
        </div>
      </div>

      {/* Desglose por Sede */}
      <div className="grid md:grid-cols-3 gap-4">
        {metricas.map((m) => (
          <div key={m.sede_id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Building2 className="w-4 h-4 text-brand-600" />
                <span>{m.sede_nombre}</span>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {m.sede_id}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 rounded-lg p-2.5 text-xs">
              <div>
                <p className="text-slate-500">Pendientes</p>
                <p className="font-bold text-slate-900 text-base">{m.pendientes}</p>
              </div>
              <div>
                <p className="text-slate-500">Retrasadas</p>
                <p className="font-bold text-rose-600 text-base">{m.retrasadas}</p>
              </div>
              <div>
                <p className="text-slate-500">Avance Prom.</p>
                <p className="font-bold text-emerald-700 text-base">{m.avance_promedio}%</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Solicitudes pendientes: {m.solicitudes_pendientes}</span>
              <ExportIcsButton sedeId={m.sede_id} label=".ics sede" compact />
            </div>
          </div>
        ))}
      </div>

      {/* Guía del Recorrido Completo End-to-End */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Recorrido Completo Exigido (FUE-001 / FUE-011)
          </h2>
          <span className="text-xs text-slate-400">
            Avisos emitidos en bandeja: {avisosEmitidos} · Tareas activas: {tareas.length}
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
          {[
            { step: '1. Asignar Tarea', desc: 'GS crea tarea (seq=0) y dispara aviso.', href: '/tareas' },
            { step: '2. Solicitar Prórroga', desc: 'OP/GS usa borrador + UUID idempotente.', href: '/tareas' },
            { step: '3. Resolver Atómica', desc: 'GS (≤5d) o DN (>5d) con SELECT FOR UPDATE.', href: '/autorizaciones' },
            { step: '4. Bitácora Append-Only', desc: 'Registro no borrable (SQL 42501).', href: '/bitacora' },
            { step: '5. Aviso Simulado', desc: 'Resolución y recordatorios 48h/24h.', href: '/notificaciones' },
            { step: '6. Exportar .ics', desc: 'UID fijo + SEQUENCE incremental.', href: '/tareas' },
          ].map((item) => (
            <Link
              key={item.step}
              href={item.href}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-3 transition-colors block"
            >
              <p className="font-semibold text-white">{item.step}</p>
              <p className="text-[11px] text-slate-300 mt-1">{item.desc}</p>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300">
          <Link href="/notificaciones" className="inline-flex items-center gap-1 hover:text-white underline">
            <Bell className="w-3.5 h-3.5" /> Abrir Bandeja de Correos Simulados
          </Link>
          <Link href="/bitacora" className="inline-flex items-center gap-1 hover:text-white underline">
            <ShieldAlert className="w-3.5 h-3.5" /> Auditar Bitácora de Autorizaciones
          </Link>
          <span className="inline-flex items-center gap-1 text-slate-400">
            <CalendarPlus className="w-3.5 h-3.5" /> Exportación estándar RFC 5545 activa
          </span>
        </div>
      </div>
    </div>
  );
}
