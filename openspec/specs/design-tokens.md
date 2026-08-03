# Design Tokens — Specification

## Purpose

Consolidate all design tokens into `layout.css`, remove dead token files, replace hardcoded color values across the UI with theme-aware CSS variables, and define reusable component-level tokens for typography, radius, and semantic status colors.

## Requirements

### TC-1: Design Token Consolidation

The system MUST define all design tokens exclusively in `src/routes/layout.css` via the `@theme` directive. The dead files `design-system/tokens.json` and `design-system/tokens.css` MUST be removed. The `@import` of `tokens.css` on line 2 of `layout.css` MUST be deleted.

The `@theme` block MUST include:

- **Semantic status colors** defined in the `:root` block as HSL and hex custom properties:
  - `--color-success` → emerald-based (`--primary` equivalent: `160 84% 39%`)
  - `--color-danger` → red-based (`--destructive` equivalent: `0 72.2% 50.6%`)
  - `--color-warning` → amber-based (new: `35 92% 55%`)
  - `--color-info` → blue-based (new: `217 91% 56%`)
- **Semester radius tokens** in `@theme`:
  - `--radius-sm`: `0.375rem`
  - `--radius-md`: `0.5rem` (existing `--radius`)
  - `--radius-lg`: `0.75rem` (existing card value)
  - `--radius-xl`: `1rem`

Dark mode overrides for status colors MUST be defined under `.dark`.

#### Scenario: Dead files are removed

- GIVEN the project root
- WHEN searching for `design-system/tokens.json` and `design-system/tokens.css`
- THEN neither file MUST exist
- AND `layout.css` MUST NOT contain `@import '../../design-system/tokens.css'`

#### Scenario: Status colors render correctly in light and dark mode

- GIVEN the app is rendered in light mode
- WHEN inspecting `--color-success`, `--color-danger`, `--color-warning`, `--color-info`
- THEN each MUST resolve to a valid HSL or hex color visible against its typical background
- WHEN the `.dark` class is applied to `<html>`
- THEN each token MUST resolve to its dark-mode variant

#### Scenario: Radius tokens are usable

- GIVEN a component uses `rounded-sm`, `rounded-lg`, or `rounded-xl`
- WHEN the component renders
- THEN the computed border-radius MUST match the corresponding `--radius-{sm|md|lg|xl}` value

---

### TC-2: Hardcoded Color Replacement — Dashboard

The dashboard (`src/routes/+page.svelte`) MUST replace all hardcoded Tailwind color classes with theme-aware tokens:

- `bg-white` → `bg-card`
- `text-gray-700` → `text-foreground`
- `text-gray-800` → `text-foreground`
- `text-gray-500` → `text-muted-foreground`
- `text-gray-600` → `text-muted-foreground`
- `hover:bg-gray-50` → `hover:bg-muted/50`
- `dark:bg-gray-800/50` → `dark:bg-card`
- `dark:hover:bg-gray-800` → `dark:hover:bg-muted/50`
- `bg-gray-100` (chart period buttons) → `bg-muted`
- `dark:bg-gray-800` (chart period buttons) → `dark:bg-muted`
- `bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white` (active period button) → `bg-card text-foreground shadow-sm dark:bg-card dark:text-foreground`
- `text-gray-500 hover:text-gray-700 dark:text-gray-400` (inactive period button) → `text-muted-foreground hover:text-foreground dark:text-muted-foreground`
- `dark:bg-gray-800/50` (maintenance/ticket items) → `dark:bg-card`
- `dark:hover:bg-gray-800` → `dark:hover:bg-muted/50`
- `border-border-light` → `border-border`
- `bg-red-50 dark:bg-red-950` (overdue badge) → `bg-destructive/10 dark:bg-destructive/15`
- `text-red-600 dark:text-red-400` → `text-destructive`
- `bg-emerald-100 dark:bg-emerald-900/30` → `bg-success/15 dark:bg-success/20`
- `text-emerald-600 dark:text-emerald-400` → `text-success`
- `bg-blue-100 dark:bg-blue-900/30` → `bg-info/15 dark:bg-info/20`
- `text-blue-600 dark:text-blue-400` → `text-info`
- `bg-amber-100 dark:bg-amber-900/30` → `bg-warning/15 dark:bg-warning/20`
- `text-amber-600 dark:text-amber-400` → `text-warning`

The `TrendingUp` and `TrendingDown` icon imports are used on lines 195 and 227 and MUST NOT be removed.

#### Scenario: Dashboard renders with theme tokens in light mode

- GIVEN a user views the dashboard in light mode
- THEN all card backgrounds MUST use `bg-card`, all text MUST use `text-foreground` or `text-muted-foreground`, and status badges MUST use semantic tokens (`text-success`, `text-destructive`, etc.)

#### Scenario: Dashboard renders with theme tokens in dark mode

- GIVEN a user toggles dark mode
- WHEN the dashboard re-renders
- THEN every color-aware element MUST use a dark-mode-aware token (no hardcoded `dark:bg-gray-*` or `dark:text-gray-*` classes remain)

---

### TC-3: Hardcoded Color Replacement — Sessions & Config

The files `src/routes/sessions/+page.svelte` and `src/routes/config/+page.svelte` MUST replace:

- `bg-white dark:bg-gray-900` → `bg-card dark:bg-card`
- `border-gray-200 dark:border-gray-700` → `border-border dark:border-border`
- `shadow-xl` → `shadow-md` (or remove — use theme shadow if defined)
- `bg-red-50 ... dark:bg-red-900/20` (sessions revoke button) → `bg-destructive/10 ... dark:bg-destructive/15`
- `text-red-600 dark:text-red-400` → `text-destructive`

#### Scenario: Sessions list uses theme tokens

- GIVEN a user visits `/sessions`
- THEN each session card MUST use `bg-card` (not `bg-white`) and `dark:bg-card` (not `dark:bg-gray-900`)
- AND the "Cerrar" button MUST use `bg-destructive/10` and `text-destructive`

#### Scenario: Config form uses theme tokens

- GIVEN a user visits `/config`
- THEN the form container MUST use `border-border` (not `border-gray-200`) and `bg-card` (not `bg-white`)

---

### TC-5: Dead File Cleanup

The directory `design-system/` MUST contain no `.json` or `.css` token files after cleanup.

#### Scenario: No residual references exist

- GIVEN the dead files are deleted
- WHEN grepping for `tokens.css` or `tokens.json` across all source files
- THEN the only match MUST be the removed `@import` line in `layout.css` history

---

### TC-6: Toast & Badge Semantic Colors

`Toast.svelte` MUST replace hardcoded emerald/red class strings with semantic token variables:

- `bg-emerald-50 dark:bg-emerald-950/90` → `bg-success/10 dark:bg-success/20`
- `border-emerald-200 dark:border-emerald-800` → `border-success dark:border-success/40`
- `text-emerald-800 dark:text-emerald-300` → `text-success-foreground dark:text-success`
- `bar: 'bg-emerald-400 dark:bg-emerald-600'` → `bar: 'bg-success'`
- Same pattern for red/destructive variants

`Badge.svelte` MUST replace:

| Current | Replacement |
|---------|-------------|
| `bg-emerald-100 text-emerald-700 ring-emerald-400/50 dark:bg-emerald-900/50 dark:text-emerald-300 dark:ring-emerald-700/40` | `bg-success/15 text-success ring-success/40 dark:bg-success/20 dark:text-success-foreground dark:ring-success/30` |
| `bg-red-100 text-red-700 ring-red-400/50 dark:bg-red-900/50 dark:text-red-300 dark:ring-red-700/40` | `bg-destructive/15 text-destructive ring-destructive/40 dark:bg-destructive/20 dark:text-destructive-foreground dark:ring-destructive/30` |
| `bg-amber-100 text-amber-700 ring-amber-400/50 dark:bg-amber-900/50 dark:text-amber-300 dark:ring-amber-700/40` | `bg-warning/15 text-warning ring-warning/40 dark:bg-warning/20 dark:text-warning-foreground dark:ring-warning/30` |
| `bg-blue-100 text-blue-700 ring-blue-400/50 dark:bg-blue-900/50 dark:text-blue-300 dark:ring-blue-700/40` | `bg-info/15 text-info ring-info/40 dark:bg-info/20 dark:text-info-foreground dark:ring-info/30` |
| `bg-gray-100 text-gray-700 ring-gray-300/40 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600/40` | `bg-muted text-muted-foreground ring-border dark:bg-muted dark:text-muted-foreground dark:ring-border` |

The HSL variables `--success-foreground`, `--destructive-foreground`, `--warning-foreground`, `--info-foreground` MUST be defined in `:root` and `.dark` blocks of `layout.css`.

#### Scenario: Toast renders with semantic tokens

- GIVEN a success toast is shown
- THEN its background MUST use `bg-success/10`, border MUST use `border-success`
- WHEN a destructive toast is shown
- THEN its background MUST use `bg-destructive/10`, border MUST use `border-destructive`

#### Scenario: Badge renders with semantic tokens

- GIVEN a badge with `variant="success"`
- THEN its classes MUST resolve to `bg-success/15 text-success ring-success/40`
- WHEN dark mode is active
- THEN the classes MUST resolve to dark variants (`dark:bg-success/20 dark:text-success-foreground`)

---

### TC-7: ActionIconButton Component

A component `src/lib/ui/ActionIconButton.svelte` MUST be created with:

**Props**:
- `icon` — a Svelte component constructor (Lucide icon)
- `variant` — `'edit' | 'delete' | 'default'` (default: `'default'`)
- `onclick` — click handler
- `label` — aria-label string
- `size` — `'sm' | 'md'` (default: `'md'`)

**Behavior**:
- Renders a shadcn Button with `variant="ghost"` as base
- `edit` variant: applies `text-primary` (or blue-500 equivalent token)
- `delete` variant: applies `text-destructive`
- `default` variant: inherits ghost default text color
- Hover states: `hover:bg-muted` for all variants
- Focus ring: `focus-visible:ring-ring`

Two preset exports MUST be available:

```svelte
<script lang="ts">
  // Factory or named exports
  export { default as EditButton } from './ActionIconButton.svelte';
  export { default as DeleteButton } from './ActionIconButton.svelte';
</script>
```

Or as a single component with `variant` dispatch.

Pages using inline edit/delete button patterns (`equipos`, `tickets`, `mantenimiento`, `proveedores`, `usuarios`, `tipos`) MUST be migrated to use this component.

#### Scenario: ActionIconButton renders edit variant

- GIVEN `variant="edit"` and an icon
- WHEN the component renders
- THEN the button MUST use ghost variant styling with `text-primary` color

#### Scenario: ActionIconButton renders delete variant

- GIVEN `variant="delete"` and an icon
- WHEN the component renders
- THEN the button MUST use ghost variant styling with `text-destructive` color

#### Scenario: Inline buttons are replaced

- GIVEN a page that previously had inline `<button><Pencil/></button>` patterns
- AFTER migration
- THEN the page MUST import and use `ActionIconButton` (or `EditButton`/`DeleteButton`)
- AND the rendered output MUST match the component's semantics

---

### TC-8: Typography Scale

The `@theme` block in `layout.css` MUST define typography size tokens:

| Token | Value | Source |
|-------|-------|--------|
| `--text-display` | `2.5rem` | stat-card-featured value |
| `--text-h1` | `1.75rem` | Existing `h1` font-size |
| `--text-h2` | `1.25rem` | Existing `h2` font-size |
| `--text-h3` | `1rem` | Existing `h3` font-size |
| `--text-body` | `0.875rem` | Default body |
| `--text-sm` | `0.75rem` | Small labels |
| `--text-xs` | `0.625rem` | Tiny labels |

These tokens MUST be defined for FUTURE use only. No existing `font-size` declarations in pages or components SHALL be replaced in this change.

#### Scenario: Typography tokens exist

- GIVEN `layout.css`
- WHEN inspecting the `@theme` block
- THEN tokens `--text-display`, `--text-h1`, `--text-h2`, `--text-h3`, `--text-body`, `--text-sm`, `--text-xs` MUST be defined as CSS variables with the specified values

#### Scenario: No existing usage is replaced

- GIVEN the codebase before and after the change
- WHEN searching for `font-size` in `.svelte` files
- THEN the number of matches MUST remain identical (no existing font-size declarations were touched)