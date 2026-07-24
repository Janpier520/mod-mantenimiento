# Propuesta: Módulo Proveedores + Scaffold CRUD

## Intent

Implementar el módulo de Proveedores (ABM completo) y, en el proceso, establecer el scaffold de componentes reutilizables (DataTable, FormField, ConfirmDialog, Badge) que servirán para todos los módulos CRUD siguientes.

## Justificación

Proveedores es la entidad más pequeña del dominio (6 campos), lo que permite validar el patrón CRUD completo en SvelteKit 5 con riesgo mínimo. Una vez establecido, Equipment, Tickets, Equipment Types, Usuarios y demás módulos siguen exactamente el mismo patrón — cambian las columnas, no la arquitectura.

## Alcance

### Incluye

1. Componentes UI compartidos:
   - `DataTable.svelte` — tabla con columnas configurables, search, sort, slot para acciones
   - `FormField.svelte` — wrapper de input/select/textarea con label y mensaje de error
   - `ConfirmDialog.svelte` — modal de confirmación para acciones destructivas
   - `Badge.svelte` — badge de estado con color configurable
   - `Pagination.svelte` — paginación con límite configurable

2. Módulo Proveedores (todo en una ruta con modal):
   - Listado paginado con búsqueda
   - Creación via modal inline
   - Edición via modal inline (reusa el mismo formulario)
   - Eliminación con confirmación
   - Load functions con validación de roles (admin, consultor)
   - Server actions (create, update, delete)

### Excluye

- Equipment CRUD (siguiente cambio)
- Tickets, Mantenimiento, etc.
- Exportación a CSV/PDF
- Importación masiva

## Dependencias

- Schema de `proveedores` ya existe en `schema.ts`
- Seed data de 2 proveedores ya existe en `seed.ts`
- Ruta `/proveedores` ya tiene restricción por roles en `hooks.server.ts` (admin, consultor)

## Riesgos

- Sin tests, los bugs se detectan en verify manual
- El modal inline puede ser más complejo que rutas separadas si los forms tienen mucha validación
- Los componentes scaffold pueden necesitar pequeños ajustes al aplicarse a entidades más grandes

## Criterios de Éxito

- Listado de proveedores con datos del seed visibles
- Crear, editar y eliminar proveedores sin recargar la página (use:enhance)
- Búsqueda por nombre/contacto
- Diseño consistente con el layout actual (glass-card, bg-grain)
- Dark mode funciona en todas las vistas
- Roles respetados (consultor y admin pueden ver/editar)
