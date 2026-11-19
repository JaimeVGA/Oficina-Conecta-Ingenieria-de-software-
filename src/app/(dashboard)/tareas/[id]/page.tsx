import Link from 'next/link';
import {
  getCurrentActor,
  getTareaById,
  listBitacora,
  listDocumentosTarea,
  listSolicitudes,
} from '@/lib/backend/adapter';
import { TareaDetalleClient } from '@/components/tareas/TareaDetalleClient';

export const dynamic = 'force-dynamic';

export default async function TareaDetallePage({ params }: { params: { id: string } }) {
  const actor = await getCurrentActor();
  if (!actor) return null;

  const tarea = await getTareaById(actor, params.id);
  if (!tarea) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-6 space-y-3">
        <h1 className="text-base font-bold text-red-800">ERR-001: Acceso denegado o tarea no encontrada</h1>
        <p className="text-xs text-slate-600">
          La tarea solicitada pertenece a otro responsable o a una sede fuera de su alcance permitido.
        </p>
        <Link href="/tareas" className="inline-block text-xs font-semibold text-brand-700 underline">
          Volver a mis tareas
        </Link>
      </div>
    );
  }

  const [solicitudes, bitacora, documentos] = await Promise.all([
    listSolicitudes(actor),
    listBitacora(actor, tarea.id),
    listDocumentosTarea(actor, tarea.id),
  ]);

  return (
    <TareaDetalleClient
      actor={actor}
      initialTarea={tarea}
      initialSolicitudes={solicitudes.filter((s) => s.tarea_id === tarea.id)}
      initialBitacora={bitacora}
      initialDocumentos={documentos ?? []}
    />
  );
}
