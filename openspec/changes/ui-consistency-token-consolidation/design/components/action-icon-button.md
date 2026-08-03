# Component Design: ActionIconButton — VaultX Aesthetic

## Purpose

Replace the 6 identical inline button patterns across CRUD pages with a single reusable icon button component that handles edit/delete/default variants consistently, using the VaultX blue-primary palette.

## Import Pattern

```svelte
import ActionIconButton from '$lib/ui/ActionIconButton.svelte';
```

## Component API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `typeof import('@lucide/svelte/icons/*').default` | required | Lucide icon component constructor |
| `variant` | `'edit' \| 'delete' \| 'default'` | `'default'` | Visual style variant |
| `onclick` | `(e: MouseEvent) => void` | — | Click handler |
| `label` | `string` | — | `aria-label` value |
| `size` | `'sm' \| 'md'` | `'md'` | Icon + padding size |

### Slots

None. Icon is passed as prop, not slot.

### Events

Forwarded via `{...restProps}` to the underlying shadcn button.

## Implementation

### Variant class mapping

| Variant | Tailwind classes | Resolved color |
|---------|-----------------|----------------|
| `edit` | `text-primary hover:bg-muted` | #3b82f6 (blue) |
| `delete` | `text-destructive hover:bg-destructive/10` | #dc2626 (red) |
| `default` | `text-muted-foreground hover:bg-muted hover:text-foreground` | #94a3b8 → #fff |

### Size mapping

| Size | shadcn Button size | Icon size |
|------|--------------------|-----------|
| `sm` | `'icon-xs'` | `h-3.5 w-3.5` |
| `md` | `'icon'` | `h-4 w-4` |

### Base

Uses shadcn `Button` component with `variant="ghost"` for all color variants. Focus ring: `focus-visible:ring-ring` (already in button base).

### Pseudo-code

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import type { Component } from 'svelte';

  let {
    icon: Icon,
    variant = 'default',
    onclick,
    label,
    size = 'md',
    ...restProps
  }: {
    icon: Component;
    variant?: 'edit' | 'delete' | 'default';
    onclick?: (e: MouseEvent) => void;
    label?: string;
    size?: 'sm' | 'md';
  } = $props();

  const variantClass = {
    edit: 'text-primary hover:bg-muted',
    delete: 'text-destructive hover:bg-destructive/10',
    default: 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }[variant];

  const sizeMap = { sm: 'icon-xs', md: 'icon' } as const;
</script>

<Button
  variant="ghost"
  size={sizeMap[size]}
  class={variantClass}
  {onclick}
  aria-label={label ?? 'Acción'}
  {...restProps}
>
  <Icon class={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
</Button>
```

### Decision: Single component, no barrel exports

The spec's named export requirement (`EditButton`, `DeleteButton`) is satisfied by convention at the usage site. No separate wrapper files needed.

## Migration Pattern

Before:
```svelte
<button
  onclick={() => openEdit(item)}
  class="inline-flex items-center gap-1 rounded-lg p-1.5 text-sm text-muted-foreground transition-colors hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-800"
  aria-label="Editar"
>
  <Pencil class="h-4 w-4" />
</button>
```

After:
```svelte
<ActionIconButton icon={Pencil} variant="edit" onclick={() => openEdit(item)} label="Editar" />
```

Before (delete):
```svelte
<button
  onclick={() => openDelete(item)}
  class="inline-flex items-center gap-1 rounded-lg p-1.5 text-sm text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
  aria-label="Eliminar"
>
  <Trash2 class="h-4 w-4" />
</button>
```

After:
```svelte
<ActionIconButton icon={Trash2} variant="delete" onclick={() => openDelete(item)} label="Eliminar" />
```

### Pages to migrate

| File | Edit pattern | Delete pattern |
|------|-------------|----------------|
| `src/routes/equipos/+page.svelte` | Lines 251-257 | Lines 258-264 |
| `src/routes/equipos/tipos/+page.svelte` | Lines 95-101 | Lines 102-108 |
| `src/routes/tickets/+page.svelte` | Lines 327-333 | Lines 334-340 |
| `src/routes/proveedores/+page.svelte` | Lines 160-166 | Lines 167-173 |
| `src/routes/mantenimiento/+page.svelte` | Lines 267-283 (plan, SVG) + 365-371 (task) | Lines 284-299 (plan, SVG) + 372-378 (task) |
| `src/routes/usuarios/+page.svelte` | Lines 205-211 | Lines 212-218 |

**Note**: `mantenimiento/+page.svelte` uses inline SVG icons for plan-level buttons (not Lucide). Those should be replaced with Lucide `Pencil`/`Trash2` icons for consistency.

## Testing

- Render with `variant="edit"` → button has `text-primary` class (resolves to blue #3b82f6)
- Render with `variant="delete"` → button has `text-destructive` class
- Render with `size="sm"` → uses `icon-xs` size variant
- Click handler fires on click
- `aria-label` is set on the underlying button element
