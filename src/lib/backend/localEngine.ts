import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  ApiResult,
  BitacoraAutorizacion,
  BitacoraEnriquecida,
  CorreoSimulado,
  Departamento,
  Dictamen,
  DocumentoConVersiones,
  DocumentoTarea,
  DocumentoVersion,
  EstadoTarea,
  MetricaSede,
  PerfilUsuario,
  Proyecto,
  Sede,
  SedeId,
  SolicitudAutorizacion,
  SolicitudEnriquecida,
  Tarea,
  TareaEnriquecida,
  TipoSolicitud,
} from '@/lib/supabase/types';
import { diffNaturalDaysMX, formatMexicoCityDateTime, toMexicoCityDate } from '@/lib/dates/mexicoCity';
import { buildErrorResult } from '@/lib/errors/mapRpcError';

export interface LocalDatabaseState {
  sedes: Sede[];
  departamentos: Departamento[];
  perfiles: PerfilUsuario[];
  proyectos: Proyecto[];
  tareas: Tarea[];
  solicitudes: SolicitudAutorizacion[];
  bitacora: BitacoraAutorizacion[];
  documentos: DocumentoTarea[];
  versiones: DocumentoVersion[];
  correos: CorreoSimulado[];
  seqTarea: number;
  seqSolicitud: number;
  permitirFalloCp002: boolean;
}

const DEFAULT_DB_FILE = path.join(process.cwd(), '.oficina-conecta-local-db.json');
const DEFAULT_STORAGE_DIR = path.join(process.cwd(), '.oficina-conecta-storage');
export const LOCAL_DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? 'OficinaConecta2026!';

function createInitialState(): LocalDatabaseState {
  const nowIso = '2026-11-05T15:00:00.000Z';

  const sedes: Sede[] = [
    { id: 'CDMX', codigo_corto: 'CDMX', nombre: 'Ciudad de México', creado_en: nowIso },
    { id: 'OAXACA', codigo_corto: 'OAX', nombre: 'Oaxaca de Juárez', creado_en: nowIso },
    { id: 'PUEBLA', codigo_corto: 'PUE', nombre: 'Puebla de Zaragoza', creado_en: nowIso },
  ];

  const departamentos: Departamento[] = [
    { id: '20000000-0000-4000-8000-000000000001', sede_id: 'CDMX', nombre: 'Operaciones', creado_en: nowIso },
    { id: '20000000-0000-4000-8000-000000000002', sede_id: 'CDMX', nombre: 'Infraestructura', creado_en: nowIso },
    { id: '20000000-0000-4000-8000-000000000003', sede_id: 'OAXACA', nombre: 'Logística', creado_en: nowIso },
    { id: '20000000-0000-4000-8000-000000000004', sede_id: 'OAXACA', nombre: 'Supervisión Regional', creado_en: nowIso },
    { id: '20000000-0000-4000-8000-000000000005', sede_id: 'PUEBLA', nombre: 'Mantenimiento', creado_en: nowIso },
    { id: '20000000-0000-4000-8000-000000000006', sede_id: 'PUEBLA', nombre: 'Redes y Soporte', creado_en: nowIso },
  ];

  const perfiles: PerfilUsuario[] = [
    {
      id: '10000000-0000-4000-8000-000000000001',
      nombre_completo: 'Roberto Salinas',
      correo: 'roberto.salinas@oficinaconecta.mx',
      rol: 'DN',
      sede_id: null,
      departamento_id: null,
      activo: true,
      creado_en: nowIso,
    },
    {
      id: '10000000-0000-4000-8000-000000000002',
      nombre_completo: 'Carlos Méndez',
      correo: 'carlos.mendez@oficinaconecta.mx',
      rol: 'GS',
      sede_id: 'PUEBLA',
      departamento_id: '20000000-0000-4000-8000-000000000005',
      activo: true,
      creado_en: nowIso,
    },
    {
      id: '10000000-0000-4000-8000-000000000003',
      nombre_completo: 'Sofía Morales',
      correo: 'sofia.morales@oficinaconecta.mx',
      rol: 'OP',
      sede_id: 'PUEBLA',
      departamento_id: '20000000-0000-4000-8000-000000000005',
      activo: true,
      creado_en: nowIso,
    },
    {
      id: '10000000-0000-4000-8000-000000000004',
      nombre_completo: 'Pedro Ramírez',
      correo: 'pedro.ramirez@oficinaconecta.mx',
      rol: 'OP',
      sede_id: 'PUEBLA',
      departamento_id: '20000000-0000-4000-8000-000000000006',
      activo: true,
      creado_en: nowIso,
    },
    {
      id: '10000000-0000-4000-8000-000000000005',
      nombre_completo: 'Laura Gómez',
      correo: 'laura.gomez@oficinaconecta.mx',
      rol: 'GS',
      sede_id: 'CDMX',
      departamento_id: '20000000-0000-4000-8000-000000000001',
      activo: true,
      creado_en: nowIso,
    },
    {
      id: '10000000-0000-4000-8000-000000000006',
      nombre_completo: 'Miguel Torres',
      correo: 'miguel.torres@oficinaconecta.mx',
      rol: 'OP',
      sede_id: 'CDMX',
      departamento_id: '20000000-0000-4000-8000-000000000001',
      activo: true,
      creado_en: nowIso,
    },
    {
      id: '10000000-0000-4000-8000-000000000007',
      nombre_completo: 'Elena Vásquez',
      correo: 'elena.vasquez@oficinaconecta.mx',
      rol: 'GS',
      sede_id: 'OAXACA',
      departamento_id: '20000000-0000-4000-8000-000000000003',
      activo: true,
      creado_en: nowIso,
    },
    {
      id: '10000000-0000-4000-8000-000000000008',
      nombre_completo: 'Diego Cruz',
      correo: 'diego.cruz@oficinaconecta.mx',
      rol: 'OP',
      sede_id: 'OAXACA',
      departamento_id: '20000000-0000-4000-8000-000000000003',
      activo: true,
      creado_en: nowIso,
    },
  ];

  const proyectos: Proyecto[] = [
    {
      id: '30000000-0000-4000-8000-000000000001',
      sede_id: 'PUEBLA',
      departamento_id: '20000000-0000-4000-8000-000000000005',
      nombre: 'Modernización Planta Sur',
      descripcion: 'Proyecto piloto de infraestructura eléctrica y tableros en sede Puebla.',
      fecha_fin_proyecto: '2026-11-30',
      estado: 'ACTIVO',
      creado_por: '10000000-0000-4000-8000-000000000002',
      creado_en: nowIso,
      actualizado_en: nowIso,
    },
    {
      id: '30000000-0000-4000-8000-000000000002',
      sede_id: 'CDMX',
      departamento_id: '20000000-0000-4000-8000-000000000001',
      nombre: 'Actualización Red Core CDMX',
      descripcion: 'Renovación de enlaces troncales y redundancia eléctrica en oficinas centrales.',
      fecha_fin_proyecto: '2026-12-15',
      estado: 'ACTIVO',
      creado_por: '10000000-0000-4000-8000-000000000005',
      creado_en: nowIso,
      actualizado_en: nowIso,
    },
    {
      id: '30000000-0000-4000-8000-000000000003',
      sede_id: 'OAXACA',
      departamento_id: '20000000-0000-4000-8000-000000000003',
      nombre: 'Supervisión Logística Istmo',
      descripcion: 'Seguimiento operativo de entregas regionales en Oaxaca de Juárez.',
      fecha_fin_proyecto: '2026-12-10',
      estado: 'ACTIVO',
      creado_por: '10000000-0000-4000-8000-000000000007',
      creado_en: nowIso,
      actualizado_en: nowIso,
    },
  ];

  // Tareas iniciales reproducibles (incluyendo TAR-PUE-014 del prototipo SRS p. 12)
  const tareas: Tarea[] = [
    {
      id: '40000000-0000-4000-8000-000000000014',
      folio: 'TAR-PUE-014',
      sede_id: 'PUEBLA',
      proyecto_id: '30000000-0000-4000-8000-000000000001',
      departamento_id: '20000000-0000-4000-8000-000000000005',
      responsable_id: '10000000-0000-4000-8000-000000000003',
      titulo: 'Calibración de Tableros',
      alcance: 'Calibración preventiva, pruebas de carga y registro fotográfico en tableros de Planta Sur.',
      fecha_limite: '2026-11-26T23:59:00.000Z', // 2026-11-26 17:59 MX
      estado: 'EN_PROCESO',
      porcentaje_avance: 45,
      sequence_ics: 0,
      creado_por: '10000000-0000-4000-8000-000000000002',
      creado_en: nowIso,
      actualizado_en: nowIso,
    },
    {
      id: '40000000-0000-4000-8000-000000000015',
      folio: 'TAR-CDMX-001',
      sede_id: 'CDMX',
      proyecto_id: '30000000-0000-4000-8000-000000000002',
      departamento_id: '20000000-0000-4000-8000-000000000001',
      responsable_id: '10000000-0000-4000-8000-000000000006',
      titulo: 'Migración de Switches Piso 4',
      alcance: 'Sustitución de equipos de distribución en rack principal sin afectar horario hábil.',
      fecha_limite: '2026-12-05T23:59:00.000Z',
      estado: 'ASIGNADA',
      porcentaje_avance: 10,
      sequence_ics: 0,
      creado_por: '10000000-0000-4000-8000-000000000005',
      creado_en: nowIso,
      actualizado_en: nowIso,
    },
    {
      id: '40000000-0000-4000-8000-000000000016',
      folio: 'TAR-OAX-001',
      sede_id: 'OAXACA',
      proyecto_id: '30000000-0000-4000-8000-000000000003',
      departamento_id: '20000000-0000-4000-8000-000000000003',
      responsable_id: '10000000-0000-4000-8000-000000000008',
      titulo: 'Auditoría de Inventario Regional',
      alcance: 'Verificación física de unidades de respaldo en almacén central Oaxaca.',
      fecha_limite: '2026-12-02T23:59:00.000Z',
      estado: 'ASIGNADA',
      porcentaje_avance: 20,
      sequence_ics: 0,
      creado_por: '10000000-0000-4000-8000-000000000007',
      creado_en: nowIso,
      actualizado_en: nowIso,
    },
  ];

  const correos: CorreoSimulado[] = [
    {
      id: '50000000-0000-4000-8000-000000000001',
      clave_evento: 'tarea:40000000-0000-4000-8000-000000000014:seq:0:asig',
      sede_id: 'PUEBLA',
      destinatario_usuario_id: '10000000-0000-4000-8000-000000000003',
      destinatario: 'sofia.morales@oficinaconecta.mx',
      motivo_aviso: 'ASIGNACION',
      es_urgente_menor_24h: false,
      combina_recordatorio: null,
      tarea_id: '40000000-0000-4000-8000-000000000014',
      solicitud_id: null,
      asunto: '[SIMULADO] Asignación de tarea TAR-PUE-014: Calibración de Tableros',
      contenido:
        'Hola Sofía Morales, se te asignó "Calibración de Tableros" (TAR-PUE-014) en "Modernización Planta Sur". Fecha límite vigente: 2026-11-26 17:59 (America/Mexico_City).',
      fecha_hora_prevista: nowIso,
      emitido_en: nowIso,
      es_simulado: true,
      estado: 'EMITIDO',
      creado_en: nowIso,
    },
    {
      id: '50000000-0000-4000-8000-000000000002',
      clave_evento: 'tarea:40000000-0000-4000-8000-000000000014:seq:0:rec48',
      sede_id: 'PUEBLA',
      destinatario_usuario_id: '10000000-0000-4000-8000-000000000003',
      destinatario: 'sofia.morales@oficinaconecta.mx',
      motivo_aviso: 'RECORDATORIO_48H',
      es_urgente_menor_24h: false,
      combina_recordatorio: null,
      tarea_id: '40000000-0000-4000-8000-000000000014',
      solicitud_id: null,
      asunto: '[SIMULADO] Recordatorio 48h — TAR-PUE-014: Calibración de Tableros',
      contenido: 'Recordatorio preventivo (48h): "Calibración de Tableros" (TAR-PUE-014) vence el 2026-11-26 17:59 (America/Mexico_City).',
      fecha_hora_prevista: new Date(Date.parse('2026-11-26T23:59:00.000Z') - 48 * 3600_000).toISOString(),
      emitido_en: null,
      es_simulado: true,
      estado: 'PROGRAMADO',
      creado_en: nowIso,
    },
    {
      id: '50000000-0000-4000-8000-000000000003',
      clave_evento: 'tarea:40000000-0000-4000-8000-000000000014:seq:0:rec24',
      sede_id: 'PUEBLA',
      destinatario_usuario_id: '10000000-0000-4000-8000-000000000003',
      destinatario: 'sofia.morales@oficinaconecta.mx',
      motivo_aviso: 'RECORDATORIO_24H',
      es_urgente_menor_24h: false,
      combina_recordatorio: null,
      tarea_id: '40000000-0000-4000-8000-000000000014',
      solicitud_id: null,
      asunto: '[SIMULADO] Recordatorio 24h — TAR-PUE-014: Calibración de Tableros',
      contenido: 'Recordatorio preventivo (24h): "Calibración de Tableros" (TAR-PUE-014) vence el 2026-11-26 17:59 (America/Mexico_City).',
      fecha_hora_prevista: new Date(Date.parse('2026-11-26T23:59:00.000Z') - 24 * 3600_000).toISOString(),
      emitido_en: null,
      es_simulado: true,
      estado: 'PROGRAMADO',
      creado_en: nowIso,
    },
  ];

  return {
    sedes,
    departamentos,
    perfiles,
    proyectos,
    tareas,
    solicitudes: [],
    bitacora: [],
    documentos: [],
    versiones: [],
    correos,
    seqTarea: 16,
    seqSolicitud: 42,
    permitirFalloCp002: true,
  };
}

/**
 * Motor local transaccional que implementa exactamente las mismas invariantes,
 * bloqueo de filas (mutex), rollback atómico, RBAC y reglas RN-001..RN-006 del DDL PostgreSQL.
 */
export class LocalTransactionalEngine {
  private readonly dbFilePath: string;
  private readonly storageDir: string;
  private lockQueue: Promise<void> = Promise.resolve();

  constructor(dbFilePath = DEFAULT_DB_FILE, storageDir = DEFAULT_STORAGE_DIR) {
    this.dbFilePath = dbFilePath;
    this.storageDir = storageDir;
  }

  private async withWriteLock<T>(fn: (db: LocalDatabaseState) => Promise<T> | T): Promise<T> {
    let release!: () => void;
    const next = new Promise<void>((res) => {
      release = res;
    });
    const prev = this.lockQueue;
    this.lockQueue = prev.then(() => next);
    await prev;

    try {
      const db = this.loadState();
      const snapshot = structuredClone(db);
      try {
        const result = await fn(db);
        this.saveState(db);
        return result;
      } catch (err) {
        // ROLLBACK automático del snapshot completo ante excepción no controlada (ej. ERR-005 CP-002)
        this.saveState(snapshot);
        throw err;
      }
    } finally {
      release();
    }
  }

  private loadState(): LocalDatabaseState {
    if (!fs.existsSync(this.dbFilePath)) {
      const initial = createInitialState();
      this.saveState(initial);
      return initial;
    }
    const raw = fs.readFileSync(this.dbFilePath, 'utf8');
    return JSON.parse(raw) as LocalDatabaseState;
  }

  private saveState(state: LocalDatabaseState): void {
    fs.writeFileSync(this.dbFilePath, JSON.stringify(state, null, 2), 'utf8');
  }

  public resetForTests(): void {
    if (fs.existsSync(this.dbFilePath)) {
      fs.unlinkSync(this.dbFilePath);
    }
    this.saveState(createInitialState());
  }

  public getPerfilById(userId: string): PerfilUsuario | null {
    const db = this.loadState();
    return db.perfiles.find((p) => p.id === userId && p.activo) ?? null;
  }

  public authenticate(email: string, password: string): PerfilUsuario | null {
    const db = this.loadState();
    const user = db.perfiles.find((p) => p.correo.toLowerCase() === email.trim().toLowerCase() && p.activo);
    if (!user) return null;
    if (password !== LOCAL_DEMO_PASSWORD) return null;
    return user;
  }

  public getCatalogos(actor: PerfilUsuario) {
    const db = this.loadState();
    const sedes = db.sedes.filter((s) => actor.rol === 'DN' || s.id === actor.sede_id);
    const departamentos = db.departamentos.filter((d) => actor.rol === 'DN' || d.sede_id === actor.sede_id);
    const usuarios = db.perfiles.filter(
      (u) => actor.rol === 'DN' || u.id === actor.id || (actor.rol === 'GS' && u.sede_id === actor.sede_id)
    );
    return { sedes, departamentos, usuarios };
  }

  public listProyectos(actor: PerfilUsuario): Proyecto[] {
    const db = this.loadState();
    if (actor.rol === 'DN') return db.proyectos;
    if (actor.rol === 'GS') return db.proyectos.filter((p) => p.sede_id === actor.sede_id);
    const taskProjectIds = new Set(db.tareas.filter((t) => t.responsable_id === actor.id).map((t) => t.proyecto_id));
    return db.proyectos.filter((p) => taskProjectIds.has(p.id));
  }

  public async crearDepartamento(actor: PerfilUsuario, nombre: string): Promise<ApiResult> {
    return this.withWriteLock((db) => {
      if (actor.rol !== 'GS' || !actor.sede_id) {
        return buildErrorResult('ERR-001', 'Solo la Gerencia de Sede puede crear departamentos en su sede.', 403);
      }
      const clean = nombre.trim();
      if (!clean) {
        return buildErrorResult('ERR-002', 'El nombre del departamento es obligatorio.', 422);
      }
      if (db.departamentos.some((d) => d.sede_id === actor.sede_id && d.nombre.toLowerCase() === clean.toLowerCase())) {
        return buildErrorResult('ERR-004', 'Ya existe un departamento con ese nombre en su sede.', 409);
      }
      const depto: Departamento = {
        id: crypto.randomUUID(),
        sede_id: actor.sede_id,
        nombre: clean,
        creado_en: new Date().toISOString(),
      };
      db.departamentos.push(depto);
      return { ok: true, http_status: 201, data: { departamento: depto } };
    });
  }

  public async crearProyecto(
    actor: PerfilUsuario,
    input: { departamento_id: string; nombre: string; descripcion: string; fecha_fin_proyecto: string; sede_id?: string }
  ): Promise<ApiResult> {
    return this.withWriteLock((db) => {
      if (actor.rol !== 'GS' || !actor.sede_id) {
        return buildErrorResult('ERR-001', 'Solo la Gerencia de Sede puede crear proyectos en su sede.', 403);
      }
      if (input.sede_id && input.sede_id !== actor.sede_id) {
        return buildErrorResult('ERR-001', 'Acceso denegado: no puede crear proyectos en otra sede.', 403);
      }
      if (!input.nombre.trim() || !input.fecha_fin_proyecto) {
        return buildErrorResult('ERR-002', 'Nombre y fecha fin del proyecto son obligatorios.', 422);
      }
      const depto = db.departamentos.find((d) => d.id === input.departamento_id && d.sede_id === actor.sede_id);
      if (!depto) {
        return buildErrorResult('ERR-001', 'Acceso denegado: el departamento no pertenece a su sede.', 403);
      }
      const nowIso = new Date().toISOString();
      const proyecto: Proyecto = {
        id: crypto.randomUUID(),
        sede_id: actor.sede_id,
        departamento_id: depto.id,
        nombre: input.nombre.trim(),
        descripcion: input.descripcion.trim(),
        fecha_fin_proyecto: input.fecha_fin_proyecto,
        estado: 'ACTIVO',
        creado_por: actor.id,
        creado_en: nowIso,
        actualizado_en: nowIso,
      };
      db.proyectos.push(proyecto);
      return { ok: true, http_status: 201, data: { proyecto } };
    });
  }

  private enrichTask(db: LocalDatabaseState, t: Tarea): TareaEnriquecida {
    const sede = db.sedes.find((s) => s.id === t.sede_id);
    const proy = db.proyectos.find((p) => p.id === t.proyecto_id);
    const depto = db.departamentos.find((d) => d.id === t.departamento_id);
    const resp = db.perfiles.find((u) => u.id === t.responsable_id);
    return {
      ...t,
      sede_nombre: sede?.nombre ?? t.sede_id,
      proyecto_nombre: proy?.nombre ?? 'Proyecto',
      proyecto_fecha_fin: proy?.fecha_fin_proyecto ?? '',
      departamento_nombre: depto?.nombre ?? 'Departamento',
      responsable_nombre: resp?.nombre_completo ?? 'Operativo',
      responsable_correo: resp?.correo ?? '',
    };
  }

  public listTareas(actor: PerfilUsuario): TareaEnriquecida[] {
    const db = this.loadState();
    const visible = db.tareas.filter((t) => {
      if (actor.rol === 'DN') return true;
      if (actor.rol === 'GS') return t.sede_id === actor.sede_id;
      return t.responsable_id === actor.id;
    });
    return visible.map((t) => this.enrichTask(db, t)).sort((a, b) => a.fecha_limite.localeCompare(b.fecha_limite));
  }

  public getTareaById(actor: PerfilUsuario, tareaId: string): TareaEnriquecida | null {
    const db = this.loadState();
    const t = db.tareas.find((x) => x.id === tareaId);
    if (!t) return null;
    if (actor.rol === 'GS' && t.sede_id !== actor.sede_id) return null;
    if (actor.rol === 'OP' && t.responsable_id !== actor.id) return null;
    return this.enrichTask(db, t);
  }

  private programarAvisosTareaInternal(
    db: LocalDatabaseState,
    tareaId: string,
    incluirAsignacion: boolean,
    ahora: Date = new Date()
  ): void {
    const t = db.tareas.find((x) => x.id === tareaId);
    if (!t) return;
    const proy = db.proyectos.find((p) => p.id === t.proyecto_id);
    const resp = db.perfiles.find((u) => u.id === t.responsable_id);
    if (!proy || !resp) return;

    // Cancelar recordatorios programados anteriores (RN-006.6)
    for (const c of db.correos) {
      if (
        c.tarea_id === t.id &&
        (c.motivo_aviso === 'RECORDATORIO_48H' || c.motivo_aviso === 'RECORDATORIO_24H') &&
        c.estado === 'PROGRAMADO'
      ) {
        c.estado = 'CANCELADO';
      }
    }

    if (t.estado === 'COMPLETADA' || t.estado === 'CANCELADA') return;

    const ahoraIso = ahora.toISOString();
    const fechaMx = `${formatMexicoCityDateTime(t.fecha_limite)} (America/Mexico_City)`;
    const diffSec = (Date.parse(t.fecha_limite) - ahora.getTime()) / 1000;

    const pushCorreo = (item: Omit<CorreoSimulado, 'id' | 'creado_en' | 'es_simulado'>) => {
      if (db.correos.some((c) => c.clave_evento === item.clave_evento)) return;
      db.correos.push({
        ...item,
        id: crypto.randomUUID(),
        es_simulado: true,
        creado_en: ahoraIso,
      });
    };

    const rec48At = new Date(Date.parse(t.fecha_limite) - 48 * 3600_000).toISOString();
    const rec24At = new Date(Date.parse(t.fecha_limite) - 24 * 3600_000).toISOString();

    if (diffSec > 48 * 3600 + 60) {
      if (incluirAsignacion) {
        pushCorreo({
          clave_evento: `tarea:${t.id}:seq:${t.sequence_ics}:asig`,
          sede_id: t.sede_id,
          destinatario_usuario_id: t.responsable_id,
          destinatario: resp.correo,
          motivo_aviso: 'ASIGNACION',
          es_urgente_menor_24h: false,
          combina_recordatorio: null,
          tarea_id: t.id,
          solicitud_id: null,
          asunto: `[SIMULADO] Asignación de tarea ${t.folio}: ${t.titulo}`,
          contenido: `Hola ${resp.nombre_completo}, se te asignó "${t.titulo}" (${t.folio}) en "${proy.nombre}". Fecha límite vigente: ${fechaMx}.`,
          fecha_hora_prevista: ahoraIso,
          emitido_en: ahoraIso,
          estado: 'EMITIDO',
        });
      }
      pushCorreo({
        clave_evento: `tarea:${t.id}:seq:${t.sequence_ics}:rec48`,
        sede_id: t.sede_id,
        destinatario_usuario_id: t.responsable_id,
        destinatario: resp.correo,
        motivo_aviso: 'RECORDATORIO_48H',
        es_urgente_menor_24h: false,
        combina_recordatorio: null,
        tarea_id: t.id,
        solicitud_id: null,
        asunto: `[SIMULADO] Recordatorio 48h — ${t.folio}: ${t.titulo}`,
        contenido: `Recordatorio preventivo (48h): "${t.titulo}" (${t.folio}) vence el ${fechaMx}.`,
        fecha_hora_prevista: rec48At,
        emitido_en: null,
        estado: 'PROGRAMADO',
      });
      pushCorreo({
        clave_evento: `tarea:${t.id}:seq:${t.sequence_ics}:rec24`,
        sede_id: t.sede_id,
        destinatario_usuario_id: t.responsable_id,
        destinatario: resp.correo,
        motivo_aviso: 'RECORDATORIO_24H',
        es_urgente_menor_24h: false,
        combina_recordatorio: null,
        tarea_id: t.id,
        solicitud_id: null,
        asunto: `[SIMULADO] Recordatorio 24h — ${t.folio}: ${t.titulo}`,
        contenido: `Recordatorio preventivo (24h): "${t.titulo}" (${t.folio}) vence el ${fechaMx}.`,
        fecha_hora_prevista: rec24At,
        emitido_en: null,
        estado: 'PROGRAMADO',
      });
    } else if (Math.abs(diffSec - 48 * 3600) <= 60) {
      if (incluirAsignacion) {
        pushCorreo({
          clave_evento: `tarea:${t.id}:seq:${t.sequence_ics}:asig_rec48`,
          sede_id: t.sede_id,
          destinatario_usuario_id: t.responsable_id,
          destinatario: resp.correo,
          motivo_aviso: 'ASIGNACION',
          es_urgente_menor_24h: false,
          combina_recordatorio: '48H',
          tarea_id: t.id,
          solicitud_id: null,
          asunto: `[SIMULADO] Asignación + Recordatorio 48h — ${t.folio}: ${t.titulo}`,
          contenido: `Aviso combinado (Asignación y umbral exacto de 48h): "${t.titulo}" (${t.folio}). Fecha límite vigente: ${fechaMx}.`,
          fecha_hora_prevista: ahoraIso,
          emitido_en: ahoraIso,
          estado: 'EMITIDO',
        });
      } else {
        pushCorreo({
          clave_evento: `tarea:${t.id}:seq:${t.sequence_ics}:rec48`,
          sede_id: t.sede_id,
          destinatario_usuario_id: t.responsable_id,
          destinatario: resp.correo,
          motivo_aviso: 'RECORDATORIO_48H',
          es_urgente_menor_24h: false,
          combina_recordatorio: null,
          tarea_id: t.id,
          solicitud_id: null,
          asunto: `[SIMULADO] Recordatorio 48h — ${t.folio}: ${t.titulo}`,
          contenido: `Umbral exacto de 48h tras actualización de fecha: "${t.titulo}" (${t.folio}) vence el ${fechaMx}.`,
          fecha_hora_prevista: ahoraIso,
          emitido_en: ahoraIso,
          estado: 'EMITIDO',
        });
      }
      pushCorreo({
        clave_evento: `tarea:${t.id}:seq:${t.sequence_ics}:rec24`,
        sede_id: t.sede_id,
        destinatario_usuario_id: t.responsable_id,
        destinatario: resp.correo,
        motivo_aviso: 'RECORDATORIO_24H',
        es_urgente_menor_24h: false,
        combina_recordatorio: null,
        tarea_id: t.id,
        solicitud_id: null,
        asunto: `[SIMULADO] Recordatorio 24h — ${t.folio}: ${t.titulo}`,
        contenido: `Recordatorio preventivo (24h): "${t.titulo}" (${t.folio}) vence el ${fechaMx}.`,
        fecha_hora_prevista: rec24At,
        emitido_en: null,
        estado: 'PROGRAMADO',
      });
    } else if (diffSec > 24 * 3600 + 60) {
      if (incluirAsignacion) {
        pushCorreo({
          clave_evento: `tarea:${t.id}:seq:${t.sequence_ics}:asig`,
          sede_id: t.sede_id,
          destinatario_usuario_id: t.responsable_id,
          destinatario: resp.correo,
          motivo_aviso: 'ASIGNACION',
          es_urgente_menor_24h: false,
          combina_recordatorio: null,
          tarea_id: t.id,
          solicitud_id: null,
          asunto: `[SIMULADO] Asignación de tarea ${t.folio}: ${t.titulo}`,
          contenido: `Hola ${resp.nombre_completo}, se te asignó "${t.titulo}" (${t.folio}). Fecha límite vigente: ${fechaMx}. (Aviso de 48h omitido por plazo menor a 48h).`,
          fecha_hora_prevista: ahoraIso,
          emitido_en: ahoraIso,
          estado: 'EMITIDO',
        });
      }
      pushCorreo({
        clave_evento: `tarea:${t.id}:seq:${t.sequence_ics}:rec24`,
        sede_id: t.sede_id,
        destinatario_usuario_id: t.responsable_id,
        destinatario: resp.correo,
        motivo_aviso: 'RECORDATORIO_24H',
        es_urgente_menor_24h: false,
        combina_recordatorio: null,
        tarea_id: t.id,
        solicitud_id: null,
        asunto: `[SIMULADO] Recordatorio 24h — ${t.folio}: ${t.titulo}`,
        contenido: `Recordatorio preventivo (24h): "${t.titulo}" (${t.folio}) vence el ${fechaMx}.`,
        fecha_hora_prevista: rec24At,
        emitido_en: null,
        estado: 'PROGRAMADO',
      });
    } else if (Math.abs(diffSec - 24 * 3600) <= 60) {
      if (incluirAsignacion) {
        pushCorreo({
          clave_evento: `tarea:${t.id}:seq:${t.sequence_ics}:asig_rec24`,
          sede_id: t.sede_id,
          destinatario_usuario_id: t.responsable_id,
          destinatario: resp.correo,
          motivo_aviso: 'ASIGNACION',
          es_urgente_menor_24h: false,
          combina_recordatorio: '24H',
          tarea_id: t.id,
          solicitud_id: null,
          asunto: `[SIMULADO] Asignación + Recordatorio 24h — ${t.folio}: ${t.titulo}`,
          contenido: `Aviso combinado (Asignación y umbral exacto de 24h): "${t.titulo}" (${t.folio}). Fecha límite vigente: ${fechaMx}.`,
          fecha_hora_prevista: ahoraIso,
          emitido_en: ahoraIso,
          estado: 'EMITIDO',
        });
      } else {
        pushCorreo({
          clave_evento: `tarea:${t.id}:seq:${t.sequence_ics}:rec24`,
          sede_id: t.sede_id,
          destinatario_usuario_id: t.responsable_id,
          destinatario: resp.correo,
          motivo_aviso: 'RECORDATORIO_24H',
          es_urgente_menor_24h: false,
          combina_recordatorio: null,
          tarea_id: t.id,
          solicitud_id: null,
          asunto: `[SIMULADO] Recordatorio 24h — ${t.folio}: ${t.titulo}`,
          contenido: `Umbral exacto de 24h tras actualización de fecha: "${t.titulo}" (${t.folio}) vence el ${fechaMx}.`,
          fecha_hora_prevista: ahoraIso,
          emitido_en: ahoraIso,
          estado: 'EMITIDO',
        });
      }
    } else if (incluirAsignacion) {
      pushCorreo({
        clave_evento: `tarea:${t.id}:seq:${t.sequence_ics}:asig_urgente`,
        sede_id: t.sede_id,
        destinatario_usuario_id: t.responsable_id,
        destinatario: resp.correo,
        motivo_aviso: 'ASIGNACION',
        es_urgente_menor_24h: true,
        combina_recordatorio: null,
        tarea_id: t.id,
        solicitud_id: null,
        asunto: `[SIMULADO][PLAZO <24H] Asignación urgente ${t.folio}: ${t.titulo}`,
        contenido: `AVISO URGENTE (plazo menor a 24 horas): Hola ${resp.nombre_completo}, se te asignó "${t.titulo}" (${t.folio}). Fecha límite vigente: ${fechaMx}. No se programarán recordatorios preventivos adicionales.`,
        fecha_hora_prevista: ahoraIso,
        emitido_en: ahoraIso,
        estado: 'EMITIDO',
      });
    }
  }

  public async crearTarea(
    actor: PerfilUsuario,
    input: {
      proyecto_id: string;
      departamento_id: string;
      responsable_id: string;
      titulo: string;
      alcance: string;
      fecha_limite: string;
      ahora_referencia?: string;
    }
  ): Promise<ApiResult> {
    return this.withWriteLock((db) => {
      if (actor.rol !== 'GS' || !actor.sede_id) {
        return buildErrorResult('ERR-001', 'Solo la Gerencia de Sede puede crear y asignar tareas en su sede.', 403);
      }
      if (!input.titulo?.trim() || !input.alcance?.trim() || !input.fecha_limite) {
        return buildErrorResult('ERR-002', 'Título, alcance y fecha límite son obligatorios.', 422);
      }
      const proyecto = db.proyectos.find((p) => p.id === input.proyecto_id);
      if (!proyecto || proyecto.sede_id !== actor.sede_id) {
        return buildErrorResult('ERR-001', 'Acceso denegado: el proyecto no pertenece a su sede.', 403);
      }
      const depto = db.departamentos.find((d) => d.id === input.departamento_id && d.sede_id === actor.sede_id);
      if (!depto) {
        return buildErrorResult('ERR-001', 'Acceso denegado: el departamento no pertenece a su sede.', 403);
      }
      const resp = db.perfiles.find((u) => u.id === input.responsable_id && u.activo);
      if (!resp || resp.sede_id !== actor.sede_id || resp.rol !== 'OP') {
        return buildErrorResult('ERR-001', 'El responsable debe ser Personal Operativo activo perteneciente a su sede.', 403);
      }
      const fechaMx = toMexicoCityDate(input.fecha_limite);
      if (fechaMx > proyecto.fecha_fin_proyecto) {
        return buildErrorResult(
          'ERR-002',
          `La fecha límite (${fechaMx}) no puede superar el fin del proyecto (${proyecto.fecha_fin_proyecto}).`,
          422
        );
      }
      const sede = db.sedes.find((s) => s.id === actor.sede_id);
      db.seqTarea += 1;
      const folio = `TAR-${sede?.codigo_corto ?? actor.sede_id}-${String(db.seqTarea).padStart(3, '0')}`;
      const nowIso = new Date().toISOString();
      const tarea: Tarea = {
        id: crypto.randomUUID(),
        folio,
        sede_id: actor.sede_id,
        proyecto_id: proyecto.id,
        departamento_id: depto.id,
        responsable_id: resp.id,
        titulo: input.titulo.trim(),
        alcance: input.alcance.trim(),
        fecha_limite: new Date(input.fecha_limite).toISOString(),
        estado: 'ASIGNADA',
        porcentaje_avance: 0,
        sequence_ics: 0,
        creado_por: actor.id,
        creado_en: nowIso,
        actualizado_en: nowIso,
      };
      db.tareas.push(tarea);
      const refNow = input.ahora_referencia ? new Date(input.ahora_referencia) : new Date();
      this.programarAvisosTareaInternal(db, tarea.id, true, refNow);
      return {
        ok: true,
        http_status: 201,
        data: { tarea_id: tarea.id, folio: tarea.folio, sequence_ics: 0, tarea: this.enrichTask(db, tarea) },
      };
    });
  }

  public async actualizarAvanceTarea(
    actor: PerfilUsuario,
    tareaId: string,
    estado: EstadoTarea,
    porcentajeAvance: number
  ): Promise<ApiResult> {
    return this.withWriteLock((db) => {
      if (actor.rol !== 'OP') {
        return buildErrorResult('ERR-001', 'Solo el Personal Operativo responsable puede registrar avances con esta operación.', 403);
      }
      if (!['ASIGNADA', 'EN_PROCESO', 'COMPLETADA'].includes(estado) || porcentajeAvance < 0 || porcentajeAvance > 100) {
        return buildErrorResult('ERR-002', 'Estado o porcentaje de avance inválido.', 422);
      }
      const tarea = db.tareas.find((t) => t.id === tareaId);
      if (!tarea || tarea.responsable_id !== actor.id) {
        return buildErrorResult('ERR-001', 'Acceso denegado: la tarea no está asignada a su usuario.', 403);
      }
      if (tarea.estado === 'CANCELADA') {
        return buildErrorResult('ERR-004', 'No se puede avanzar una tarea cancelada.', 409);
      }
      tarea.estado = estado;
      tarea.porcentaje_avance = estado === 'COMPLETADA' ? 100 : Math.round(porcentajeAvance);
      tarea.actualizado_en = new Date().toISOString();
      if (estado === 'COMPLETADA') {
        this.programarAvisosTareaInternal(db, tarea.id, false, new Date());
      }
      return { ok: true, http_status: 200, data: { tarea_id: tarea.id, estado: tarea.estado } };
    });
  }

  public async actualizarTareaGerencia(
    actor: PerfilUsuario,
    tareaId: string,
    input: {
      titulo?: string;
      fecha_limite?: string;
      estado?: EstadoTarea;
      motivo_cambio?: string;
      diferir_invalidacion_cp004?: boolean;
    }
  ): Promise<ApiResult> {
    return this.withWriteLock((db) => {
      if (actor.rol !== 'GS' || !actor.sede_id) {
        return buildErrorResult('ERR-001', 'Solo la Gerencia de Sede puede modificar tareas de su sede.', 403);
      }
      const tarea = db.tareas.find((t) => t.id === tareaId);
      if (!tarea || tarea.sede_id !== actor.sede_id) {
        return buildErrorResult('ERR-001', 'Acceso denegado: la tarea pertenece a otra sede.', 403);
      }
      const proyecto = db.proyectos.find((p) => p.id === tarea.proyecto_id);
      if (!proyecto) {
        return buildErrorResult('ERR-002', 'Proyecto asociado no encontrado.', 404);
      }
      let cambioFecha = false;
      const fechaAnterior = tarea.fecha_limite;
      if (input.fecha_limite && new Date(input.fecha_limite).toISOString() !== tarea.fecha_limite) {
        const mxDate = toMexicoCityDate(input.fecha_limite);
        if (mxDate > proyecto.fecha_fin_proyecto) {
          return buildErrorResult(
            'ERR-001',
            'La nueva fecha excede el fin del proyecto; debe tramitar una solicitud ante Dirección Nacional.',
            403
          );
        }
        cambioFecha = true;
      }
      if (input.titulo?.trim()) tarea.titulo = input.titulo.trim();
      if (input.fecha_limite) tarea.fecha_limite = new Date(input.fecha_limite).toISOString();
      const cambioEstado = Boolean(input.estado && input.estado !== tarea.estado);
      if (input.estado) tarea.estado = input.estado;
      if (cambioFecha || cambioEstado) tarea.sequence_ics += 1;
      tarea.actualizado_en = new Date().toISOString();

      let invalidadas = 0;
      if (cambioFecha && !(input.diferir_invalidacion_cp004 && db.permitirFalloCp002)) {
        const nowIso = new Date().toISOString();
        for (const sol of db.solicitudes) {
          if (sol.tarea_id === tarea.id && sol.estado === 'PENDIENTE_REVISION') {
            sol.estado = 'INVALIDADA_POR_DESACTUALIZACION';
            sol.motivo_invalidacion = `La fecha límite de la tarea cambió de ${formatMexicoCityDateTime(
              fechaAnterior
            )} a ${formatMexicoCityDateTime(tarea.fecha_limite)} por Gerencia de Sede${
              input.motivo_cambio?.trim() ? ` (${input.motivo_cambio.trim()})` : ''
            }.`;
            sol.invalidada_en = nowIso;
            sol.actualizado_en = nowIso;
            invalidadas += 1;
          }
        }
      }

      if (cambioFecha || input.estado === 'COMPLETADA' || input.estado === 'CANCELADA') {
        this.programarAvisosTareaInternal(db, tarea.id, false, new Date());
      }
      return {
        ok: true,
        http_status: 200,
        data: { tarea_id: tarea.id, solicitudes_invalidadas: invalidadas, sequence_ics: tarea.sequence_ics },
      };
    });
  }

  public listSolicitudes(actor: PerfilUsuario): SolicitudEnriquecida[] {
    const db = this.loadState();
    const visible = db.solicitudes.filter((s) => {
      if (actor.rol === 'DN') return true;
      if (actor.rol === 'GS') return s.sede_id === actor.sede_id;
      const t = db.tareas.find((x) => x.id === s.tarea_id);
      return t?.responsable_id === actor.id;
    });

    return visible
      .map((s) => {
        const t = db.tareas.find((x) => x.id === s.tarea_id);
        const p = t ? db.proyectos.find((x) => x.id === t.proyecto_id) : undefined;
        const sede = db.sedes.find((x) => x.id === s.sede_id);
        const solUser = db.perfiles.find((x) => x.id === s.solicitante_id);
        const bit = db.bitacora.find((b) => b.solicitud_id === s.id) ?? null;
        return {
          ...s,
          tarea_folio: t?.folio ?? '',
          tarea_titulo: t?.titulo ?? '',
          tarea_fecha_limite_actual: t?.fecha_limite ?? s.fecha_referencia,
          proyecto_nombre: p?.nombre ?? '',
          proyecto_fecha_fin: p?.fecha_fin_proyecto ?? '',
          sede_nombre: sede?.nombre ?? s.sede_id,
          solicitante_nombre: solUser?.nombre_completo ?? '',
          solicitante_rol: solUser?.rol ?? 'OP',
          bitacora: bit,
        };
      })
      .sort((a, b) => b.creado_en.localeCompare(a.creado_en));
  }

  public async crearSolicitudAutorizacion(
    actor: PerfilUsuario,
    input: {
      tarea_id: string;
      tipo: TipoSolicitud;
      motivo_solicitud: string;
      idempotency_key: string;
      fecha_propuesta?: string | null;
      alcance_propuesto?: string | null;
    }
  ): Promise<ApiResult> {
    return this.withWriteLock((db) => {
      if (actor.rol !== 'OP' && actor.rol !== 'GS') {
        return buildErrorResult('ERR-001', 'Solo Personal Operativo o Gerencia de Sede pueden enviar solicitudes.', 403);
      }
      const existing = db.solicitudes.find(
        (s) => s.solicitante_id === actor.id && s.idempotency_key === input.idempotency_key
      );
      if (existing) {
        return {
          ok: true,
          http_status: 200,
          data: {
            idempotent_replay: true,
            solicitud_id: existing.id,
            folio: existing.folio,
            rol_resolver: existing.rol_resolver,
            estado: existing.estado,
          },
        };
      }
      if (input.tipo !== 'PRORROGA_FECHA' && input.tipo !== 'CAMBIO_ALCANCE') {
        return buildErrorResult('ERR-002', 'Tipo inválido (solo PRORROGA_FECHA o CAMBIO_ALCANCE).', 422);
      }
      if (!input.motivo_solicitud || input.motivo_solicitud.trim().length === 0) {
        return buildErrorResult('ERR-002', 'Debe proporcionar una explicación/motivo para la solicitud.', 422);
      }

      const tarea = db.tareas.find((t) => t.id === input.tarea_id);
      if (!tarea) return buildErrorResult('ERR-002', 'Tarea no encontrada.', 404);
      if (actor.rol === 'OP' && tarea.responsable_id !== actor.id) {
        return buildErrorResult('ERR-001', 'Acceso denegado: solo puede solicitar autorizaciones sobre sus propias tareas.', 403);
      }
      if (actor.rol === 'GS' && tarea.sede_id !== actor.sede_id) {
        return buildErrorResult('ERR-001', 'Acceso denegado: la tarea pertenece a otra sede.', 403);
      }
      if (tarea.estado === 'COMPLETADA' || tarea.estado === 'CANCELADA') {
        return buildErrorResult('ERR-004', 'No se pueden crear solicitudes sobre tareas completadas o canceladas.', 409);
      }
      const proyecto = db.proyectos.find((p) => p.id === tarea.proyecto_id);
      if (!proyecto) return buildErrorResult('ERR-002', 'Proyecto no encontrado.', 404);

      let dias: number | null = null;
      let rolResolver: 'GS' | 'DN';
      let cambioTexto: string;
      let fechaPropIso: string | null = null;
      let alcanceProp: string | null = null;

      if (input.tipo === 'PRORROGA_FECHA') {
        if (!input.fecha_propuesta || Date.parse(input.fecha_propuesta) <= Date.parse(tarea.fecha_limite)) {
          return buildErrorResult('ERR-002', 'La fecha propuesta debe ser posterior a la fecha límite vigente.', 422);
        }
        fechaPropIso = new Date(input.fecha_propuesta).toISOString();
        dias = diffNaturalDaysMX(tarea.fecha_limite, fechaPropIso);
        const propMxDate = toMexicoCityDate(fechaPropIso);
        // RN-001: ≤ 5 días naturales, sin superar fin proyecto y solicitante OP -> GS; resto -> DN
        if (actor.rol === 'OP' && dias <= 5 && propMxDate <= proyecto.fecha_fin_proyecto) {
          rolResolver = 'GS';
        } else {
          rolResolver = 'DN';
        }
        cambioTexto = `Prórroga de ${formatMexicoCityDateTime(tarea.fecha_limite)} a ${formatMexicoCityDateTime(
          fechaPropIso
        )} (+${dias} días naturales)`;
      } else {
        if (!input.alcance_propuesto || input.alcance_propuesto.trim().length === 0) {
          return buildErrorResult('ERR-002', 'Debe describir el alcance propuesto.', 422);
        }
        alcanceProp = input.alcance_propuesto.trim();
        rolResolver = 'DN';
        cambioTexto = `Cambio de alcance: ${alcanceProp}`;
      }

      db.seqSolicitud += 1;
      const yearMx = toMexicoCityDate(new Date().toISOString()).slice(0, 4);
      const folio = `AUT-${yearMx}-${String(db.seqSolicitud).padStart(3, '0')}`;
      const nowIso = new Date().toISOString();

      const sol: SolicitudAutorizacion = {
        id: crypto.randomUUID(),
        folio,
        tarea_id: tarea.id,
        sede_id: tarea.sede_id,
        solicitante_id: actor.id,
        idempotency_key: input.idempotency_key,
        tipo: input.tipo,
        fecha_referencia: tarea.fecha_limite,
        alcance_referencia: tarea.alcance,
        fecha_propuesta: fechaPropIso,
        alcance_propuesto: alcanceProp,
        dias_naturales_solicitados: dias,
        cambio_solicitado: cambioTexto,
        motivo_solicitud: input.motivo_solicitud.trim(),
        rol_resolver: rolResolver,
        estado: 'PENDIENTE_REVISION',
        motivo_invalidacion: null,
        invalidada_en: null,
        creado_en: nowIso,
        actualizado_en: nowIso,
      };
      db.solicitudes.push(sol);

      const destinatarios = db.perfiles.filter(
        (u) => u.activo && ((rolResolver === 'DN' && u.rol === 'DN') || (rolResolver === 'GS' && u.rol === 'GS' && u.sede_id === tarea.sede_id))
      );
      for (const dest of destinatarios) {
        const clave = `sol:${sol.id}:creada:dest:${dest.id}`;
        if (!db.correos.some((c) => c.clave_evento === clave)) {
          db.correos.push({
            id: crypto.randomUUID(),
            clave_evento: clave,
            sede_id: tarea.sede_id,
            destinatario_usuario_id: dest.id,
            destinatario: dest.correo,
            motivo_aviso: 'SOLICITUD',
            es_urgente_menor_24h: false,
            combina_recordatorio: null,
            tarea_id: tarea.id,
            solicitud_id: sol.id,
            asunto: `[SIMULADO] Nueva solicitud ${folio} (${input.tipo}) — ${tarea.folio}`,
            contenido: `${actor.nombre_completo} solicitó ${cambioTexto} sobre "${tarea.titulo}" (${tarea.folio}). Motivo: ${sol.motivo_solicitud}. Asignada a: ${rolResolver}.`,
            fecha_hora_prevista: nowIso,
            emitido_en: nowIso,
            es_simulado: true,
            estado: 'EMITIDO',
            creado_en: nowIso,
          });
        }
      }

      return {
        ok: true,
        http_status: 201,
        data: {
          idempotent_replay: false,
          solicitud_id: sol.id,
          folio: sol.folio,
          rol_resolver: sol.rol_resolver,
          estado: sol.estado,
          dias_naturales: dias,
        },
      };
    });
  }

  public async resolverSolicitudAutorizacion(
    actor: PerfilUsuario,
    input: {
      solicitud_id: string;
      dictamen: Dictamen;
      motivo_resolucion: string;
      idempotency_key: string;
      simular_fallo_bitacora?: boolean;
    }
  ): Promise<ApiResult> {
    try {
      return await this.withWriteLock((db) => {
        if (actor.rol !== 'GS' && actor.rol !== 'DN') {
          return buildErrorResult('ERR-001', 'Solo Gerencia de Sede o Dirección Nacional pueden resolver solicitudes.', 403);
        }
        if (input.dictamen !== 'APROBADA' && input.dictamen !== 'RECHAZADA') {
          return buildErrorResult('ERR-002', 'El dictamen debe ser APROBADA o RECHAZADA.', 422);
        }
        if (!input.motivo_resolucion || input.motivo_resolucion.trim().length === 0) {
          return buildErrorResult('ERR-002', 'Debe ingresar el motivo de la resolución.', 422);
        }

        const sol = db.solicitudes.find((s) => s.id === input.solicitud_id);
        if (!sol) return buildErrorResult('ERR-002', 'Solicitud no encontrada.', 404);
        const tarea = db.tareas.find((t) => t.id === sol.tarea_id);
        const proyecto = tarea ? db.proyectos.find((p) => p.id === tarea.proyecto_id) : undefined;
        if (!tarea || !proyecto) return buildErrorResult('ERR-002', 'Tarea o proyecto no encontrado.', 404);

        // RBAC antes de revelar información previa
        if (actor.rol === 'GS' && sol.sede_id !== actor.sede_id) {
          return buildErrorResult('ERR-001', 'Acceso denegado: la solicitud pertenece a otra sede.', 403);
        }
        if (sol.solicitante_id === actor.id) {
          return buildErrorResult('ERR-003', 'ERR-003: Ningún usuario puede autorizar su propia solicitud.', 403);
        }
        if (actor.rol !== sol.rol_resolver) {
          return buildErrorResult(
            'ERR-001',
            `Acceso denegado: esta solicitud debe ser resuelta por ${sol.rol_resolver}.`,
            403
          );
        }

        if (sol.estado === 'APROBADA' || sol.estado === 'RECHAZADA') {
          const bit = db.bitacora.find((b) => b.solicitud_id === sol.id);
          if (bit && bit.idempotency_key === input.idempotency_key && bit.usuario_resolutor_id === actor.id) {
            return {
              ok: true,
              http_status: 200,
              data: {
                idempotent_replay: true,
                solicitud_id: sol.id,
                bitacora_id: bit.id,
                dictamen: bit.dictamen,
                resuelto_en: bit.resuelto_en,
              },
            };
          }
          const fechaMx = bit ? formatMexicoCityDateTime(bit.resuelto_en, true) : '';
          return buildErrorResult(
            'ERR-004',
            `La solicitud ya fue resuelta previamente por ${bit?.resolutor_nombre_snapshot ?? 'otro autorizador'} con dictamen ${
              bit?.dictamen ?? sol.estado
            } el ${fechaMx}.`,
            409,
            {
              resuelto_por: bit?.resolutor_nombre_snapshot,
              dictamen: bit?.dictamen ?? sol.estado,
              resuelto_en: bit?.resuelto_en,
            }
          );
        }

        if (sol.estado === 'INVALIDADA_POR_DESACTUALIZACION') {
          return buildErrorResult(
            'ERR-004',
            `La solicitud fue invalidada por desactualización: ${sol.motivo_invalidacion}`,
            409,
            {
              estado: sol.estado,
              motivo_original: sol.motivo_solicitud,
              motivo_invalidacion: sol.motivo_invalidacion,
              invalidada_en: sol.invalidada_en,
            }
          );
        }

        // Doble comprobación de vigencia al clic exacto de resolver (RN-003 / CP-004)
        if (tarea.fecha_limite !== sol.fecha_referencia) {
          const nowIso = new Date().toISOString();
          const motivoInval = `Fecha límite de referencia desactualizada al resolver: era ${formatMexicoCityDateTime(
            sol.fecha_referencia
          )} al solicitar y actualmente es ${formatMexicoCityDateTime(tarea.fecha_limite)}.`;
          sol.estado = 'INVALIDADA_POR_DESACTUALIZACION';
          sol.motivo_invalidacion = motivoInval;
          sol.invalidada_en = nowIso;
          sol.actualizado_en = nowIso;
          return buildErrorResult(
            'ERR-004',
            'ERR-004: La fecha límite de la tarea cambió antes de resolver. Solicitud invalidada por desactualización.',
            409,
            {
              estado: 'INVALIDADA_POR_DESACTUALIZACION',
              motivo_original: sol.motivo_solicitud,
              motivo_invalidacion: motivoInval,
            }
          );
        }

        const nowIso = new Date().toISOString();
        let valorAnterior: string;
        let valorNuevo: string;

        if (sol.tipo === 'PRORROGA_FECHA' && sol.fecha_propuesta) {
          valorAnterior = `${formatMexicoCityDateTime(tarea.fecha_limite)} (America/Mexico_City)`;
          if (input.dictamen === 'APROBADA') {
            valorNuevo = `${formatMexicoCityDateTime(sol.fecha_propuesta)} (America/Mexico_City)`;
            const propMxDate = toMexicoCityDate(sol.fecha_propuesta);
            if (propMxDate > proyecto.fecha_fin_proyecto) {
              proyecto.fecha_fin_proyecto = propMxDate;
              proyecto.actualizado_en = nowIso;
              valorNuevo += ` [Fin proyecto ajustado a ${propMxDate}]`;
            }
            tarea.fecha_limite = sol.fecha_propuesta;
            tarea.sequence_ics += 1;
            tarea.actualizado_en = nowIso;

            for (const other of db.solicitudes) {
              if (other.tarea_id === tarea.id && other.id !== sol.id && other.estado === 'PENDIENTE_REVISION') {
                other.estado = 'INVALIDADA_POR_DESACTUALIZACION';
                other.motivo_invalidacion = `Otra prórroga (${sol.folio}) modificó la fecha límite vigente a ${formatMexicoCityDateTime(
                  sol.fecha_propuesta
                )}.`;
                other.invalidada_en = nowIso;
                other.actualizado_en = nowIso;
              }
            }
          } else {
            valorNuevo = `${valorAnterior} (Sin cambio — solicitud rechazada)`;
          }
        } else {
          valorAnterior = tarea.alcance;
          if (input.dictamen === 'APROBADA' && sol.alcance_propuesto) {
            valorNuevo = sol.alcance_propuesto;
            tarea.alcance = sol.alcance_propuesto;
            tarea.sequence_ics += 1;
            tarea.actualizado_en = nowIso;
          } else {
            valorNuevo = `${valorAnterior} (Sin cambio — solicitud rechazada)`;
          }
        }

        sol.estado = input.dictamen;
        sol.actualizado_en = nowIso;

        // Simulación controlada de fallo en bitácora DESPUÉS de modificar tarea y solicitud (CP-002)
        if (input.simular_fallo_bitacora && db.permitirFalloCp002) {
          throw new Error('ERR-005: Fallo provocado en escritura de bitácora (prueba CP-002).');
        }

        const bitacoraId = crypto.randomUUID();
        db.bitacora.push({
          id: bitacoraId,
          solicitud_id: sol.id,
          tarea_id: tarea.id,
          sede_id: tarea.sede_id,
          usuario_resolutor_id: actor.id,
          resolutor_nombre_snapshot: actor.nombre_completo,
          resolutor_rol_snapshot: actor.rol,
          idempotency_key: input.idempotency_key,
          dictamen: input.dictamen,
          motivo_resolucion: input.motivo_resolucion.trim(),
          valor_anterior: valorAnterior,
          valor_nuevo: valorNuevo,
          resuelto_en: nowIso,
        });

        if (input.dictamen === 'APROBADA' && sol.tipo === 'PRORROGA_FECHA') {
          this.programarAvisosTareaInternal(db, tarea.id, false, new Date());
        }

        const solicitante = db.perfiles.find((u) => u.id === sol.solicitante_id);
        const claveRes = `sol:${sol.id}:resuelta`;
        if (solicitante && !db.correos.some((c) => c.clave_evento === claveRes)) {
          db.correos.push({
            id: crypto.randomUUID(),
            clave_evento: claveRes,
            sede_id: tarea.sede_id,
            destinatario_usuario_id: solicitante.id,
            destinatario: solicitante.correo,
            motivo_aviso: 'RESOLUCION',
            es_urgente_menor_24h: false,
            combina_recordatorio: null,
            tarea_id: tarea.id,
            solicitud_id: sol.id,
            asunto: `[SIMULADO] Solicitud ${sol.folio} ${input.dictamen} — ${tarea.folio}`,
            contenido: `Tu solicitud ${sol.folio} sobre "${tarea.titulo}" fue ${input.dictamen} por ${actor.nombre_completo} (${actor.rol}). Motivo: ${input.motivo_resolucion.trim()}. Cambio: ${valorAnterior} -> ${valorNuevo}.`,
            fecha_hora_prevista: nowIso,
            emitido_en: nowIso,
            es_simulado: true,
            estado: 'EMITIDO',
            creado_en: nowIso,
          });
        }

        return {
          ok: true,
          http_status: 200,
          data: {
            idempotent_replay: false,
            solicitud_id: sol.id,
            bitacora_id: bitacoraId,
            dictamen: input.dictamen,
            valor_anterior: valorAnterior,
            valor_nuevo: valorNuevo,
          },
        };
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ERR-005: Error atómico en escritura de bitácora.';
      return {
        ok: false,
        error_code: 'ERR-005',
        http_status: 500,
        message: `${msg} Se ejecutó ROLLBACK total: la tarea y la solicitud permanecen sin cambios.`,
      };
    }
  }

  public listBitacora(actor: PerfilUsuario, tareaId?: string): BitacoraEnriquecida[] {
    const db = this.loadState();
    const visible = db.bitacora.filter((b) => {
      if (tareaId && b.tarea_id !== tareaId) return false;
      if (actor.rol === 'DN') return true;
      if (actor.rol === 'GS') return b.sede_id === actor.sede_id;
      const t = db.tareas.find((x) => x.id === b.tarea_id);
      return t?.responsable_id === actor.id;
    });
    return visible
      .map((b) => {
        const sol = db.solicitudes.find((s) => s.id === b.solicitud_id);
        const t = db.tareas.find((x) => x.id === b.tarea_id);
        const sede = db.sedes.find((s) => s.id === b.sede_id);
        return {
          ...b,
          solicitud_folio: sol?.folio ?? '',
          solicitud_tipo: sol?.tipo ?? 'PRORROGA_FECHA',
          motivo_solicitud: sol?.motivo_solicitud ?? '',
          tarea_folio: t?.folio ?? '',
          tarea_titulo: t?.titulo ?? '',
          sede_nombre: sede?.nombre ?? b.sede_id,
        };
      })
      .sort((a, b) => b.resuelto_en.localeCompare(a.resuelto_en));
  }

  public rechazarMutacionBitacora(operacion: 'PUT' | 'PATCH' | 'DELETE'): ApiResult {
    return {
      ok: false,
      error_code: 'ERR-005',
      sqlstate: '42501',
      http_status: 403,
      message: `ERR-005 (SQLSTATE 42501): La bitácora de autorizaciones es de solo adición (append-only). Operación ${operacion} prohibida.`,
    };
  }

  public listDocumentosTarea(actor: PerfilUsuario, tareaId: string): DocumentoConVersiones[] | null {
    const db = this.loadState();
    const tarea = db.tareas.find((t) => t.id === tareaId);
    if (!tarea) return null;
    if (actor.rol === 'GS' && tarea.sede_id !== actor.sede_id) return null;
    if (actor.rol === 'OP' && tarea.responsable_id !== actor.id) return null;

    const docs = db.documentos.filter((d) => d.tarea_id === tareaId);
    return docs.map((d) => {
      const versiones = db.versiones
        .filter((v) => v.documento_id === d.id)
        .map((v) => {
          const autor = db.perfiles.find((u) => u.id === v.autor_id);
          const designador = v.designada_por ? db.perfiles.find((u) => u.id === v.designada_por) : null;
          return {
            ...v,
            autor_nombre: autor?.nombre_completo ?? 'Usuario',
            designada_por_nombre: designador?.nombre_completo ?? null,
          };
        })
        .sort((a, b) => b.numero_version - a.numero_version);
      return { ...d, versiones };
    });
  }

  public verificarHashDocumento(
    actor: PerfilUsuario,
    tareaId: string,
    nombreDocumento: string,
    hashSha256: string
  ): ApiResult {
    const db = this.loadState();
    const tarea = db.tareas.find((t) => t.id === tareaId);
    if (
      !tarea ||
      !((actor.rol === 'GS' && tarea.sede_id === actor.sede_id) || (actor.rol === 'OP' && tarea.responsable_id === actor.id))
    ) {
      return buildErrorResult('ERR-001', 'No tiene permiso para cargar documentos en esta tarea.', 403);
    }
    const doc = db.documentos.find(
      (d) => d.tarea_id === tareaId && d.nombre_documento.toLowerCase() === nombreDocumento.trim().toLowerCase()
    );
    const match = doc
      ? db.versiones
          .filter((v) => v.documento_id === doc.id && v.hash_sha256 === hashSha256.toLowerCase())
          .sort((a, b) => b.numero_version - a.numero_version)[0]
      : undefined;

    return {
      ok: true,
      http_status: 200,
      data: {
        duplicado_en_mismo_documento: Boolean(match),
        version_coincidente: match?.etiqueta ?? null,
        advertencia: match
          ? `El archivo cargado es idéntico a una versión previa (${match.etiqueta}) de este documento.`
          : null,
      },
    };
  }

  public async registrarVersionDocumento(
    actor: PerfilUsuario,
    input: {
      tarea_id: string;
      nombre_documento: string;
      nombre_original: string;
      mime_type: string;
      fileBuffer: Buffer;
      descripcion_cambio: string;
    }
  ): Promise<ApiResult> {
    return this.withWriteLock((db) => {
      if (actor.rol !== 'OP' && actor.rol !== 'GS') {
        return buildErrorResult('ERR-001', 'Solo el responsable asignado o la Gerencia de Sede pueden subir revisiones.', 403);
      }
      if (!input.nombre_documento.trim() || !input.descripcion_cambio.trim()) {
        return buildErrorResult('ERR-002', 'El nombre del documento y la descripción del cambio son obligatorios.', 422);
      }
      const tarea = db.tareas.find((t) => t.id === input.tarea_id);
      if (
        !tarea ||
        (actor.rol === 'OP' && tarea.responsable_id !== actor.id) ||
        (actor.rol === 'GS' && tarea.sede_id !== actor.sede_id)
      ) {
        return buildErrorResult('ERR-001', 'Acceso denegado: no está autorizado para subir documentos a esta tarea.', 403);
      }
      if (input.fileBuffer.byteLength === 0 || input.fileBuffer.byteLength > 52_428_800) {
        return buildErrorResult('ERR-002', 'El archivo debe tener entre 1 byte y 50 MB.', 422);
      }

      const cleanDocName = input.nombre_documento.trim();
      const nowIso = new Date().toISOString();
      let doc = db.documentos.find(
        (d) => d.tarea_id === tarea.id && d.nombre_documento.toLowerCase() === cleanDocName.toLowerCase()
      );
      if (!doc) {
        doc = {
          id: crypto.randomUUID(),
          tarea_id: tarea.id,
          sede_id: tarea.sede_id,
          nombre_documento: cleanDocName,
          creado_por: actor.id,
          creado_en: nowIso,
        };
        db.documentos.push(doc);
      }

      const hash = crypto.createHash('sha256').update(input.fileBuffer).digest('hex');
      const existingVersions = db.versiones.filter((v) => v.documento_id === doc.id);
      const dup = existingVersions
        .filter((v) => v.hash_sha256 === hash)
        .sort((a, b) => b.numero_version - a.numero_version)[0];
      const nextNum = existingVersions.reduce((max, v) => Math.max(max, v.numero_version), 0) + 1;
      const etiqueta = `v${nextNum}`;

      const safeFile = input.nombre_original.replace(/[^a-zA-Z0-9._-]/g, '_');
      const relativePath = path.posix.join(tarea.sede_id, tarea.id, doc.id, `${crypto.randomUUID()}_${safeFile}`);
      const fullDiskPath = path.join(this.storageDir, ...relativePath.split('/'));
      fs.mkdirSync(path.dirname(fullDiskPath), { recursive: true });
      fs.writeFileSync(fullDiskPath, input.fileBuffer);

      const version: DocumentoVersion = {
        id: crypto.randomUUID(),
        documento_id: doc.id,
        sede_id: tarea.sede_id,
        numero_version: nextNum,
        etiqueta,
        archivo_path: relativePath,
        nombre_original: input.nombre_original,
        mime_type: input.mime_type || 'application/octet-stream',
        tamano_bytes: input.fileBuffer.byteLength,
        hash_sha256: hash,
        hash_duplicado_en_documento: Boolean(dup),
        autor_id: actor.id,
        descripcion_cambio: input.descripcion_cambio.trim(),
        es_vigente: false, // Cargar una revisión NUNCA la convierte automáticamente en oficial
        designada_por: null,
        designada_en: null,
        creado_en: nowIso,
      };
      db.versiones.push(version);

      return {
        ok: true,
        http_status: 201,
        data: {
          documento_id: doc.id,
          version_id: version.id,
          etiqueta: version.etiqueta,
          es_vigente: false,
          hash_sha256: hash,
          advertencia_hash_duplicado: dup
            ? `El archivo cargado es idéntico a una versión previa (${dup.etiqueta}) de este documento.`
            : null,
        },
      };
    });
  }

  public async designarVersionVigente(actor: PerfilUsuario, versionId: string): Promise<ApiResult> {
    return this.withWriteLock((db) => {
      // PER-007 / FUE-005: Exclusivamente Gerencia de Sede (DN y OP bloqueados)
      if (actor.rol !== 'GS' || !actor.sede_id) {
        return buildErrorResult(
          'ERR-001',
          'ERR-001: Únicamente la Gerencia de Sede puede designar una versión como Oficial / Vigente.',
          403
        );
      }
      const ver = db.versiones.find((v) => v.id === versionId);
      if (!ver || ver.sede_id !== actor.sede_id) {
        return buildErrorResult('ERR-001', 'Acceso denegado: el documento no pertenece a su sede.', 403);
      }
      const nowIso = new Date().toISOString();
      for (const other of db.versiones) {
        if (other.documento_id === ver.documento_id && other.es_vigente) {
          other.es_vigente = false;
        }
      }
      ver.es_vigente = true;
      ver.designada_por = actor.id;
      ver.designada_en = nowIso;
      return {
        ok: true,
        http_status: 200,
        data: { documento_id: ver.documento_id, version_id: ver.id, etiqueta: ver.etiqueta },
      };
    });
  }

  public getArchivoVersion(
    actor: PerfilUsuario,
    versionId: string
  ): { ok: true; buffer: Buffer; mimeType: string; nombreOriginal: string } | ApiResult {
    const db = this.loadState();
    const ver = db.versiones.find((v) => v.id === versionId);
    if (!ver) return buildErrorResult('ERR-002', 'Versión documental no encontrada.', 404);
    const doc = db.documentos.find((d) => d.id === ver.documento_id);
    const tarea = doc ? db.tareas.find((t) => t.id === doc.tarea_id) : undefined;
    if (!tarea) return buildErrorResult('ERR-002', 'Tarea asociada no encontrada.', 404);
    if (actor.rol === 'GS' && tarea.sede_id !== actor.sede_id) {
      return buildErrorResult('ERR-001', 'Acceso denegado a documentos de otra sede.', 403);
    }
    if (actor.rol === 'OP' && tarea.responsable_id !== actor.id) {
      return buildErrorResult('ERR-001', 'Acceso denegado a documentos de tareas ajenas.', 403);
    }
    const fullDiskPath = path.join(this.storageDir, ...ver.archivo_path.split('/'));
    if (!fs.existsSync(fullDiskPath)) {
      return buildErrorResult('ERR-005', 'Archivo no localizado en almacenamiento local.', 404);
    }
    return {
      ok: true,
      buffer: fs.readFileSync(fullDiskPath),
      mimeType: ver.mime_type,
      nombreOriginal: ver.nombre_original,
    };
  }

  public listCorreosSimulados(actor: PerfilUsuario): CorreoSimulado[] {
    const db = this.loadState();
    const visible = db.correos.filter((c) => {
      if (actor.rol === 'DN') return true;
      if (actor.rol === 'GS') return c.sede_id === actor.sede_id;
      if (c.destinatario_usuario_id === actor.id) return true;
      if (!c.tarea_id) return false;
      const t = db.tareas.find((x) => x.id === c.tarea_id);
      return t?.responsable_id === actor.id;
    });
    return visible
      .map((c) => {
        const t = c.tarea_id ? db.tareas.find((x) => x.id === c.tarea_id) : undefined;
        const s = c.solicitud_id ? db.solicitudes.find((x) => x.id === c.solicitud_id) : undefined;
        const sede = db.sedes.find((x) => x.id === c.sede_id);
        return {
          ...c,
          tarea_folio: t?.folio ?? null,
          solicitud_folio: s?.folio ?? null,
          sede_nombre: sede?.nombre ?? c.sede_id,
        };
      })
      .sort((a, b) => b.fecha_hora_prevista.localeCompare(a.fecha_hora_prevista));
  }

  public async evaluarRecordatoriosSimulados(actor: PerfilUsuario, fechaEvaluacionIso?: string): Promise<ApiResult> {
    return this.withWriteLock((db) => {
      const evalDate = fechaEvaluacionIso ? new Date(fechaEvaluacionIso) : new Date();
      if (Number.isNaN(evalDate.getTime())) {
        return buildErrorResult('ERR-002', 'Fecha de evaluación inválida.', 422);
      }
      const evalMs = evalDate.getTime();
      const evalIso = evalDate.toISOString();
      let emitidos = 0;
      let cancelados = 0;

      for (const c of db.correos) {
        if (c.estado !== 'PROGRAMADO') continue;
        if (c.motivo_aviso !== 'RECORDATORIO_48H' && c.motivo_aviso !== 'RECORDATORIO_24H') continue;
        if (!c.tarea_id) continue;
        const t = db.tareas.find((x) => x.id === c.tarea_id);
        if (!t) continue;
        const permitido =
          actor.rol === 'DN' || (actor.rol === 'GS' && c.sede_id === actor.sede_id) || (actor.rol === 'OP' && t.responsable_id === actor.id);
        if (!permitido) continue;

        if (t.estado === 'COMPLETADA' || t.estado === 'CANCELADA') {
          c.estado = 'CANCELADO';
          cancelados += 1;
        } else if (Date.parse(c.fecha_hora_prevista) <= evalMs) {
          c.estado = 'EMITIDO';
          c.emitido_en = evalIso;
          emitidos += 1;
        }
      }

      return {
        ok: true,
        http_status: 200,
        data: {
          fecha_evaluada: evalIso,
          recordatorios_emitidos: emitidos,
          recordatorios_cancelados: cancelados,
        },
      };
    });
  }

  public obtenerMetricasDashboard(actor: PerfilUsuario): MetricaSede[] {
    const db = this.loadState();
    const nowMs = Date.now();
    const sedes = db.sedes.filter((s) => actor.rol === 'DN' || s.id === actor.sede_id);

    return sedes.map((s) => {
      const tasks = db.tareas.filter((t) => {
        if (t.sede_id !== s.id) return false;
        if (actor.rol === 'DN') return true;
        if (actor.rol === 'GS') return true;
        return t.responsable_id === actor.id;
      });
      const activas = tasks.filter((t) => t.estado !== 'CANCELADA');
      const pendientes = tasks.filter((t) => t.estado === 'ASIGNADA' || t.estado === 'EN_PROCESO');
      const retrasadas = pendientes.filter((t) => Date.parse(t.fecha_limite) < nowMs);
      const completadas = tasks.filter((t) => t.estado === 'COMPLETADA');
      const avg =
        activas.length > 0 ? Math.round((activas.reduce((acc, t) => acc + t.porcentaje_avance, 0) / activas.length) * 10) / 10 : 0;
      const solicitudesPendientes = db.solicitudes.filter((sol) => {
        if (sol.sede_id !== s.id || sol.estado !== 'PENDIENTE_REVISION') return false;
        if (actor.rol === 'OP') {
          const t = db.tareas.find((x) => x.id === sol.tarea_id);
          return t?.responsable_id === actor.id;
        }
        return true;
      }).length;

      return {
        sede_id: s.id as SedeId,
        sede_nombre: s.nombre,
        total_tareas: tasks.length,
        pendientes: pendientes.length,
        retrasadas: retrasadas.length,
        completadas: completadas.length,
        avance_promedio: avg,
        solicitudes_pendientes: solicitudesPendientes,
      };
    });
  }
}

const globalForEngine = globalThis as unknown as { __ocLocalEngine?: LocalTransactionalEngine };

export function getLocalEngine(): LocalTransactionalEngine {
  if (!globalForEngine.__ocLocalEngine) {
    globalForEngine.__ocLocalEngine = new LocalTransactionalEngine();
  }
  return globalForEngine.__ocLocalEngine;
}
