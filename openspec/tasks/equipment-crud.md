# Tasks: Equipment CRUD + Equipment Types

## Review Workload Forecast

- **Estimated changed lines**: ~450
- **Files created**: 4
- **Files modified**: 1
- **400-line budget risk**: Medium
- **Chained PRs recommended**: No (single PR, within reason)
- **Decision needed before apply**: No

## Tareas

### T1: Equipment Types CRUD

- [x] **Archivos**:
  - `src/routes/equipos/tipos/+page.server.ts` (CREATE)
  - `src/routes/equipos/tipos/+page.svelte` (CREATE)
- **Dependencias**: UI scaffold existente (DataTable, FormField, ConfirmDialog)
- **Descripción**: Mismo patrón que Proveedores pero para tipos de equipo. Entidad chica (nombre, descripcion, icono). Modal inline con FormField nombre, textarea descripcion, input icono. Admin-only (restricción en hooks).
- **Schema**: `equipment_types` ya existe

### T2: Equipment List + Server Actions

- [x] **Archivos**:
  - `src/routes/equipos/+page.server.ts` (CREATE)
  - `src/routes/equipos/+page.svelte` (CREATE)
- **Dependencias**: UI scaffold, T1
- **Load**: query equipment con JOIN a equipment_types y proveedores, search por modelo/marca/numero_serie, filter por estado y tipo_id, pagination. Return `{ equipment, tipos, proveedores, total, page, filters }`.
- **Actions**: crud unificada como en Proveedores:
  - `create`: validar modelo/marca/tipo_id required, insert
  - `update`: validar, update
  - `delete`: check tickets referencing this equipment, check status_history, then delete or error

### T3: Equipment Form + Status History

- [x] (incluido en T2)
- **Archivos**: Modificar `+page.svelte` y `+page.server.ts` de T2
- **Form**: campos — tipo (select from tipos), numero_serie, modelo, marca, estado (select: operativo/en_reparacion/dado_de_baja/prestado), ubicacion, fecha_adquisicion (date), proveedor (select from proveedores), notas (textarea)
- **Status history**: en el action `update`, si `estado` cambió, insertar en `equipment_status_history` con estado_anterior, estado_nuevo, cambiado_por (user id)

## Files total

- `src/routes/equipos/+page.server.ts` — load + actions
- `src/routes/equipos/+page.svelte` — listado + modal form
- `src/routes/equipos/tipos/+page.server.ts` — load + actions tipos
- `src/routes/equipos/tipos/+page.svelte` — CRUD tipos
- `src/routes/equipos/+page.server.ts` modificado con status history tracking

## Notas

- El scaffold de Proveedores se reusa COMPLETAMENTE: DataTable, FormField, ConfirmDialog, Pagination, Badge
- Los select de tipo y proveedor cargan opciones desde el load (return tipos[], proveedores[])
- Equipment types es accesible desde un botón "Tipos" en la página de equipos, o desde un link en la sidebar (subruta /equipos/tipos)
- La sidebar ya tiene "Equipos" con href=/equipos
- El badge se usa para mostrar el estado del equipo con color (operativo=success, en_reparacion=warning, dado_de_baja=danger, prestado=info)
