import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalTransactionalEngine } from '@/lib/backend/localEngine';

const tempDirs: string[] = [];

function createIsolatedEngine() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-test-'));
  tempDirs.push(dir);
  const dbPath = path.join(dir, 'db.json');
  const storageDir = path.join(dir, 'storage');
  return new LocalTransactionalEngine(dbPath, storageDir);
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('Motor Transaccional Oficina Conecta — CPs Críticos', () => {
  it('CP-001: rechaza PUT/PATCH/DELETE sobre bitácora con ERR-005 y SQLSTATE 42501', () => {
    const engine = createIsolatedEngine();
    for (const op of ['PUT', 'PATCH', 'DELETE'] as const) {
      const res = engine.rechazarMutacionBitacora(op);
      expect(res.ok).toBe(false);
      expect(res.http_status).toBe(403);
      expect(res.error_code).toBe('ERR-005');
      expect(res.sqlstate).toBe('42501');
    }
  });

  it('CP-002: concurrencia bloquea segunda resolución (ERR-004) y fallo en bitácora hace ROLLBACK total', async () => {
    const engine = createIsolatedEngine();
    const gsPuebla = engine.authenticate('carlos.mendez@oficinaconecta.mx', 'OficinaConecta2026!')!;
    const opPuebla = engine.authenticate('sofia.morales@oficinaconecta.mx', 'OficinaConecta2026!')!;
    const dn = engine.authenticate('roberto.salinas@oficinaconecta.mx', 'OficinaConecta2026!')!;

    const tareas = engine.listTareas(opPuebla);
    const tar = tareas[0]!;
    const propIso = new Date(Date.parse(tar.fecha_limite) + 3 * 86_400_000).toISOString();

    const sol1 = await engine.crearSolicitudAutorizacion(opPuebla, {
      tarea_id: tar.id,
      tipo: 'PRORROGA_FECHA',
      motivo_solicitud: 'Corte programado CFE',
      idempotency_key: crypto.randomUUID(),
      fecha_propuesta: propIso,
    });
    expect(sol1.ok).toBe(true);
    const solId1 = String(sol1.data?.solicitud_id);

    // Concurrencia simultánea (2 intentos con distintos UUIDs)
    const [r1, r2] = await Promise.all([
      engine.resolverSolicitudAutorizacion(gsPuebla, {
        solicitud_id: solId1,
        dictamen: 'APROBADA',
        motivo_resolucion: 'Autorizado por GS',
        idempotency_key: crypto.randomUUID(),
      }),
      engine.resolverSolicitudAutorizacion(gsPuebla, {
        solicitud_id: solId1,
        dictamen: 'RECHAZADA',
        motivo_resolucion: 'Segundo intento concurrente',
        idempotency_key: crypto.randomUUID(),
      }),
    ]);

    expect([r1.ok, r2.ok].filter(Boolean)).toHaveLength(1);
    const loser = r1.ok ? r2 : r1;
    expect(loser.error_code).toBe('ERR-004');
    expect(loser.http_status).toBe(409);
    expect(loser.message).toContain('Carlos Méndez');

    // Fallo provocado en bitácora sobre segunda solicitud -> ROLLBACK total
    const tarUpdated = engine.getTareaById(opPuebla, tar.id)!;
    const sol2 = await engine.crearSolicitudAutorizacion(opPuebla, {
      tarea_id: tar.id,
      tipo: 'CAMBIO_ALCANCE',
      motivo_solicitud: 'Ajuste requerido de pruebas',
      idempotency_key: crypto.randomUUID(),
      alcance_propuesto: 'Nuevo alcance que no debe aplicarse si falla bitácora',
    });
    const solId2 = String(sol2.data?.solicitud_id);
    const bitBefore = engine.listBitacora(dn).length;

    const failRes = await engine.resolverSolicitudAutorizacion(dn, {
      solicitud_id: solId2,
      dictamen: 'APROBADA',
      motivo_resolucion: 'Intento con fallo provocado CP-002',
      idempotency_key: crypto.randomUUID(),
      simular_fallo_bitacora: true,
    });

    expect(failRes.ok).toBe(false);
    expect(failRes.http_status).toBe(500);
    expect(failRes.error_code).toBe('ERR-005');

    const tarAfterFail = engine.getTareaById(opPuebla, tar.id)!;
    expect(tarAfterFail.alcance).toBe(tarUpdated.alcance);
    expect(tarAfterFail.sequence_ics).toBe(tarUpdated.sequence_ics);
    expect(engine.listBitacora(dn).length).toBe(bitBefore);
    const sol2After = engine.listSolicitudes(dn).find((s) => s.id === solId2)!;
    expect(sol2After.estado).toBe('PENDIENTE_REVISION');
  });

  it('CP-003/CP-004: idempotencia por UUID e invalidación por cambio de fecha conservando ambos motivos', async () => {
    const engine = createIsolatedEngine();
    const gsPuebla = engine.authenticate('carlos.mendez@oficinaconecta.mx', 'OficinaConecta2026!')!;
    const opPuebla = engine.authenticate('sofia.morales@oficinaconecta.mx', 'OficinaConecta2026!')!;
    const tar = engine.listTareas(opPuebla)[0]!;
    const uuidK1 = crypto.randomUUID();
    const propIso = new Date(Date.parse(tar.fecha_limite) + 2 * 86_400_000).toISOString();

    const first = await engine.crearSolicitudAutorizacion(opPuebla, {
      tarea_id: tar.id,
      tipo: 'PRORROGA_FECHA',
      motivo_solicitud: 'Motivo original CP-004',
      idempotency_key: uuidK1,
      fecha_propuesta: propIso,
    });
    const replay = await engine.crearSolicitudAutorizacion(opPuebla, {
      tarea_id: tar.id,
      tipo: 'PRORROGA_FECHA',
      motivo_solicitud: 'Motivo original CP-004',
      idempotency_key: uuidK1,
      fecha_propuesta: propIso,
    });

    expect(first.data?.folio).toBe(replay.data?.folio);
    expect(replay.data?.idempotent_replay).toBe(true);
    expect(engine.listSolicitudes(opPuebla)).toHaveLength(1);

    // Cambio de fecha difiriendo invalidación para probar detección exacta al clic en resolver
    const newDate = new Date(Date.parse(tar.fecha_limite) + 1 * 86_400_000).toISOString();
    await engine.actualizarTareaGerencia(gsPuebla, tar.id, {
      fecha_limite: newDate,
      diferir_invalidacion_cp004: true,
    });

    const resolveStale = await engine.resolverSolicitudAutorizacion(gsPuebla, {
      solicitud_id: String(first.data?.solicitud_id),
      dictamen: 'APROBADA',
      motivo_resolucion: 'Intento sobre pantalla desactualizada',
      idempotency_key: crypto.randomUUID(),
    });

    expect(resolveStale.ok).toBe(false);
    expect(resolveStale.http_status).toBe(409);
    expect(resolveStale.error_code).toBe('ERR-004');
    const staleSol = engine.listSolicitudes(gsPuebla)[0]!;
    expect(staleSol.estado).toBe('INVALIDADA_POR_DESACTUALIZACION');
    expect(staleSol.motivo_solicitud).toBe('Motivo original CP-004');
    expect(staleSol.motivo_invalidacion).toBeTruthy();
    expect(engine.getTareaById(gsPuebla, tar.id)!.fecha_limite).toBe(newDate);
  });

  it('CP-005 & CP-007: umbrales 48h/24h, hash acotado al documento y vigencia exclusiva GS', async () => {
    const engine = createIsolatedEngine();
    const gsPuebla = engine.authenticate('carlos.mendez@oficinaconecta.mx', 'OficinaConecta2026!')!;
    const opPuebla = engine.authenticate('sofia.morales@oficinaconecta.mx', 'OficinaConecta2026!')!;
    const dn = engine.authenticate('roberto.salinas@oficinaconecta.mx', 'OficinaConecta2026!')!;

    const baseNow = new Date('2026-11-18T12:00:00.000Z');
    const proy = engine.listProyectos(gsPuebla)[0]!;

    const createAtHours = async (hours: number, title: string) => {
      const deadline = new Date(baseNow.getTime() + hours * 3600_000).toISOString();
      return engine.crearTarea(gsPuebla, {
        proyecto_id: proy.id,
        departamento_id: proy.departamento_id,
        responsable_id: opPuebla.id,
        titulo: title,
        alcance: 'Prueba umbral',
        fecha_limite: deadline,
        ahora_referencia: baseNow.toISOString(),
      });
    };

    const t48 = await createAtHours(48, 'Exacta 48h');
    const t36 = await createAtHours(36, 'Entre 24 y 48h');
    const t24 = await createAtHours(24, 'Exacta 24h');
    const t12 = await createAtHours(12, 'Urgente <24h');

    const correos = engine.listCorreosSimulados(gsPuebla);
    const byTask = (id: unknown) => correos.filter((c) => c.tarea_id === id);

    expect(byTask(t48.data?.tarea_id).some((c) => c.combina_recordatorio === '48H')).toBe(true);
    expect(byTask(t36.data?.tarea_id).some((c) => c.motivo_aviso === 'RECORDATORIO_48H')).toBe(false);
    expect(byTask(t36.data?.tarea_id).some((c) => c.motivo_aviso === 'RECORDATORIO_24H')).toBe(true);
    expect(byTask(t24.data?.tarea_id).some((c) => c.combina_recordatorio === '24H')).toBe(true);
    expect(byTask(t12.data?.tarea_id).every((c) => c.motivo_aviso === 'ASIGNACION' && c.es_urgente_menor_24h)).toBe(true);

    // Control Documental + Vigencia exclusiva GS (PER-007)
    const buf = Buffer.from('Contenido oficial de tablero');
    const tareaId = String(t48.data?.tarea_id);
    const v1 = await engine.registrarVersionDocumento(opPuebla, {
      tarea_id: tareaId,
      nombre_documento: 'Acta de Calibración',
      nombre_original: 'acta.txt',
      mime_type: 'text/plain',
      fileBuffer: buf,
      descripcion_cambio: 'Versión inicial',
    });
    expect(v1.data?.etiqueta).toBe('v1');
    expect(v1.data?.es_vigente).toBe(false);

    // Mismo contenido en mismo doc -> advierte; en otra tarea -> no advierte
    const v2 = await engine.registrarVersionDocumento(opPuebla, {
      tarea_id: tareaId,
      nombre_documento: 'Acta de Calibración',
      nombre_original: 'acta_rev.txt',
      mime_type: 'text/plain',
      fileBuffer: buf,
      descripcion_cambio: 'Revisión con mismo archivo',
    });
    expect(v2.data?.etiqueta).toBe('v2');
    expect(v2.data?.advertencia_hash_duplicado).toContain('v1');

    const otherTaskDoc = await engine.registrarVersionDocumento(opPuebla, {
      tarea_id: String(t36.data?.tarea_id),
      nombre_documento: 'Acta de Calibración',
      nombre_original: 'acta.txt',
      mime_type: 'text/plain',
      fileBuffer: buf,
      descripcion_cambio: 'Uso legítimo en otra tarea',
    });
    expect(otherTaskDoc.data?.advertencia_hash_duplicado).toBeNull();

    // DN y OP bloqueados de designar versión vigente (PER-007)
    const dnTry = await engine.designarVersionVigente(dn, String(v1.data?.version_id));
    const opTry = await engine.designarVersionVigente(opPuebla, String(v1.data?.version_id));
    expect(dnTry.http_status).toBe(403);
    expect(opTry.http_status).toBe(403);

    // GS sí puede designar v2 vigente
    const gsOk = await engine.designarVersionVigente(gsPuebla, String(v2.data?.version_id));
    expect(gsOk.ok).toBe(true);
    const docs = engine.listDocumentosTarea(gsPuebla, tareaId)!;
    const vigentes = docs[0]!.versiones.filter((x) => x.es_vigente);
    expect(vigentes).toHaveLength(1);
    expect(vigentes[0]!.etiqueta).toBe('v2');
  });
});
