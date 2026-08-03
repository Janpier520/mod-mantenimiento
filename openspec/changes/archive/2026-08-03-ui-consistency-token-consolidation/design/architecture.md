# Design: UI Consistency Audit & Token Consolidation — VaultX Dark Aesthetic

## Technical Approach

Consolidate all design tokens into `layout.css`'s `@theme` block, replacing the current Emerald + Slate palette with a VaultX-inspired dark-first aesthetic: near-black backgrounds (#0b0f19), electric blue primary (#3b82f6), bright green success (#22c55e), and subtle blue-tinted card shadows. Remove dead `design-system/` files, replace hardcoded Tailwind classes, make Chart.js reactively read CSS vars via `MutationObserver`, and create a reusable `ActionIconButton` component.

## Architecture Decisions

### Decision: VaultX Dark Palette — Blue-Primary, Near-Black Backgrounds

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep Emerald + Slate | Consistent with current codebase | ❌ Reject |
| Adopt VaultX dark-first palette | Fresh aesthetic, better dark contrast, modern fintech feel | ✅ Adopt |

The VaultX aesthetic uses a near-black (#0b0f19) background with #151a26 cards, #1e293b borders (blue-tinted gray), and electric blue (#3b82f6) as primary. This replaces Emerald (#059669) entirely.

### Decision: Semantic Status Tokens via HSL + @theme

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Pure hex vars | No Tailwind `bg-success/10` opacity support | ❌ Reject |
| HSL in `@theme` | `hsl(var(--success))` enables opacity modifiers | ✅ Adopt |

**Token table** — new HSL vars in `:root` (VaultX palette):

| Token | Light | Dark | Source |
|-------|-------|------|--------|
| `--success` | `142 71% 45%` | `142 71% 55%` | Bright green #22c55e |
| `--success-foreground` | `142 71% 25%` | `142 60% 85%` | |
| `--warning` | `35 92% 55%` | `35 85% 65%` | Amber/orange |
| `--warning-foreground` | `35 80% 30%` | `35 60% 85%` | |
| `--info` | `217 91% 60%` | `217 80% 70%` | Electric blue match |
| `--info-foreground` | `217 80% 30%` | `217 60% 85%` | |

**`@theme` additions**:

```css
--color-success: hsl(var(--success));
--color-success-foreground: hsl(var(--success-foreground));
--color-danger: hsl(var(--destructive));
--color-danger-foreground: hsl(var(--destructive-foreground));
--color-warning: hsl(var(--warning));
--color-warning-foreground: hsl(var(--warning-foreground));
--color-info: hsl(var(--info));
--color-info-foreground: hsl(var(--info-foreground));
--radius-sm: 0.375rem;
--radius-md: 0.5rem;
--radius-lg: 0.75rem;
--radius-xl: 1rem;
```

### Decision: Chart.js reads CSS vars via computed style + MutationObserver

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `window.matchMedia` | Can't read arbitrary CSS vars | ❌ Reject |
| `getComputedStyle` + `$effect` | Works with any CSS var, avoid theme store coupling | ✅ Adopt |
| `MutationObserver` | Watches only `.dark` class on `<html>` | ✅ Chosen |

**Approach**: Add `$state` variable `isDark` (initialized from `document.documentElement.classList.contains('dark')`). On mount, create a `MutationObserver` watching `document.documentElement` for attribute changes — only react when `class` attribute changes AND the `.dark` presence differs.

The `$effect` depends on `[timePeriod, isDark, chartCanvas]`. On any change, `initChart()` reads:

```ts
const docEl = document.documentElement;
const style = getComputedStyle(docEl);
const line1 = style.getPropertyValue('--chart-line-1').trim() || '#3b82f6';
```

### Decision: ActionIconButton — single component + barrel exports

| Option | Tradeoff | Decision |
|--------|----------|----------|
| 3 separate components | Duplicated logic | ❌ Reject |
| Single component + `variant` prop | One source of truth, barrel exports for convenience | ✅ Adopt |

See `components/action-icon-button.md` for full spec.

### Decision: Typography tokens for future use only

Per spec TC-8, define in `@theme` but do NOT replace existing `font-size` declarations. Values:

| Token | Value |
|-------|-------|
| `--text-display` | `2.5rem` |
| `--text-h1` | `1.75rem` |
| `--text-h2` | `1.25rem` |
| `--text-h3` | `1rem` |
| `--text-body` | `0.875rem` |
| `--text-sm` | `0.75rem` |
| `--text-xs` | `0.625rem` |

## Complete Token Map — Before → After

### `:root` (Light Mode) Token Changes

| Token | Before (Emerald + Slate) | After (VaultX) |
|-------|--------------------------|----------------|
| `--color-brand` | `#059669` | `#3b82f6` |
| `--color-brand-hover` | `#047857` | `#2563eb` |
| `--color-brand-light` | `#d1fae5` | `#dbeafe` |
| `--surface` | `#f8fafc` | `#f8fafc` (keep) |
| `--card-hex` | `#ffffff` | `#ffffff` (keep) |
| `--card-hover` | `#f8fafc` | `#f8fafc` (keep) |
| `--border-light` | `#e2e8f0` | `#e2e8f0` (keep) |
| `--gray-50` | `#f8fafc` | `#f8fafc` (keep) |
| `--gray-100` | `#f1f5f9` | `#f1f5f9` (keep) |
| `--gray-200` | `#e2e8f0` | `#e2e8f0` (keep) |
| `--gray-300` | `#cbd5e1` | `#cbd5e1` (keep) |
| `--gray-400` | `#94a3b8` | `#94a3b8` (keep) |
| `--gray-500` | `#64748b` | `#64748b` (keep) |
| `--gray-600` | `#475569` | `#475569` (keep) |
| `--gray-700` | `#334155` | `#334155` (keep) |
| `--gray-800` | `#1e293b` | `#1e293b` (keep) |
| `--gray-900` | `#0f172a` | `#0f172a` (keep) |
| `--gray-950` | `#020617` | `#020617` (keep) |
| `--sidebar` | `#0f172a` | `#0f172a` (keep) |
| `--sidebar-hover` | `#1e293b` | `#1e293b` (keep) |
| `--sidebar-active` | `#334155` | `#334155` (keep) |
| `--sidebar-text` | `#64748b` | `#64748b` (keep) |
| `--sidebar-text-active` | `#f8fafc` | `#f8fafc` (keep) |

Light mode shadcn HSL vars — primary changes:

| Token | Before | After |
|-------|--------|-------|
| `--primary` | `160 84% 39%` (emerald) | `217 91% 60%` (electric blue) |
| `--ring` | `160 84% 39%` | `217 91% 60%` |
| `--chart-1` | `12 76% 61%` | `217 91% 60%` (blue) |
| `--chart-2` | `173 58% 39%` | `142 71% 45%` (green) |
| `--chart-3` | `197 37% 24%` | `35 92% 55%` (amber) |
| `--chart-4` | `43 74% 66%` | `280 65% 60%` (purple) |
| `--chart-5` | `27 87% 67%` | `340 75% 55%` (rose) |

### `.dark` (Dark Mode) Token Changes — THE BIG REWRITE

| Token | Before | After | Notes |
|-------|--------|-------|-------|
| **`--background`** | `240 10% 3.9%` (slate-950 ~#0a0a0a) | `222 47% 7%` (#0b0f19) | Near-black VaultX bg |
| **`--foreground`** | `0 0% 98%` | `0 0% 100%` | Pure white |
| **`--card`** | `240 10% 3.9%` | `220 30% 10%` (#151a26) | Dark gray with blue tint |
| **`--card-foreground`** | `0 0% 98%` | `0 0% 100%` | Pure white |
| **`--popover`** | `240 10% 3.9%` | `220 30% 10%` (#151a26) | Match card |
| **`--popover-foreground`** | `0 0% 98%` | `0 0% 100%` | Pure white |
| **`--primary`** | `160 84% 45%` (lighter emerald) | `217 91% 65%` (#60a5fa) | Brighter blue for dark bg |
| **`--primary-foreground`** | `0 0% 5%` | `0 0% 100%` | White on blue |
| **`--secondary`** | `240 3.7% 15.9%` | `220 25% 14%` (#1a2033) | Blue-tinted secondary |
| **`--secondary-foreground`** | `0 0% 98%` | `0 0% 100%` | |
| **`--muted`** | `240 3.7% 15.9%` | `220 20% 16%` (#1e293b) | Subtle blue-gray |
| **`--muted-foreground`** | `240 5% 64.9%` | `215 20% 55%` (#94a3b8) | Blue-gray text |
| **`--accent`** | `240 3.7% 15.9%` | `220 25% 14%` | Match secondary |
| **`--accent-foreground`** | `0 0% 98%` | `0 0% 100%` | |
| **`--destructive`** | `0 62.8% 30.6%` | `0 72% 45%` (#dc2626) | Brighter red |
| **`--destructive-foreground`** | `0 0% 98%` | `0 0% 100%` | |
| **`--border`** | `240 3.7% 15.9%` | `220 25% 16%` (#1e293b) | Blue-tinted border |
| **`--input`** | `240 3.7% 15.9%` | `220 25% 16%` | Match border |
| **`--ring`** | `160 84% 45%` | `217 91% 65%` | Blue ring |

Dark mode custom hex tokens:

| Token | Before | After |
|-------|--------|-------|
| `--color-brand` | `#059669` | `#3b82f6` |
| `--color-brand-hover` | `#059669` | `#2563eb` |
| `--color-brand-light` | `#064e3b` | `#1e3a5f` |
| `--surface` | `#0a0a0a` | `#0b0f19` |
| `--card-hex` | `#111111` | `#151a26` |
| `--card-hover` | `#1a1a1a` | `#1a2033` |
| `--border-light` | `#1a1a1a` | `#1e293b` |
| `--gray-50` | `#0a0a0a` | `#0b0f19` |
| `--gray-100` | `#111111` | `#111827` |
| `--gray-200` | `#1a1a1a` | `#151a26` |
| `--gray-300` | `#222222` | `#1e293b` |
| `--gray-400` | `#333333` | `#2d3a4f` |
| `--gray-500` | `#555555` | `#475569` |
| `--gray-600` | `#888888` | `#64748b` |
| `--gray-700` | `#aaaaaa` | `#94a3b8` |
| `--gray-800` | `#cccccc` | `#cbd5e1` |
| `--gray-900` | `#e5e5e5` | `#e2e8f0` |
| `--gray-950` | `#f5f5f5` | `#f8fafc` |
| `--sidebar` | `#050505` | `#080c14` |
| `--sidebar-hover` | `#0a0a0a` | `#0b0f19` |
| `--sidebar-active` | `#111111` | `#151a26` |
| `--sidebar-text` | `#666666` | `#64748b` |
| `--sidebar-text-active` | `#e5e5e5` | `#f8fafc` |

Dark mode shadcn chart vars:

| Token | Before | After |
|-------|--------|-------|
| `--chart-1` | `220 70% 50%` | `217 91% 65%` (blue) |
| `--chart-2` | `160 60% 45%` | `142 71% 55%` (green) |
| `--chart-3` | `30 80% 55%` | `35 85% 65%` (amber) |
| `--chart-4` | `280 65% 60%` | `280 65% 60%` (purple, keep) |
| `--chart-5` | `340 75% 55%` | `340 75% 55%` (rose, keep) |

### Chart CSS Variables

| Var | Light | Dark |
|-----|-------|------|
| `--chart-line-1` | `#3b82f6` (blue) | `#60a5fa` (brighter blue) |
| `--chart-line-2` | `#22c55e` (green) | `#4ade80` (brighter green) |
| `--chart-tooltip-bg` | `#1e293b` | `#151a26` |
| `--chart-grid-color` | `#94a3b8` | `#475569` |
| `--chart-grid-line` | `#e2e8f0` | `#1e293b` |

### Card Hover Shadows — Blue Glow

| Context | Before | After |
|---------|--------|-------|
| `.card:hover` | `0 0 20px rgba(5, 150, 105, 0.1)` | `0 0 20px rgba(59, 130, 246, 0.1)` |
| `.dark .card:hover` | `0 0 20px rgba(5, 150, 105, 0.15)` | `0 0 24px rgba(59, 130, 246, 0.15)` |
| `.card-elevated:hover` | `0 0 30px rgba(5, 150, 105, 0.12), 0 4px 12px rgba(0,0,0,0.08)` | `0 0 30px rgba(59, 130, 246, 0.12), 0 4px 12px rgba(0,0,0,0.08)` |
| `.stat-card:hover` | `0 12px 32px rgba(0,0,0,0.1), 0 0 24px rgba(5,150,105,0.12)` | `0 12px 32px rgba(0,0,0,0.1), 0 0 24px rgba(59,130,246,0.12)` |
| `.stat-card-featured:hover` | `0 12px 32px rgba(5,150,105,0.3)` | `0 12px 32px rgba(59,130,246,0.3)` |

### Scrollbar — Dark Mode

| Context | Before | After |
|---------|--------|-------|
| `.dark ::-webkit-scrollbar-thumb` | `#333` | `#2d3a4f` |
| `.dark ::-webkit-scrollbar-thumb:hover` | `#555` | `#475569` |

## Data Flow (Chart Dark Mode)

```
[.dark toggled on <html>]
       │
 MutationObserver fires
       │
 isDark $state flips (Svelte 5 reactive)
       │
 $effect re-runs → initChart()
       │
 getComputedStyle(docEl).getPropertyValue('--chart-line-1')
       │
 Chart.destroy() → new Chart(canvas, { ... })
```

No data refetch — only visual re-render.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/routes/layout.css` | Modify | Remove `@import '../../design-system/tokens.css'`; rewrite `:root` primary → `217 91% 60%`; rewrite `.dark` with VaultX palette (#0b0f19 bg, #151a26 cards, #1e293b borders); add success/danger/warning/info HSL vars; add chart CSS vars; add radius + typography tokens to `@theme`; add blue glow card shadows |
| `design-system/tokens.css` | Delete | Dead file |
| `design-system/tokens.json` | Delete | Dead file |
| `src/routes/+page.svelte` | Modify | Replace 40+ hardcoded Tailwind classes per TC-2 map; add `MutationObserver` + `isDark` + chart reinit logic |
| `src/routes/sessions/+page.svelte` | Modify | Replace hardcoded classes per TC-3 map |
| `src/routes/config/+page.svelte` | Modify | Replace hardcoded classes per TC-3 map |
| `src/lib/ui/Toast.svelte` | Modify | Replace emerald/red class strings with semantic tokens per TC-6 |
| `src/lib/ui/Badge.svelte` | Modify | Replace hardcoded class strings with semantic tokens per TC-6 |
| `src/lib/ui/ActionIconButton.svelte` | Create | New component per TC-7 |
| `src/routes/equipos/+page.svelte` | Modify | Migrate inline button to ActionIconButton |
| `src/routes/equipos/tipos/+page.svelte` | Modify | Migrate inline button to ActionIconButton |
| `src/routes/tickets/+page.svelte` | Modify | Migrate inline button to ActionIconButton |
| `src/routes/proveedores/+page.svelte` | Modify | Migrate inline button to ActionIconButton |
| `src/routes/mantenimiento/+page.svelte` | Modify | Migrate 2 inline button pairs to ActionIconButton |
| `src/routes/usuarios/+page.svelte` | Modify | Migrate inline button to ActionIconButton |

## Migration / Rollout

No data migration. CSS token changes are additive — existing `--color-destructive` remains; `--color-danger` is an alias. Chart re-init logic is isolated to `+page.svelte`. Each page's ActionIconButton migration is a pure find-and-replace, no behavioral change.

The primary palette swap (emerald → blue) flows through the `@theme` block — all components using `--color-primary` or `--primary` automatically pick up the new color. Hardcoded emerald references need manual replacement.

## Green Check Verification

- `grep -r 'tokens\.\(css\|json\)' src/ --include='*.svelte' --include='*.css'` → 0 matches
- `grep -r 'bg-white\|bg-gray-900\|border-gray-200' src/routes/+page.svelte src/routes/sessions/+page.svelte src/routes/config/+page.svelte` → 0 matches
- `grep -r 'emerald-' src/lib/ui/Toast.svelte src/lib/ui/Badge.svelte` → 0 matches
- `grep -r '#059669\|#047857' src/routes/layout.css` → 0 matches (emerald gone)
- `grep -r 'rgba(5, 150, 105' src/routes/layout.css` → 0 matches (emerald shadows gone)

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Visual | Dashboard, sessions, config, toast, badge render | Manual visual check light + dark |
| Unit | ActionIconButton renders variants | Render test in vitest |
| Integration | Chart re-inits on dark toggle | Manual toggle, check canvas re-render |
| E2E | No hardcoded gray/emerald classes remain | `grep` commands above |

## Open Questions

- None. All spec items have clear mapping tables.

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Chart re-init causes flicker | Medium | MutationObserver debounce via `requestAnimationFrame` |
| Missing `--color-danger` breaks shadcn button | None (additive) | Adding alias ensures compatibility |
| Typo in token mapping breaks badge rendering | Low | Use grep verification pass after apply |
| Blue-on-dark contrast insufficient | Low | WCAG check: #3b82f6 on #0b0f19 = ~6.5:1 ratio (passes AA) |
