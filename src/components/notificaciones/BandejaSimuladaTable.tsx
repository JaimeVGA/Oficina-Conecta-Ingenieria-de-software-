import { AlertTriangle, Mail } from 'lucide-react';
import { formatMexicoCityDateTime } from '@/lib/dates/mexicoCity';
import type { CorreoSimulado, EstadoAviso } from '@/lib/supabase/types';

const ESTADO_STYLE: Record<EstadoAviso, string> = {
  EMITIDO: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  PROGRAMADO: 'bg-sky-100 text-sky-800 border-sky-200',
  CANCELADO: 'bg-slate-200 text-slate-600 border-slate-300 line-through',
};

export function BandejaSimuladaTable({ correos }: { correos: CorreoSimulado[] }) {
  if (correos.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
        No hay avisos simulados en el alcance de su usuario.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {correos.map((c) => (
        <article
          key={c.id}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200 text-[11px] font-bold">
                <Mail className="w-3 h-3" /> SIMULADO
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] font-mono font-semibold">
                {c.motivo_aviso}
              </span>
              {c.combina_recordatorio && (
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[11px] font-semibold">
                  Combinado +{c.combina_recordatorio}
                </span>
              )}
              {c.es_urgente_menor_24h && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-800 text-[11px] font-bold">
                  <AlertTriangle className="w-3 h-3" /> PLAZO &lt; 24H URGENTE
                </span>
              )}
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${ESTADO_STYLE[c.estado]}`}>
                {c.estado}
              </span>
            </div>

            <span className="text-xs text-slate-500 font-mono">
              Previsto: {formatMexicoCityDateTime(c.fecha_hora_prevista)} MX
              {c.emitido_en ? ` · Emitido: ${formatMexicoCityDateTime(c.emitido_en)} MX` : ''}
            </span>
          </div>

          <h4 className="text-sm font-bold text-slate-900">{c.asunto}</h4>
          <p className="text-xs text-slate-700 leading-relaxed">{c.contenido}</p>

          <div className="pt-1 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
            <span>
              <strong>Destinatario:</strong> {c.destinatario}
            </span>
            <span>
              <strong>Sede:</strong> {c.sede_nombre ?? c.sede_id}
            </span>
            {c.tarea_folio && (
              <span>
                <strong>Tarea:</strong> <code>{c.tarea_folio}</code>
              </span>
            )}
            {c.solicitud_folio && (
              <span>
                <strong>Solicitud:</strong> <code>{c.solicitud_folio}</code>
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
