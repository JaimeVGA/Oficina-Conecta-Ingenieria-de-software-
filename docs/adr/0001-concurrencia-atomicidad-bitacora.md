# ADR 0001: Arquitectura de Concurrencia, Atomicidad y Bitácora Append-Only

- **Estado:** Aceptado
- **Fecha:** 2026-11-18
- **Contexto del Proyecto:** Oficina Conecta (Grupo 502-A, Equipo I)
- **Decisores:** Roberto Salinas (Cliente / DN), Jaime Fabian Cortes Vega (Líder / Arquitecto)

---

## Contexto y Planteamiento del Problema

El sistema gestiona autorizaciones sobre tareas críticas distribuidas en 3 sedes (CDMX, Oaxaca, Puebla). Existía el riesgo de resoluciones simultáneas conflictivas sobre una misma solicitud, desfase entre el cambio de fecha de una tarea y su bitácora histórica, y manipulación o borrado accidental/malicioso de autorizaciones pasadas. Además, si la fecha de una tarea cambia mientras hay una solicitud pendiente, aplicar una prórroga sobre una fecha vieja corrompería la planificación.

## Factores de Decisión

1. **Integridad Transaccional ACID:** Garantizar que nunca exista una tarea modificada sin su traza en la bitácora, ni una bitácora registrada sin el cambio aplicado (`CAL-001 = 0%`).
2. **Concurrencia Pesimista Sin Deadlocks:** Notificar con mensaje claro (`ERR-004`) al segundo directivo que intente resolver la misma solicitud, indicando quién resolvió y con qué dictamen.
3. **Protección Histórica Fidedigna:** Asegurar que ningún usuario de la aplicación pueda sobrescribir (`UPDATE`) o eliminar (`DELETE`) registros de la bitácora (`PER-008`).
4. **Respeto a las Reglas de Negocio del Cliente:** Invalidar solicitudes desactualizadas conservando ambos motivos (`RN-003`).

## Opciones Consideradas

- **Opción A (Bloqueo Optimista en Servidor Node/Next.js):** Comparar versión del registro en memoria en la capa API de Next.js.
  - *Desventaja:* No tolera múltiples instancias serverless ni peticiones simultáneas directas a la base de datos; la atomicidad requeriría complejas transacciones distribuidas en el cliente.
- **Opción B (Procedimientos Almacenados PostgreSQL PL/pgSQL + RLS + Bloqueo Pesimista):** Implementar la lógica crítica dentro del motor de base de datos usando `SELECT ... FOR UPDATE`, encapsulando tarea, proyecto, solicitud, bitácora y avisos en una única transacción nativa.

## Decisión Tomada

Se elige la **Opción B**.

Se aprueba implementar la función RPC `resolver_solicitud_autorizacion` con:
1. **Orden estricto de bloqueo anti-deadlock:** Bloquear primero la fila de `tareas FOR UPDATE`, luego `solicitudes_autorizacion FOR UPDATE` y posteriormente `proyectos FOR UPDATE`.
2. **Doble comprobación de vigencia:** Al hacer clic en resolver, si `tarea.fecha_limite IS DISTINCT FROM solicitud.fecha_referencia`, la solicitud se marca como `INVALIDADA_POR_DESACTUALIZACION` (conservando motivo original y motivo de invalidación) y se retorna `ERR-004` (HTTP 409) sin modificar la tarea.
3. **Defensa en profundidad para Append-Only:**
   - Revocación explícita de privilegios: `REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON bitacora_autorizaciones FROM PUBLIC, anon, authenticated;`.
   - Trigger a nivel de tabla que arroja excepción con código `42501` ante cualquier intento de `UPDATE`, `DELETE` o `TRUNCATE`.
4. **Idempotencia en Resolución:** Soporte de `idempotency_key` único por dictamen para devolver la confirmación original sin duplicar si se corta la conexión.
5. **Inyección Controlada de Fallo (CP-002):** Trigger condicionado a la tabla interna `configuracion_pruebas` para verificar que un fallo en la bitácora ejecuta `ROLLBACK` total en PostgreSQL.

## Consecuencias y Efectos

- **Positivas:**
  - Garantía matemática de consistencia ACID en la base de datos sin depender del estado del servidor web.
  - Mitigación absoluta de condiciones de carrera entre directivos.
  - Cumplimiento inquebrantable de `PER-008` (imposibilidad técnica de alterar el historial).
- **Negativas / Compensaciones:**
  - Toda mutación de estado crítico debe realizarse mediante llamadas RPC autenticadas (`supabase.rpc`), prohibiendo mutaciones REST directas a las tablas de tareas y autorizaciones.
