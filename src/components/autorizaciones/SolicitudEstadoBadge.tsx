import type { EstadoSolicitud } from '@/lib/supabase/types';

const BADGE_MAP: Record<EstadoSolicitud, { label: string; classes: string }> = {
  PENDIENTE_REVISION: {
    label: 'PENDIENTE_REVISION',
    classes: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  APROBADA: {
    label: 'APROBADA',
    classes: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  RECHAZADA: {
    label: 'RECHAZADA',
    classes: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  INVALIDADA_POR_DESACTUALIZACION: {
    label: 'INVALIDADA_POR_DESACTUALIZACION',
    classes: 'bg-slate-200 text-slate-800 border-slate-300',
  },
};

export function SolicitudEstadoBadge({ estado }: { estado: EstadoSolicitud }) {
  const cfg = BADGE_MAP[estado];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}
