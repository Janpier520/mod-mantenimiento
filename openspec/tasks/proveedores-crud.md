# Tasks: Módulo Proveedores + Scaffold CRUD

## Review Workload Forecast

- **Estimated changed lines**: ~350
- **Files created**: 7 (5 UI components + 2 route files)
- **Files modified**: 0
- **400-line budget risk**: Low
- **Chained PRs recommended**: No
- **Decision needed before apply**: No

## Tareas

### T1: Componente Badge

- [x] **Archivo**: `src/lib/ui/Badge.svelte`
- **Dependencias**: ninguna
- **Descripción**: Componente de badge con variantes de color (default/success/warning/danger/info). Usa colores del theme actual (bg-* y text-* con Tailwind).
- **Verificación**: Renderiza cada variante correctamente

### T2: Componente FormField

- [x] **Archivo**: `src/lib/ui/FormField.svelte`
- **Dependencias**: ninguna
- **Descripción**: Wrapper de input/select/textarea con label, mensaje de error inline, y bind:value. Soporta type text, email, tel, textarea, select. El error se muestra en rojo debajo del campo con transición.
- **Verificación**: Input renderiza con label, error se muestra/oculta, bind:value funciona

### T3: Componente ConfirmDialog

- [x] **Archivo**: `src/lib/ui/ConfirmDialog.svelte`
- **Dependencias**: ninguna
- **Descripción**: Modal de confirmación con overlay, transición fade/scale, eventos onconfirm/oncancel. Soporta variante danger (botón rojo). Escape cierra, click en overlay cierra. Usa `svelte:transition`.
- **Verificación**: Modal se abre/cierra, onconfirm/oncancel se disparan, variante danger muestra botón rojo

### T4: Componente Pagination

- [x] **Archivo**: `src/lib/ui/Pagination.svelte`
- **Dependencias**: ninguna
- **Descripción**: Paginación con botones anterior/siguiente, números de página, total de resultados. Oculta si totalPages <= 1. Responsive.
- **Verificación**: Navegación funciona con 3+ páginas, se oculta con 1 página

### T5: Componente DataTable

- [x] **Archivo**: `src/lib/ui/DataTable.svelte`
- **Dependencias**: Badge, Pagination
- **Descripción**: Tabla con search input, columnas configurables (key, label, sortable), loading state (skeleton shimmer), empty state slot, actions slot por fila, integrada con Pagination.
- **Verificación**: Renderiza items, search llama callback, loading muestra skeleton, empty muestra slot, pagination funciona

### T6: Server Actions + Load — Proveedores

- [x] **Archivos**:
  - `src/routes/proveedores/+page.server.ts` (CREAR)
  - `src/routes/proveedores/+page.svelte` (CREAR)
- **Dependencias**: T1-T5 (componentes UI)
- **Descripción**:
  - `load()`: queries proveedores con paginación (LIMIT/OFFSET), búsqueda (LIKE sobre nombre y contacto), orden alfabético. Retorna `{ proveedores, total, page, totalPages, search }`.
  - `actions.crud`: switch por `_action` (create/update/delete). Validación server-side. Manejo de error de unicidad y referencia foránea.
  - Página Svelte: search input, DataTable con proveedores, modal de formulario (crear/editar), ConfirmDialog para delete, toasts con feedback.
- **Verificación**: CRUD completo funcional, búsqueda filtra, paginación funciona, dark mode funciona, roles respetados

## Orden de ejecución

```
T1 (Badge) → T2 (FormField) → T3 (ConfirmDialog) → T4 (Pagination) → T5 (DataTable)
  → T6 (Proveedores route + page)
```

T1-T5 son independientes entre sí (excepto T5 que depende de T4) y se pueden ejecutar en paralelo. T6 depende de todos los anteriores.

## Notas para Apply

- Los componentes UI van en `src/lib/ui/` (crear carpeta si no existe)
- El modal de formulario usa `svelte:transiton` con fade + scale (300ms)
- Los toasts se implementan con un simple `$state()` en la página, no se necesita sistema de toasts global
- El formulario es el mismo para crear y editar — cambia el título y el action
- `use:enhance` en el form del modal: en `onresult` cerrar modal y llamar `invalidate()`
- No se agregan dependencias npm nuevas
- Los iconos de acciones (editar/eliminar) usan SVGs inline como los de la navegación
