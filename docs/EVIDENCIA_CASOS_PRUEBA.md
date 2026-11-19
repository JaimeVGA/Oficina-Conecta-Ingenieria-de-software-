# Evidencia de Casos de Prueba — Oficina Conecta (Grupo 502-A, Equipo I)

> **Fecha de ejecución:** 2026-11-18  
> **Fuente de verdad contractual:** [502_A_1.pdf](file:///C:/Users/corte/Documents/Oficina-Conecta-Ingenieria-de-software-/502_A_1.pdf) (Línea Base v1.0, `FUE-011`)  
> **Nota de alcance:** Las pruebas de base de datos/lógica se ejecutaron contra el motor transaccional local en TypeScript (`src/lib/backend/localEngine.ts`) que replica las invariantes del DDL PostgreSQL (`supabase/migrations/0001..0004.sql`). La importación manual externa en Google Calendar y Mozilla Thunderbird (`CP-006`) queda documentada para Fase 2 conforme al acuerdo `FUE-011`.

---

## 1. Resumen de Ejecución Automatizada

| Comando Ejecutado | Resultado Observado | Alcance |
|---|---|---|
| `npm run typecheck` | **Exit code 0** (`tsc --noEmit --incremental false`) | Todo el código TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`) |
| `npm test` | **Exit code 0 — 3 archivos / 7 pruebas pasadas** | `tests/unit/dates-mexico-city.test.ts`, `tests/unit/ics-generator.test.ts`, `tests/unit/engine-cps.test.ts` |
| `npm run verify:cp` | **Exit code 0 — 100% casos pasados** | Recorrido Completo E2E + `CP-001`, `CP-002`, `CP-003`, `CP-004`, `CP-005`, generación `CP-006`, y `CP-007` |
| `npm run build` | **Exit code 0 — 21 rutas compiladas + lint/typecheck** | Producción Next.js 14.2.35 App Router |

---

## 2. Detalle por Caso de Prueba

| ID | Descripción | Resultado Obtenido | Evidencia en Repositorio |
|---|---|---|---|
| **E2E** | Asignar tarea (`GS Puebla`) → Prórroga `+4d` (`OP`) → Resolver con bitácora → Actualizar fecha y `sequence_ics` (`0 -> 1`) → Aviso simulado → Exportar `.ics` | **APROBADO (Motor Local)** | [verify-all-cp.ts](file:///C:/Users/corte/Documents/Oficina-Conecta-Ingenieria-de-software-/scripts/verify-all-cp.ts) |
| **CP-001** | Rechazo ante `PUT`/`PATCH`/`DELETE` en `bitacora_autorizaciones` (`PER-008`) | **APROBADO** (`HTTP 403`, `ERR-005`, `SQLSTATE 42501`, 0 alteraciones) | [engine-cps.test.ts](file:///C:/Users/corte/Documents/Oficina-Conecta-Ingenieria-de-software-/tests/unit/engine-cps.test.ts) + [0001_schema_y_restricciones.sql](file:///C:/Users/corte/Documents/Oficina-Conecta-Ingenieria-de-software-/supabase/migrations/0001_schema_y_restricciones.sql) |
| **CP-002** | Resolución concurrente (`Promise.all`) + fallo provocado al insertar en bitácora | **APROBADO** (1ª confirma; 2ª recibe `HTTP 409 ERR-004` con nombre, dictamen y hora; fallo provocado ejecuta `ROLLBACK` total con `HTTP 500 ERR-005`) | [engine-cps.test.ts](file:///C:/Users/corte/Documents/Oficina-Conecta-Ingenieria-de-software-/tests/unit/engine-cps.test.ts) + [verify-all-cp.ts](file:///C:/Users/corte/Documents/Oficina-Conecta-Ingenieria-de-software-/scripts/verify-all-cp.ts) |
| **CP-003** | Idempotencia con `UUID-K1` + umbrales de inactividad cliente (`13m` aviso / `15m` purga `sessionStorage.clear()`) | **APROBADO (Lógica/UUID/Constantes)**; prueba visual en navegador offline lista con controles `Simular Sin Red / 13m / 15m` | [useInactivityTimer.ts](file:///C:/Users/corte/Documents/Oficina-Conecta-Ingenieria-de-software-/src/hooks/useInactivityTimer.ts) + [SessionInactivityGuard.tsx](file:///C:/Users/corte/Documents/Oficina-Conecta-Ingenieria-de-software-/src/components/session/SessionInactivityGuard.tsx) |
| **CP-004** | Cambio de fecha límite antes de resolver → invalidación conservando ambos motivos | **APROBADO** (`INVALIDADA_POR_DESACTUALIZACION`, `HTTP 409 ERR-004`, motivo original + motivo de invalidación conservados) | [engine-cps.test.ts](file:///C:/Users/corte/Documents/Oficina-Conecta-Ingenieria-de-software-/tests/unit/engine-cps.test.ts) + [verify-all-cp.ts](file:///C:/Users/corte/Documents/Oficina-Conecta-Ingenieria-de-software-/scripts/verify-all-cp.ts) |
| **CP-005** | Umbrales de recordatorios (`>48h`, `=48h`, `24–48h`, `=24h`, `<24h`), cancelación al completar y 0 duplicados | **APROBADO** (5 escenarios validados + cancelación + evaluación repetida sin duplicados) | [engine-cps.test.ts](file:///C:/Users/corte/Documents/Oficina-Conecta-Ingenieria-de-software-/tests/unit/engine-cps.test.ts) + [verify-all-cp.ts](file:///C:/Users/corte/Documents/Oficina-Conecta-Ingenieria-de-software-/scripts/verify-all-cp.ts) |
| **CP-006** | Exportación RFC 5545 `tarea_v0.ics` (`SEQUENCE:0`) y `tarea_v1.ics` (`SEQUENCE:1`, mismo `UID`) | **GENERADO Y VALIDADO RFC 5545** (Importación manual externa en Google Calendar / Thunderbird en Fase 2 según `FUE-011`) | [tarea_v0.ics](file:///C:/Users/corte/Documents/Oficina-Conecta-Ingenieria-de-software-/docs/evidencias/cp006/tarea_v0.ics) + [tarea_v1.ics](file:///C:/Users/corte/Documents/Oficina-Conecta-Ingenieria-de-software-/docs/evidencias/cp006/tarea_v1.ics) |
| **CP-007** | Control documental (`v1/v2`, SHA-256 sin bloqueo entre tareas, vigencia exclusiva `GS`) + aislamiento RBAC | **APROBADO** (`OP` y `DN` bloqueados con `HTTP 403` en vigencia documental y auto-aprobación `ERR-003`) | [engine-cps.test.ts](file:///C:/Users/corte/Documents/Oficina-Conecta-Ingenieria-de-software-/tests/unit/engine-cps.test.ts) + [verify-all-cp.ts](file:///C:/Users/corte/Documents/Oficina-Conecta-Ingenieria-de-software-/scripts/verify-all-cp.ts) |
