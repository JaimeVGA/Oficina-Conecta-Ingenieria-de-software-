import { getCatalogos, getCurrentActor, listProyectos, listTareas } from '@/lib/backend/adapter';
import { TareasListClient } from '@/components/tareas/TareasListClient';

export const dynamic = 'force-dynamic';

export default async function TareasPage() {
  const actor = await getCurrentActor();
  if (!actor) return null;

  const [tareas, proyectos, catalogos] = await Promise.all([
    listTareas(actor),
    listProyectos(actor),
    getCatalogos(actor),
  ]);

  return (
    <TareasListClient
      actor={actor}
      initialTareas={tareas}
      proyectos={proyectos}
      departamentos={catalogos.departamentos}
      usuarios={catalogos.usuarios}
      sedes={catalogos.sedes}
    />
  );
}
