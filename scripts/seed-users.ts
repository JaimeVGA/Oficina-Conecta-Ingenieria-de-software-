/**
 * Script de inicialización de usuarios piloto y proyectos base en Supabase.
 * Ejecutar con: npm run seed (requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).
 * Nota: Si no usa Supabase y corre en modo local, el motor local auto-siembra estos mismos registros.
 */
import { createClient } from '@supabase/supabase-js';

export const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? 'OficinaConecta2026!';

export const PILOT_USERS = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    nombre_completo: 'Roberto Salinas',
    correo: 'roberto.salinas@oficinaconecta.mx',
    rol: 'DN' as const,
    sede_id: null,
    departamento_nombre: null,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    nombre_completo: 'Carlos Méndez',
    correo: 'carlos.mendez@oficinaconecta.mx',
    rol: 'GS' as const,
    sede_id: 'PUEBLA' as const,
    departamento_nombre: 'Mantenimiento',
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    nombre_completo: 'Sofía Morales',
    correo: 'sofia.morales@oficinaconecta.mx',
    rol: 'OP' as const,
    sede_id: 'PUEBLA' as const,
    departamento_nombre: 'Mantenimiento',
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    nombre_completo: 'Pedro Ramírez',
    correo: 'pedro.ramirez@oficinaconecta.mx',
    rol: 'OP' as const,
    sede_id: 'PUEBLA' as const,
    departamento_nombre: 'Redes y Soporte',
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    nombre_completo: 'Laura Gómez',
    correo: 'laura.gomez@oficinaconecta.mx',
    rol: 'GS' as const,
    sede_id: 'CDMX' as const,
    departamento_nombre: 'Operaciones',
  },
  {
    id: '10000000-0000-4000-8000-000000000006',
    nombre_completo: 'Miguel Torres',
    correo: 'miguel.torres@oficinaconecta.mx',
    rol: 'OP' as const,
    sede_id: 'CDMX' as const,
    departamento_nombre: 'Operaciones',
  },
  {
    id: '10000000-0000-4000-8000-000000000007',
    nombre_completo: 'Elena Vásquez',
    correo: 'elena.vasquez@oficinaconecta.mx',
    rol: 'GS' as const,
    sede_id: 'OAXACA' as const,
    departamento_nombre: 'Logística',
  },
  {
    id: '10000000-0000-4000-8000-000000000008',
    nombre_completo: 'Diego Cruz',
    correo: 'diego.cruz@oficinaconecta.mx',
    rol: 'OP' as const,
    sede_id: 'OAXACA' as const,
    departamento_nombre: 'Logística',
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.log(
      '[seed-users] Variables NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no definidas. ' +
        'La aplicación utilizará automáticamente el Motor Local Transaccional con los usuarios piloto.'
    );
    return;
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: deptos, error: depErr } = await admin.from('departamentos').select('id, sede_id, nombre');
  if (depErr) throw depErr;

  const findDeptoId = (sedeId: string | null, nombre: string | null) => {
    if (!sedeId || !nombre) return null;
    return deptos?.find((d) => d.sede_id === sedeId && d.nombre === nombre)?.id ?? null;
  };

  for (const u of PILOT_USERS) {
    const { data: existingList } = await admin.auth.admin.listUsers();
    const existing = existingList?.users.find((x) => x.email === u.correo);
    let userId = existing?.id;

    if (!userId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: u.correo,
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
      if (createErr) throw createErr;
      userId = created.user.id;
    }

    const departamentoId = findDeptoId(u.sede_id, u.departamento_nombre);
    const { error: profErr } = await admin.from('perfiles_usuario').upsert({
      id: userId,
      nombre_completo: u.nombre_completo,
      correo: u.correo,
      rol: u.rol,
      sede_id: u.sede_id,
      departamento_id: departamentoId,
      activo: true,
    });
    if (profErr) throw profErr;
    console.log(`[seed-users] Usuario listo: ${u.correo} (${u.rol}${u.sede_id ? ` - ${u.sede_id}` : ''})`);
  }

  const { data: perfiles } = await admin.from('perfiles_usuario').select('id, correo, sede_id, departamento_id');
  const carlos = perfiles?.find((p) => p.correo === 'carlos.mendez@oficinaconecta.mx');
  const sofia = perfiles?.find((p) => p.correo === 'sofia.morales@oficinaconecta.mx');
  const laura = perfiles?.find((p) => p.correo === 'laura.gomez@oficinaconecta.mx');
  const elena = perfiles?.find((p) => p.correo === 'elena.vasquez@oficinaconecta.mx');

  if (carlos && sofia) {
    const { data: proy } = await admin
      .from('proyectos')
      .select('id')
      .eq('sede_id', 'PUEBLA')
      .eq('nombre', 'Modernización Planta Sur')
      .maybeSingle();

    if (!proy) {
      await admin.from('proyectos').insert({
        sede_id: 'PUEBLA',
        departamento_id: carlos.departamento_id,
        nombre: 'Modernización Planta Sur',
        descripcion: 'Proyecto piloto de infraestructura eléctrica y tableros en Puebla.',
        fecha_fin_proyecto: '2026-11-30',
        creado_por: carlos.id,
      });
    }
  }

  if (laura) {
    const { data: proyCdmx } = await admin
      .from('proyectos')
      .select('id')
      .eq('sede_id', 'CDMX')
      .eq('nombre', 'Actualización Red Core CDMX')
      .maybeSingle();
    if (!proyCdmx) {
      await admin.from('proyectos').insert({
        sede_id: 'CDMX',
        departamento_id: laura.departamento_id,
        nombre: 'Actualización Red Core CDMX',
        descripcion: 'Renovación de enlaces y respaldos en sede Ciudad de México.',
        fecha_fin_proyecto: '2026-12-15',
        creado_por: laura.id,
      });
    }
  }

  if (elena) {
    const { data: proyOax } = await admin
      .from('proyectos')
      .select('id')
      .eq('sede_id', 'OAXACA')
      .eq('nombre', 'Supervisión Logística Istmo')
      .maybeSingle();
    if (!proyOax) {
      await admin.from('proyectos').insert({
        sede_id: 'OAXACA',
        departamento_id: elena.departamento_id,
        nombre: 'Supervisión Logística Istmo',
        descripcion: 'Control operativo de rutas y entrega regional en Oaxaca.',
        fecha_fin_proyecto: '2026-12-10',
        creado_por: elena.id,
      });
    }
  }

  console.log('[seed-users] Seed en Supabase completado.');
}

const isCliEntry = process.argv[1]?.includes('seed-users');
if (isCliEntry) {
  main().catch((err) => {
    console.error('[seed-users] Error:', err);
    process.exit(1);
  });
}
