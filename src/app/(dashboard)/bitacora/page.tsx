import { getCurrentActor, listBitacora } from '@/lib/backend/adapter';
import { BitacoraClient } from '@/components/bitacora/BitacoraClient';

export const dynamic = 'force-dynamic';

export default async function BitacoraPage() {
  const actor = await getCurrentActor();
  if (!actor) return null;
  const registros = await listBitacora(actor);

  return <BitacoraClient registros={registros} />;
}
