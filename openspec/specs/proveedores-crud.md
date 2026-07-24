# Spec: Módulo Proveedores + Scaffold CRUD

## Resumen

Módulo de Administración de Proveedores con ABM completo, más componentes UI reutilizables para el resto de los módulos CRUD del sistema.

## Requerimientos Funcionales

### RF1: Listado de Proveedores

- Tabla paginada (10 por página) con columnas: Nombre, Contacto, Teléfono, Email
- Input de búsqueda que filtra por nombre o contacto (server-side con LIKE)
- Botón "Nuevo Proveedor" que abre modal de creación
- Cada fila tiene acciones: Editar (icono lápiz), Eliminar (icono papelera)
- Orden alfabético por nombre por defecto
- Estado vacío: "No hay proveedores cargados. Creá el primero."

### RF2: Crear Proveedor

- Modal con formulario de campos: nombre (req), contacto, teléfono, email, dirección
- Validación server-side: nombre requerido, email formato válido si se ingresa
- Feedback visual de error inline en cada campo
- Al crear: cierra modal, actualiza la lista, muestra toast de éxito
- Tecla Escape cierra modal, click en overlay también

### RF3: Editar Proveedor

- Mismo modal que creación, pre-cargado con datos del proveedor
- Misma validación que creación
- Al guardar: cierra modal, actualiza la fila en la lista, muestra toast

### RF4: Eliminar Proveedor

- ConfirmDialog con: "¿Eliminás a {nombre}? Esta acción no se puede deshacer."
- Botones: Cancelar (gris) / Eliminar (rojo)
- Al confirmar: elimina, saca la fila de la lista, toast de éxito
- Si el proveedor tiene equipos asociados: mostrar error "No se puede eliminar porque tiene equipos asociados"

### RF5: UI Components (scaffold)

- **DataTable**: props para columns (key, label, sortable?), items, loading. Slot para actions por fila. Slot para empty state.
- **FormField**: props para label, name, type (text/email/tel/textarea/select), value, error, placeholder. Maneja bind:value internamente.
- **ConfirmDialog**: props para title, message, confirmLabel, cancelLabel, variant (danger/default). Events: onconfirm, oncancel.
- **Badge**: props para text, variant (default/success/warning/danger/info).
- **Pagination**: props para page, totalPages, onpagechange.

## Reglas de Negocio

- Solo admin y consultor pueden ver/editar proveedores (ya configurado en hooks)
- Nombre de proveedor debe ser único (unique constraint en schema)
- No se puede eliminar un proveedor con equipment asociado (referential integrity)
- Email es opcional pero si se ingresa debe ser formato válido

## No Funcionales

- Diseño responsive (table scroll horizontal en mobile)
- Modales usan `svelte:transition` con fade/scale
- Los componentes UI deben funcionar con `use:enhance` para progresive enhancement sin JS
- Dark mode: todos los componentes respetan la clase `.dark`
- Sin dependencias externas nuevas (solo Svelte 5 nativo + Tailwind utility classes)
