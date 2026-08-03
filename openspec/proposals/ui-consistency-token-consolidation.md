# Proposal: UI Consistency Audit & Token Consolidation

## Intent

Eliminate competing design token systems and ~35 hardcoded Tailwind color values across pages by consolidating all tokens into `layout.css` and replacing literals with theme-aware CSS variables.

## Scope

### In Scope

- P0: Remove `design-system/tokens.json` and `design-system/tokens.css` — dead files
- P0: Consolidate all design tokens into `layout.css` `@theme` (already the active source)
- P0: Replace `bg-white`, `text-gray-*`, `dark:bg-gray-*` in dashboard, sessions, config, and quick-action cards with `var(--surface)`, `var(--card-hex)`, `var(--gray-*)`
- P1: Make Chart.js instances reactive to dark mode via CSS custom properties + `matchMedia('(prefers-color-scheme: dark)')` observer on `.dark` class
- P2: Migrate `Toast.svelte` and `Badge.svelte` from hardcoded emerald/red/amber classes to semantic token keys
- P3: Create `ActionIconButton.svelte` component for the edit/delete icon button pair duplicated across 6 pages
- P3: Define `--text-xs` through `--text-2xl` typography scale in `@theme`

### Out of Scope

- Spacing system refactor (already has Laravel scale in `@theme`)
- Page transitions or skeleton loading
- GSAP micro-interactions (keep as-is)
- Business logic or route behavior changes

## Capabilities

### New Capabilities

- `design-tokens`: Theme token consolidation, typography scale, component-level semantic mappings
- `chart-theming`: Dark-mode-reactive Chart.js via inherited CSS vars

### Modified Capabilities

None — pure refactor, no spec-level behavior changes.

## Approach

1. **Cleanup**: Delete dead token files. Remove `@import '../../design-system/tokens.css'` from `layout.css`.
2. **Consolidate**: Move any unique variables from dead files into `layout.css` `@theme` if missing. Add `--text-*` typography scale.
3. **Replace literals**: Batch replace `bg-white` → `bg-card`, `text-gray-700` → `text-muted-foreground` or `var(--gray-700)`, `dark:bg-gray-900` → `dark:bg-card` across pages.
4. **Chart.js**: Create a `chartTokens` helper that reads `getComputedStyle(document.documentElement)` for chart colors. Reinitialize charts on `.dark` class change via `MutationObserver`.
5. **Component refactor**: Create `ActionIconButton.svelte` with `edit`/`delete` variants. Extract `Badge` and `Toast` colors to CSS variables.
6. **Radius audit**: Map `rounded-*` to semantic hierarchy (`--radius-sm`, `--radius-md`, `--radius-lg`) in `@theme`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `design-system/tokens.json` | Removed | Dead Laravel-extracted tokens |
| `design-system/tokens.css` | Removed | Dead palette (unused, overridden) |
| `src/routes/layout.css` | Modified | Remove dead import, add typography scale + radius tokens |
| `src/routes/+page.svelte` | Modified | ~15 hardcoded colors → CSS vars |
| `src/routes/sessions/+page.svelte` | Modified | `bg-white`, `dark:bg-gray-900` → `bg-card` |
| `src/routes/config/+page.svelte` | Modified | `bg-white`, `dark:bg-gray-900` → `bg-card` |
| `src/routes/reportes/+page.svelte` | Modified | Chart.js colors → computed CSS vars |
| `src/lib/ui/Toast.svelte` | Modified | Hardcoded emerald/red → semantic tokens |
| `src/lib/ui/Badge.svelte` | Modified | Hardcoded variant colors → CSS vars |
| `src/lib/ui/ActionIconButton.svelte` | New | Shared edit/delete icon button |
| `src/routes/proveedores/+page.svelte` | Modified | Use ActionIconButton |
| `src/routes/usuarios/+page.svelte` | Modified | Use ActionIconButton |
| `src/routes/equipos/+page.svelte` | Modified | Use ActionIconButton |
| `src/routes/equipos/tipos/+page.svelte` | Modified | Use ActionIconButton |
| `src/routes/tickets/+page.svelte` | Modified | Use ActionIconButton |
| `src/routes/mantenimiento/+page.svelte` | Modified | Use ActionIconButton |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missed hardcoded values in nested/child routes | Medium | Grep for `bg-white`, `text-gray-`, `dark:bg-gray` post-change; visual QA in light + dark mode |
| Chart.js reinit on dark toggle flickers | Low | Keep chart initial render fast; debounce `MutationObserver` by 100ms |
| `tokens.css` import removal breaks something | Low | All vars are overridden by `layout.css` `:root` + `.dark` blocks — verified during exploration |

## Rollback Plan

Revert commit via `git revert <sha>`. All changes are cosmetic — zero schema or logic risk.

## Dependencies

None.

## Success Criteria

- [ ] `design-system/` contains no `.json` or `.css` token files
- [ ] `git grep 'bg-white\|dark:bg-gray-' src/` returns 0 matches
- [ ] Dark mode toggle updates Chart.js colors without page reload
- [ ] Badge/Toast use `var(--success)`, `var(--danger)` etc. — no inline emerald/red classes
- [ ] Edit/delete buttons across 6 pages use the same `ActionIconButton` component
- [ ] `layout.css` has `--text-*` scale from `xs` to `2xl`