# Glosario de Dominio — Oficina Conecta (Grupo 502-A, Equipo I)

> Fuente de verdad canónica: [502_A_1.pdf](file:///C:/Users/corte/Documents/Oficina-Conecta-Ingenieria-de-software-/502_A_1.pdf) (Línea Base v1.0, acuerdo `FUE-011`).  
> Este glosario define el vocabulario estricto del dominio de negocio. Está desprovisto de detalles de implementación de bajo nivel y rige la nomenclatura de modelos, interfaces y pruebas.

---

### Sede
Unidad física territorial y centro operativo de la organización. El alcance cerrado del sistema abarca exactamente tres sedes piloto: **Ciudad de México** (`CDMX`), **Oaxaca de Juárez** (`OAXACA`) y **Puebla de Zaragoza** (`PUEBLA`). Cada sede opera bajo un principio de aislamiento horizontal estricto.

### Departamento
División funcional interna de una sede (por ejemplo: *Operaciones*, *Infraestructura*, *Logística*, *Supervisión Regional*, *Mantenimiento*, *Redes y Soporte*). Todo departamento pertenece a una y solo una sede.

### Personal Operativo (OP)
Rol de usuario asignado a una sede y departamento. Consulta exclusivamente las tareas que tiene asignadas y sus documentos asociados; registra avances de ejecución, carga revisiones de documentos (`v1`, `v2`...) y emite solicitudes de prórroga o cambio de alcance. No puede visualizar las tareas asignadas a otros colaboradores.

### Gerencia de Sede (GS)
Rol con autoridad administrativa sobre los proyectos, departamentos, tareas y personal de su sede física. Resuelve solicitudes de prórroga de hasta 5 días naturales (que no alteren la fecha fin del proyecto) y es la **única autoridad facultada para designar la versión oficial / vigente de un documento**. Tiene prohibido consultar o modificar información de sedes ajenas.

### Dirección Nacional (DN)
Rol corporativo de supervisión transversal con visibilidad analítica global sobre todas las sedes, proyectos, tareas, métricas e historial de autorizaciones. Resuelve solicitudes de prórroga mayores a 5 días naturales, prórrogas que afecten la fecha fin de un proyecto, cambios de alcance o cualquier solicitud donde el solicitante sea un Gerente de Sede. No interviene en la administración de tareas locales ni puede designar la vigencia de documentos de una sede.

### Proyecto
Conjunto estructurado de tareas agrupadas en un departamento de una sede con una fecha fin establecida (`fecha_fin_proyecto`). Una tarea no puede tener una fecha límite posterior a la fecha fin del proyecto al que pertenece.

### Tarea
Unidad elemental de trabajo asignada por la Gerencia de Sede a un integrante del Personal Operativo de esa misma sede. Posee título, alcance, fecha límite (almacenada en UTC y evaluada en zona horaria `America/Mexico_City`), estado (`ASIGNADA`, `EN_PROCESO`, `COMPLETADA`, `CANCELADA`), porcentaje de avance (0 a 100%) y secuencia de calendario (`sequence_ics`).

### Solicitud de Autorización
Petición formal y auditable emitida por Personal Operativo o Gerente de Sede para modificar una tarea activa. Solo admite dos tipos:
1. **Prórroga de Fecha:** Solicitud de días naturales adicionales respecto a la fecha límite vigente al momento de emitir la petición.
2. **Cambio de Alcance:** Modificación a la descripción y especificación de entregables de la tarea.

Toda solicitud nace en estado `PENDIENTE_REVISION` y conserva la fecha y alcance de referencia. No altera la tarea vigente hasta su eventual aprobación.

### Dictamen
Decisión humana emitida por la autoridad facultada (`GS` o `DN`) ante una solicitud de autorización. Sus valores terminales son **APROBADA** (aplica el cambio en la tarea y reprograma recordatorios) o **RECHAZADA** (mantiene la tarea intacta). Requiere obligatoriamente un motivo de resolución no vacío. Nadie puede dictaminar su propia solicitud.

### Invalidación por Desactualización (`INVALIDADA_POR_DESACTUALIZACION`)
Estado terminal automático que adquiere una solicitud de autorización pendiente cuando la fecha límite de la tarea asociada cambia (por la aprobación de otra solicitud o por edición local) antes de que la solicitud en curso sea resuelta. La solicitud invalidada no se elimina del sistema: conserva tanto el motivo original del solicitante como el motivo y fecha de invalidación para fines de auditoría.

### Bitácora de Autorizaciones
Registro histórico continuo de resoluciones de solicitudes de autorización. Es de **solo adición (append-only)**: ningún usuario, rol de aplicación o cliente de base de datos tiene privilegios para actualizar (`UPDATE`) o eliminar (`DELETE`) sus registros. La actualización de la tarea y la inserción en la bitácora conforman una operación atómica indivisible: si la inserción en bitácora falla, la tarea mantiene intacto su estado previo (`ROLLBACK`).

### Idempotencia
Propiedad por la cual una operación (creación de solicitud o resolución con dictamen) puede repetirse múltiples veces ante cortes de comunicación o reintentos del usuario sin duplicar registros en el sistema ni generar efectos secundarios inconsistentes. Se gobierna mediante una clave única (`idempotency_key` UUID).

### Documento de Tarea
Entregable lógico asociado a una tarea (una tarea puede tener múltiples documentos distintos). Cada documento posee su propio historial de versiones consecutivas numeradas (`v1`, `v2`, `v3`...).

### Versión Vigente / Oficial
Única versión activa designada oficialmente por la **Gerencia de Sede** para un documento determinado. Cargar una nueva revisión nunca la convierte automáticamente en vigente; permanece en estado de revisión hasta su designación explícita.

### Hash de Contenido (SHA-256)
Identificador criptográfico calculado sobre el archivo cargado para advertir si el contenido es idéntico a una versión previa de **ese mismo documento**. No restringe ni bloquea que el mismo archivo sea reutilizado en documentos o tareas distintas.

### Borrador Local
Información capturada en el navegador del usuario y almacenada temporalmente en `sessionStorage` para tolerar interrupciones de conexión a internet. Se etiqueta visiblemente como *"Borrador local no guardado en servidor"*. Al restablecerse la red, nunca se auto-envía. Al expirar la sesión por inactividad (15 minutos) o al cerrar sesión manualmente, se purga de forma inmediata y definitiva de la memoria del cliente.

### Correo Simulado
Notificación del sistema registrada en la bandeja de auditoría sin interactuar con servidores de correo reales. Cubre cuatro motivos canónicos: **Asignación**, **Solicitud**, **Resolución** y **Recordatorio de Vencimiento (48h y 24h)**. Cada correo simulado cuenta con clave de evento determinista para impedir duplicaciones por recargas de interfaz.

### Secuencia de Calendario (`sequence_ics`)
Contador numérico incremental (iniciado en `0`) asociado a cada tarea y reflejado en el estándar RFC 5545 (`.ics`). Permite que un cliente de calendario externo (como Google Calendar o Mozilla Thunderbird) actualice la cita existente identificada con su `UID` persistente sin generar eventos duplicados tras una prórroga aprobada.
