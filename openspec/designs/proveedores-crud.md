# Design: Módulo Proveedores + Scaffold CRUD

## Arquitectura

### Árbol de archivos

```
src/
├── lib/
│   ├── ui/
│   │   ├── DataTable.svelte        # Tabla reutilizable
│   │   ├── FormField.svelte        # Wrapper de inputs
│   │   ├── ConfirmDialog.svelte    # Modal de confirmación
│   │   ├── Badge.svelte            # Badge de estado
│   │   └── Pagination.svelte       # Paginación
│   └── server/
│       └── db/
│           ├── schema.ts           # Ya existe, no se toca
│           └── index.ts            # Ya existe
└── routes/
    └── proveedores/
        ├── +page.svelte            # Listado + modal (todo en uno)
        ├── +page.server.ts         # Load + actions CRUD
        └── tipos/
            ├── +page.svelte        # (futuro) Tipos de proveedor
            └── +page.server.ts
```

### Patrón: Página única con modal

En lugar de rutas separadas para nuevo/editar, usamos una sola página con un modal controlado por estado:

```svelte
<script lang="ts">
	let showModal = $state(false);
	let editingProveedor = $state<Proveedor | null>(null);

	function openCreate() {
		editingProveedor = null;
		showModal = true;
	}

	function openEdit(p: Proveedor) {
		editingProveedor = structuredClone(p);
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editingProveedor = null;
	}
</script>
```

- Menos archivos: 2 en vez de 6
- El formulario es el mismo para crear y editar (cambia el título y el action)
- `use:enhance` permite actualizar la lista sin recargar

### Server Actions

Una sola action `crud` con discriminador:

```ts
export const actions = {
	crud: async ({ request, locals }) => {
		const form = await request.formData();
		const action = form.get('_action'); // 'create' | 'update' | 'delete'

		switch (action) {
			case 'create':
				return createProveedor(form, locals);
			case 'update':
				return updateProveedor(form, locals);
			case 'delete':
				return deleteProveedor(form, locals);
		}
	}
};
```

- Una sola action unificada evita duplicar parseo de formData
- `_action` es un hidden field en el form

### DataTable

```
┌─────────────────────────────────────────────────┐
│ [Buscar...]                          [Nuevo +]  │
├─────────┬──────────┬──────────┬────────┬────────┤
│ Nombre  │ Contacto │ Teléfono │ Email  │ Acción │
├─────────┼──────────┼──────────┼────────┼────────┤
│ Deltron │ Carlos   │ 011-... │ ventas │ ✏️ 🗑️  │
│ SA      │ Gómez    │         │ @...   │        │
├─────────┼──────────┼──────────┼────────┼────────┤
│ Bytec   │ María    │ 011-... │ info@  │ ✏️ 🗑️  │
│ SA      │ Fernández│         │ ...    │        │
├─────────┴──────────┴──────────┴────────┴────────┤
│ ← Pág 1 de 1 →                    Mostrando 2   │
└─────────────────────────────────────────────────┘
```

### Modal

```
┌──────────────────────────────────────┐
│  ✕                                 │
│  {Nuevo|Editar} Proveedor         │
│                                      │
│  Nombre *                            │
│  ┌────────────────────────────────┐ │
│  │ Deltron SA                     │ │
│  └────────────────────────────────┘ │
│                                      │
│  Contacto                           │
│  ┌────────────────────────────────┐ │
│  │ Carlos Gómez                   │ │
│  └────────────────────────────────┘ │
│                                      │
│  Teléfono         Email             │
│  ┌──────────────┐ ┌──────────────┐  │
│  │ 011-5555-0101│ │ ventas@...   │  │
│  └──────────────┘ └──────────────┘  │
│                                      │
│  Dirección                          │
│  ┌────────────────────────────────┐ │
│  │ Av. Corrientes 1234, CABA     │ │
│  └────────────────────────────────┘ │
│                                      │
│       [Cancelar]  [Guardar]         │
└──────────────────────────────────────┘
```

## Flujo de datos

### Load (GET `/proveedores`)

```
hooks → validateSession → locals.user
  → +page.server.ts load()
    → db.query.proveedores.findMany({ limit, offset, where: ilike(nombre | contacto, search) })
    → return { proveedores, total, page, search }
  → +page.svelte renders DataTable con los datos
```

### Create (POST)

```
form submit → use:enhance → +page.server.ts actions.crud('create')
  → validate required fields
  → db.insert(proveedores).values(data)
  → return { success: true, proveedor: created }
  → use:enhance callback actualiza la lista via invalidate()
```

### Update (POST)

```
form submit → use:enhance → +page.server.ts actions.crud('update')
  → validate required fields
  → db.update(proveedores).set(data).where(eq(id, form.id))
  → return { success: true }
  → invalidate() refresca la lista
```

### Delete (POST)

```
confirm dialog → form submit → +page.server.ts actions.crud('delete')
  → check if equipment references exist
  → if referenced: return { error: '...' }
  → db.delete(proveedores).where(eq(id, form.id))
  → return { success: true }
  → invalidate()
```

## Estados

### Empty state

```
┌────────────────────────────────────┐
│   📋                               │
│   No hay proveedores cargados      │
│   Creá el primer proveedor         │
│                                    │
│   [Crear Proveedor]                │
└────────────────────────────────────┘
```

### Loading state

Los componentes UI reciben prop `loading` y muestran skeleton:

- DataTable: filas con shimmer animation
- Modal: botón "Guardar" deshabilitado con spinner

### Error state

- Errores de validación: inline en cada FormField
- Errores de servidor (duplicado, ref integrity): toast en la página
- Error de red: toast "Error de conexión"

## Responsive

- Mobile (<768px): tabla con scroll horizontal, modal full-screen
- Desktop: tabla normal, modal centrado con overlay

## Componentes UI

### DataTable

```svelte
<script lang="ts">
	let {
		columns, // { key: string, label: string, sortable?: boolean }[]
		items, // T[]
		loading = false,
		search, // string bindable
		onsearch, // (value: string) => void
		page, // number
		totalPages, // number
		onpagechange
	}: Props;

	// slots: 'actions' (each item), 'empty'
</script>
```

### FormField

```svelte
<script lang="ts">
	let {
		label,
		name,
		type = 'text',
		value, // bindable
		error = '',
		placeholder = '',
		required = false
	}: Props;
</script>
```

### ConfirmDialog

```svelte
<script lang="ts">
	let {
		open = false,
		title = 'Confirmar',
		message = '',
		confirmLabel = 'Confirmar',
		cancelLabel = 'Cancelar',
		variant = 'default' // 'default' | 'danger'
	}: Props;

	let onconfirm = () => {};
	let oncancel = () => {};
</script>
```

### Badge

```svelte
<script lang="ts">
	let {
		text,
		variant = 'default' // 'default' | 'success' | 'warning' | 'danger' | 'info'
	}: Props;
</script>
```

### Pagination

```svelte
<script lang="ts">
	let { page, totalPages, total, onpagechange }: Props;
</script>
```
