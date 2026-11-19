import { getCatalogos, getCurrentActor } from '@/lib/backend/adapter';
import { PreferenciasClient } from '@/components/preferences/PreferenciasClient';

export const dynamic = 'force-dynamic';

export default async function PreferenciasPage() {
  const actor = await getCurrentActor();
  if (!actor) return null;

  const catalogos = await getCatalogos(actor);

  return (
    <PreferenciasClient
      actor={actor}
      usuariosVisibles={catalogos.usuarios}
      departamentos={catalogos.departamentos}
      sedes={catalogos.sedes}
    />
  );
}
