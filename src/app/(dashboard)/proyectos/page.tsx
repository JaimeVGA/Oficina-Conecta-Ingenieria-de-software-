import { getCatalogos, getCurrentActor, listProyectos } from '@/lib/backend/adapter';
import { ProyectosClient } from '@/components/proyectos/ProyectosClient';

export const dynamic = 'force-dynamic';

export default async function ProyectosPage() {
  const actor = await getCurrentActor();
  if (!actor) return null;

  const [proyectos, catalogos] = await Promise.all([listProyectos(actor), getCatalogos(actor)]);

  return (
    <ProyectosClient
      actor={actor}
      initialProyectos={proyectos}
      initialDepartamentos={catalogos.departamentos}
      sedes={catalogos.sedes}
    />
  );
}
