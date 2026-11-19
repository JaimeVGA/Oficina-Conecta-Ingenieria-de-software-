# ADR 0002: Control Documental con Vigencia Exclusiva por Gerencia de Sede

- **Estado:** Aceptado
- **Fecha:** 2026-11-18
- **Contexto del Proyecto:** Oficina Conecta (Grupo 502-A, Equipo I)
- **Decisores:** Roberto Salinas (Cliente / DN), Jaime Fabian Cortes Vega (Líder / Arquitecto)

---

## Contexto y Planteamiento del Problema

En las entrevistas previas (`FUE-001`, `FUE-003`, `FUE-005`), el cliente Roberto Salinas detectó descontrol en los archivos entregables de proyectos ("final", "final corregido", "ahora sí final"). Inicialmente se propuso un esquema donde Dirección Nacional también pudiera declarar versiones oficiales y usar versionado semántico. El cliente rechazó enfáticamente esto: la designación de versión oficial es responsabilidad local de la Gerencia de Sede, las versiones deben ser consecutivas simples (`v1`, `v2`, `v3`...) y una tarea debe permitir múltiples documentos lógicos independientes.

## Factores de Decisión

1. **Alineación con la Matriz RBAC (`PER-007`):** Únicamente la Gerencia de Sede puede declarar una versión como oficial/vigente. Personal Operativo y Dirección Nacional deben tener este privilegio revocado tanto en interfaz como en base de datos (`HTTP 403 / ERR-001`).
2. **Cardinalidad Multidocumento:** Una tarea contiene $1:N$ documentos lógicos, y cada documento contiene $1:N$ versiones consecutivas.
3. **Detección de Archivos Idénticos Sin Bloqueo Indebido (`RN-005`):** Advertir si se sube el mismo contenido mediante hash SHA-256 **dentro del mismo documento**, pero sin bloquear la carga ni impedir el uso de un mismo archivo en tareas distintas.
4. **Almacenamiento Seguro:** Uso de bucket privado de Supabase Storage (`documentos-tareas`) con URLs de descarga firmadas y temporales (60 segundos).

## Decisión Tomada

1. **Modelo de Datos en 2 Niveles:**
   - `documentos_tarea`: Agrupa el concepto lógico del entregable dentro de una tarea (p. ej. "Acta de Calibración").
   - `documento_versiones`: Almacena cada entrega consecutiva (`v1`, `v2`, `v3`...), tamaño, mime type, hash SHA-256 y descripción del cambio.
2. **Regla de Versión Vigente Única:**
   - Se crea un índice parcial único en PostgreSQL: `CREATE UNIQUE INDEX uq_documento_unica_version_vigente ON documento_versiones (documento_id) WHERE es_vigente = TRUE;`.
   - Cargar una revisión siempre inicia con `es_vigente = FALSE` ("En Revisión").
3. **RPC Exclusiva de Vigencia:**
   - La función `designar_version_vigente(version_id)` valida estrictamente `auth_rol() = 'GS'` y que la sede coincida. Si `DN` u `OP` intentan invocarla, reciben `ERR-001` (HTTP 403).
4. **Verificación de Hash SHA-256 en Cliente y Servidor:**
   - Se calcula el SHA-256 en el navegador con la Web Crypto API y se consulta la RPC `verificar_hash_documento`. Si coincide con una versión previa de ese documento, se despliega una advertencia no bloqueante.

## Consecuencias y Efectos

- **Positivas:**
  - Se erradica por completo la confusión de archivos nombrados informalmente.
  - Se respeta estrictamente la autonomía y delimitación de funciones de la Gerencia de Sede exigida por el cliente.
  - La descarga de archivos requiere autenticación y permisos sobre la tarea correspondiente.
- **Negativas / Compensaciones:**
  - Requiere almacenamiento en Supabase Storage gobernado por convenciones de carpetas `{sede_id}/{tarea_id}/{doc_id}/` vinculadas a las políticas de seguridad.
