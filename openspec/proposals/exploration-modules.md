# Exploration: Próximo Cambio — Módulo CRUD

## Estado Actual

PR1 (Foundation) completo: schema completo con 12 tablas + relations, auth (bcrypt + sessions), login con acciones SvelteKit, layout con sidebar, dark mode funcional, hooks con ruteo por roles, seed data. Dashboard con placeholders.

Los módulos de negocio (equipos, tickets, mantenimiento, proveedores) están **sin implementar**.

## Enfoques

### 1. Proveedores CRUD primero — Recomendado

Entidad más chica (6 campos: nombre, contacto, teléfono, email, dirección). Establece el patrón CRUD completo en SvelteKit 5: `+page.server.ts` (load + actions), `+page.svelte` (formularios Svelte 5), DataTable, search, delete. Luego se replica en Equipment.

- **Pros**: Entrega rápido, establece scaffold reusable, bajo riesgo
- **Cons**: No es la entidad principal, hay que refactorizar después
- **Esfuerzo**: Bajo (~8 archivos)

### 2. Equipment read-only + Equipment Types CRUD

Listado de equipos con búsqueda (solo lectura) + CRUD completo de tipos de equipo. Los tipos son una entidad chica (nombre, descripción, icono).

- **Pros**: Valor inmediato (ver equipos), establece DataTable
- **Cons**: Deja el CRUD de equipos para después, duplica esfuerzo
- **Esfuerzo**: Medio

### 3. Shared CRUD scaffold primero

Componentes reutilizables (DataTable, FormField, ConfirmDialog, SearchInput, Pagination) sin implementar ninguna feature.

- **Pros**: Pattern establecido antes de features
- **Cons**: No entrega valor visible, riesgo de abstracción prematura
- **Esfuerzo**: Medio (componentes puros)

### 4. Equipment CRUD completo

Todo el módulo de equipos de una: listado, creación, edición, vista detalle, eliminación + tipos de equipo + historial de estados.

- **Pros**: Feature completa, máximo valor
- **Cons**: Muchos archivos, riesgo de diff enorme (>400 líneas)
- **Esfuerzo**: Alto (~15+ archivos)

## Recomendación

**Enfoque 1: Proveedores CRUD primero.**

Razones:

1. Entidad mínima (6 fields) → ciclo rápido de feedback
2. Establece el patrón completo: DataTable, formulario modal/in-page, delete con confirmación, search
3. Ese scaffold se reusa DIRECTAMENTE en Equipment, Tickets, etc. sin refactor — son el mismo patrón
4. Proveedores ya existe en schema y seed data
5. Ponytail: hacé el mínimo que prueba el patrón, después replicá

## Archivos a crear/modificar

### Scaffold compartido (se crea con Proveedores, se reusa en todo)

- `src/lib/ui/DataTable.svelte` — Tabla con search, sort, slots
- `src/lib/ui/FormField.svelte` — Wrapper input/select/textarea con label + error
- `src/lib/ui/ConfirmDialog.svelte` — Modal de confirmación para delete
- `src/lib/ui/Pagination.svelte` — Paginación
- `src/lib/ui/Badge.svelte` — Badge de estado

### Módulo Proveedores

- `src/routes/proveedores/+page.svelte` — Listado
- `src/routes/proveedores/+page.server.ts` — Load + actions (create, update, delete)
- `src/routes/proveedores/[id]/+page.svelte` — Edición/Detalle
- `src/routes/proveedores/[id]/+page.server.ts` — Load por ID + update action
- `src/routes/proveedores/nuevo/+page.svelte` — Creación
- `src/routes/proveedores/nuevo/+page.server.ts` — Load + create action

Simplified: en lugar de rutas separadas para nuevo/editar, usar un modal o inline form en la misma página del listado (como hacen la mayoría de los dashboards modernos). Menos archivos, misma funcionalidad.

## Riesgos

- SvelteKit 5 form actions + modales requiere manejar estados de formulario con `$props()` y `actionData`
- Sin tests, los bugs se cuelan hasta el verify manual
- El scaffold compartido puede necesitar ajustes al aplicarlo a entidades más complejas

## Ready for Proposal

Yes
