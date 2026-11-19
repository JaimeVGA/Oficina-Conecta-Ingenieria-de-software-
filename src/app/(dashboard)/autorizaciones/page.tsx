import { getCurrentActor, listSolicitudes } from '@/lib/backend/adapter';
import { AutorizacionesClient } from '@/components/autorizaciones/AutorizacionesClient';

export const dynamic = 'force-dynamic';

export default async function AutorizacionesPage() {
  const actor = await getCurrentActor();
  if (!actor) return null;
  const solicitudes = await listSolicitudes(actor);

  return <AutorizacionesClient actor={actor} initialSolicitudes={solicitudes} />;
}
