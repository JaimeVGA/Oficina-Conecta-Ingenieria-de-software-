/**
 * Script integral de verificación ATDD (Oficina Conecta — Grupo 502-A Equipo I)
 * Ejecuta el Recorrido Completo End-to-End + CP-001 a CP-007 y genera archivos .ics de evidencia (CP-006).
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LocalTransactionalEngine } from '../src/lib/backend/localEngine';
import { generateIcsCalendar } from '../src/lib/ics/generator';
import { INACTIVITY_EXPIRE_MS, INACTIVITY_WARN_MS } from '../src/hooks/useInactivityTimer';

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-verify-'));
  const engine = new LocalTransactionalEngine(
    path.join(tmpDir, 'db.json'),
    path.join(tmpDir, 'storage')
  );

  try {
    const dn = engine.authenticate('roberto.salinas@oficinaconecta.mx', 'OficinaConecta2026!')!;
    const gsPue = engine.authenticate('carlos.mendez@oficinaconecta.mx', 'OficinaConecta2026!')!;
    const opPue = engine.authenticate('sofia.morales@oficinaconecta.mx', 'OficinaConecta2026!')!;
    const opPue2 = engine.authenticate('pedro.ramirez@oficinaconecta.mx', 'OficinaConecta2026!')!;
    const gsCdmx = engine.authenticate('laura.gomez@oficinaconecta.mx', 'OficinaConecta2026!')!;
    assert(dn && gsPue && opPue && opPue2 && gsCdmx, 'Fallo autenticando usuarios piloto');

    // -------------------------------------------------------------------------
    // RECORRIDO COMPLETO E2E + CP-006 (.ics v0 y v1)
    // -------------------------------------------------------------------------
    const proyectoPuebla = engine.listProyectos(gsPue)[0]!;
    const creada = await engine.crearTarea(gsPue, {
      proyecto_id: proyectoPuebla.id,
      departamento_id: proyectoPuebla.departamento_id,
      responsable_id: opPue.id,
      titulo: 'Inspección Subestación Norte',
      alcance: 'Revisión termográfica y balanceo de fases.',
      fecha_limite: '2026-11-20T18:00:00-06:00',
      ahora_referencia: '2026-11-10T12:00:00-06:00',
    });
    assert.equal(creada.ok, true);
    const tareaId = String(creada.data?.tarea_id);
    const tareaV0 = engine.getTareaById(opPue, tareaId)!;
    assert.equal(tareaV0.sequence_ics, 0);

    const icsV0 = generateIcsCalendar([tareaV0]);
    const cp006Dir = path.join(process.cwd(), 'docs', 'evidencias', 'cp006');
    fs.mkdirSync(cp006Dir, { recursive: true });
    fs.writeFileSync(path.join(cp006Dir, 'tarea_v0.ics'), icsV0, 'utf8');
    assert(icsV0.includes(`UID:tarea-${tareaId}@oficinaconecta.mx`));
    assert(icsV0.includes('SEQUENCE:0'));

    // Solicitud de prórroga +4 días -> debe enrutar a GS Puebla (RN-001)
    const solE2E = await engine.crearSolicitudAutorizacion(opPue, {
      tarea_id: tareaId,
      tipo: 'PRORROGA_FECHA',
      motivo_solicitud: 'Corte programado de CFE en zona industrial impide pruebas.',
      idempotency_key: crypto.randomUUID(),
      fecha_propuesta: '2026-11-24T18:00:00-06:00',
    });
    assert.equal(solE2E.ok, true);
    assert.equal(solE2E.data?.rol_resolver, 'GS');

    const resE2E = await engine.resolverSolicitudAutorizacion(gsPue, {
      solicitud_id: String(solE2E.data?.solicitud_id),
      dictamen: 'APROBADA',
      motivo_resolucion: 'Verificado aviso oficial de CFE, se autoriza ajuste.',
      idempotency_key: crypto.randomUUID(),
    });
    assert.equal(resE2E.ok, true);

    const tareaV1 = engine.getTareaById(dn, tareaId)!;
    assert.equal(tareaV1.sequence_ics, 1);
    const icsV1 = generateIcsCalendar([tareaV1]);
    fs.writeFileSync(path.join(cp006Dir, 'tarea_v1.ics'), icsV1, 'utf8');
    assert(icsV1.includes(`UID:tarea-${tareaId}@oficinaconecta.mx`));
    assert(icsV1.includes('SEQUENCE:1'));
    console.log('[OK] Recorrido Completo E2E + CP-006 (.ics v0 y v1 generados)');

    // -------------------------------------------------------------------------
    // CP-001: Bitácora Append-Only (PER-008)
    // -------------------------------------------------------------------------
    for (const op of ['PUT', 'PATCH', 'DELETE'] as const) {
      const r = engine.rechazarMutacionBitacora(op);
      assert.equal(r.http_status, 403);
      assert.equal(r.error_code, 'ERR-005');
      assert.equal(r.sqlstate, '42501');
    }
    console.log('[OK] CP-001: Bitácora protegida (HTTP 403 / SQLSTATE 42501)');

    // -------------------------------------------------------------------------
    // CP-002: Concurrencia + Fallo Provocado en Bitácora (ROLLBACK total)
    // -------------------------------------------------------------------------
    const solConc = await engine.crearSolicitudAutorizacion(opPue, {
      tarea_id: tareaId,
      tipo: 'PRORROGA_FECHA',
      motivo_solicitud: 'Prueba concurrencia CP-002',
      idempotency_key: crypto.randomUUID(),
      fecha_propuesta: '2026-11-27T18:00:00-06:00',
    });
    const [c1, c2] = await Promise.all([
      engine.resolverSolicitudAutorizacion(gsPue, {
        solicitud_id: String(solConc.data?.solicitud_id),
        dictamen: 'APROBADA',
        motivo_resolucion: 'Resolución ganadora',
        idempotency_key: crypto.randomUUID(),
      }),
      engine.resolverSolicitudAutorizacion(gsPue, {
        solicitud_id: String(solConc.data?.solicitud_id),
        dictamen: 'RECHAZADA',
        motivo_resolucion: 'Resolución perdedora',
        idempotency_key: crypto.randomUUID(),
      }),
    ]);
    assert.equal([c1.ok, c2.ok].filter(Boolean).length, 1);
    const perdedora = c1.ok ? c2 : c1;
    assert.equal(perdedora.http_status, 409);
    assert.equal(perdedora.error_code, 'ERR-004');
    assert(perdedora.message?.includes('Carlos Méndez'));

    const solRollback = await engine.crearSolicitudAutorizacion(opPue, {
      tarea_id: tareaId,
      tipo: 'CAMBIO_ALCANCE',
      motivo_solicitud: 'Prueba rollback CP-002',
      idempotency_key: crypto.randomUUID(),
      alcance_propuesto: 'Alcance que debe revertirse por completo',
    });
    const tareaAntesRollback = engine.getTareaById(dn, tareaId)!;
    const bitAntes = engine.listBitacora(dn).length;
    const failBit = await engine.resolverSolicitudAutorizacion(dn, {
      solicitud_id: String(solRollback.data?.solicitud_id),
      dictamen: 'APROBADA',
      motivo_resolucion: 'Forzar fallo bitácora',
      idempotency_key: crypto.randomUUID(),
      simular_fallo_bitacora: true,
    });
    assert.equal(failBit.ok, false);
    assert.equal(failBit.http_status, 500);
    assert.equal(failBit.error_code, 'ERR-005');
    assert.equal(engine.getTareaById(dn, tareaId)!.alcance, tareaAntesRollback.alcance);
    assert.equal(engine.listBitacora(dn).length, bitAntes);
    assert.equal(
      engine.listSolicitudes(dn).find((s) => s.id === solRollback.data?.solicitud_id)?.estado,
      'PENDIENTE_REVISION'
    );
    console.log('[OK] CP-002: Concurrencia ERR-004 y ROLLBACK atómico total');

    // -------------------------------------------------------------------------
    // CP-003: Idempotencia + Reglas de temporizador 13m/15m
    // -------------------------------------------------------------------------
    const uuidK1 = crypto.randomUUID();
    const sA = await engine.crearSolicitudAutorizacion(opPue, {
      tarea_id: tareaId,
      tipo: 'PRORROGA_FECHA',
      motivo_solicitud: 'Prueba idempotencia CP-003',
      idempotency_key: uuidK1,
      fecha_propuesta: '2026-11-29T18:00:00-06:00',
    });
    const sB = await engine.crearSolicitudAutorizacion(opPue, {
      tarea_id: tareaId,
      tipo: 'PRORROGA_FECHA',
      motivo_solicitud: 'Prueba idempotencia CP-003',
      idempotency_key: uuidK1,
      fecha_propuesta: '2026-11-29T18:00:00-06:00',
    });
    assert.equal(sA.data?.folio, sB.data?.folio);
    assert.equal(sB.data?.idempotent_replay, true);
    assert.equal(INACTIVITY_WARN_MS, 13 * 60_000);
    assert.equal(INACTIVITY_EXPIRE_MS, 15 * 60_000);
    console.log('[OK] CP-003: Idempotencia UUID-K1 verificada y umbrales 13m/15m configurados');

    // -------------------------------------------------------------------------
    // CP-004: Invalidación por desactualización al resolver
    // -------------------------------------------------------------------------
    await engine.actualizarTareaGerencia(gsPue, tareaId, {
      fecha_limite: '2026-11-28T18:00:00-06:00',
      diferir_invalidacion_cp004: true,
    });
    const resDesact = await engine.resolverSolicitudAutorizacion(gsPue, {
      solicitud_id: String(sA.data?.solicitud_id),
      dictamen: 'APROBADA',
      motivo_resolucion: 'Intento tras cambio de fecha',
      idempotency_key: crypto.randomUUID(),
    });
    assert.equal(resDesact.ok, false);
    assert.equal(resDesact.http_status, 409);
    assert.equal(resDesact.error_code, 'ERR-004');
    const solInval = engine.listSolicitudes(dn).find((s) => s.id === sA.data?.solicitud_id)!;
    assert.equal(solInval.estado, 'INVALIDADA_POR_DESACTUALIZACION');
    assert.equal(solInval.motivo_solicitud, 'Prueba idempotencia CP-003');
    assert(solInval.motivo_invalidacion && solInval.motivo_invalidacion.length > 0);
    console.log('[OK] CP-004: Invalidación por desactualización conserva ambos motivos');

    // -------------------------------------------------------------------------
    // CP-005: Recordatorios (5 umbrales, reprogramación, cancelación, 0 duplicados)
    // -------------------------------------------------------------------------
    const nowRef = new Date('2026-11-18T12:00:00.000Z');
    const mk = async (h: number, name: string) =>
      engine.crearTarea(gsPue, {
        proyecto_id: proyectoPuebla.id,
        departamento_id: proyectoPuebla.departamento_id,
        responsable_id: opPue.id,
        titulo: name,
        alcance: 'Validación RN-006',
        fecha_limite: new Date(nowRef.getTime() + h * 3600_000).toISOString(),
        ahora_referencia: nowRef.toISOString(),
      });
    const r72 = await mk(72, 'T >48h');
    const r48 = await mk(48, 'T =48h');
    const r36 = await mk(36, 'T 24-48h');
    const r24 = await mk(24, 'T =24h');
    const r12 = await mk(12, 'T <24h');

    const correos = engine.listCorreosSimulados(gsPue);
    assert(correos.some((c) => c.tarea_id === r72.data?.tarea_id && c.motivo_aviso === 'RECORDATORIO_48H'));
    assert(correos.some((c) => c.tarea_id === r48.data?.tarea_id && c.combina_recordatorio === '48H'));
    assert(!correos.some((c) => c.tarea_id === r36.data?.tarea_id && c.motivo_aviso === 'RECORDATORIO_48H'));
    assert(correos.some((c) => c.tarea_id === r36.data?.tarea_id && c.motivo_aviso === 'RECORDATORIO_24H'));
    assert(correos.some((c) => c.tarea_id === r24.data?.tarea_id && c.combina_recordatorio === '24H'));
    assert(correos.some((c) => c.tarea_id === r12.data?.tarea_id && c.es_urgente_menor_24h));

    // Completar r36 cancela recordatorio 24h
    await engine.actualizarAvanceTarea(opPue, String(r36.data?.tarea_id), 'COMPLETADA', 100);
    const correosPostComplete = engine.listCorreosSimulados(gsPue).filter((c) => c.tarea_id === r36.data?.tarea_id);
    assert(correosPostComplete.some((c) => c.motivo_aviso === 'RECORDATORIO_24H' && c.estado === 'CANCELADO'));

    // Evaluar 2 veces -> 0 duplicados
    const ev1 = await engine.evaluarRecordatoriosSimulados(
      gsPue,
      new Date(nowRef.getTime() + 25 * 3600_000).toISOString()
    );
    const ev2 = await engine.evaluarRecordatoriosSimulados(
      gsPue,
      new Date(nowRef.getTime() + 25 * 3600_000).toISOString()
    );
    assert.equal(ev1.ok, true);
    assert.equal(ev2.data?.recordatorios_emitidos, 0);
    console.log('[OK] CP-005: 5 umbrales de recordatorios, cancelación y 0 duplicados');

    // -------------------------------------------------------------------------
    // CP-007: Control Documental + Aislamiento RBAC (PER-001..007)
    // -------------------------------------------------------------------------
    // 1. OP2 no ve tarea de OP1
    assert.equal(engine.getTareaById(opPue2, tareaId), null);
    // 2. GS CDMX no puede operar en tarea de Puebla
    const crossSede = await engine.actualizarTareaGerencia(gsCdmx, tareaId, { titulo: 'Intento cruzado' });
    assert.equal(crossSede.http_status, 403);
    // 3. GS Puebla no puede auto-aprobar su solicitud (ERR-003)
    const gsSol = await engine.crearSolicitudAutorizacion(gsPue, {
      tarea_id: tareaId,
      tipo: 'PRORROGA_FECHA',
      motivo_solicitud: 'Solicitud emitida por gerente',
      idempotency_key: crypto.randomUUID(),
      fecha_propuesta: '2026-11-30T18:00:00-06:00',
    });
    assert.equal(gsSol.data?.rol_resolver, 'DN');
    const selfApprove = await engine.resolverSolicitudAutorizacion(gsPue, {
      solicitud_id: String(gsSol.data?.solicitud_id),
      dictamen: 'APROBADA',
      motivo_resolucion: 'Autoaprobación prohibida',
      idempotency_key: crypto.randomUUID(),
    });
    assert.equal(selfApprove.http_status, 403);
    assert.equal(selfApprove.error_code, 'ERR-003');

    // 4. Documentos v1/v2, SHA-256 y vigencia exclusiva GS
    const fileBytes = Buffer.from('Reporte de calibración v1');
    const doc1 = await engine.registrarVersionDocumento(opPue, {
      tarea_id: tareaId,
      nombre_documento: 'Reporte Eléctrico',
      nombre_original: 'reporte.pdf',
      mime_type: 'application/pdf',
      fileBuffer: fileBytes,
      descripcion_cambio: 'Carga inicial',
    });
    assert.equal(doc1.data?.etiqueta, 'v1');
    const doc1V2 = await engine.registrarVersionDocumento(opPue, {
      tarea_id: tareaId,
      nombre_documento: 'Reporte Eléctrico',
      nombre_original: 'reporte_2.pdf',
      mime_type: 'application/pdf',
      fileBuffer: fileBytes,
      descripcion_cambio: 'Revisión idéntica',
    });
    assert.equal(doc1V2.data?.etiqueta, 'v2');
    assert(String(doc1V2.data?.advertencia_hash_duplicado).includes('v1'));

    const dnVig = await engine.designarVersionVigente(dn, String(doc1V2.data?.version_id));
    const opVig = await engine.designarVersionVigente(opPue, String(doc1V2.data?.version_id));
    assert.equal(dnVig.http_status, 403);
    assert.equal(opVig.http_status, 403);

    const gsVig = await engine.designarVersionVigente(gsPue, String(doc1V2.data?.version_id));
    assert.equal(gsVig.ok, true);
    console.log('[OK] CP-007: Control documental v1/v2, SHA-256, vigencia exclusiva GS y aislamiento RBAC');

    console.log('\n=== VERIFICACIÓN INTEGRAL COMPLETADA: 100% CASOS PASADOS ===');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('Fallo en verificación:', err);
  process.exit(1);
});
