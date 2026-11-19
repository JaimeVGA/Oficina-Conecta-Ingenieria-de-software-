import { getCurrentActor, listCorreosSimulados } from '@/lib/backend/adapter';
import { NotificacionesClient } from '@/components/notificaciones/NotificacionesClient';

export const dynamic = 'force-dynamic';

export default async function NotificacionesPage() {
  const actor = await getCurrentActor();
  if (!actor) return null;
  const correos = await listCorreosSimulados(actor);

  return <NotificacionesClient actorRol={actor.rol} initialCorreos={correos} />;
}
