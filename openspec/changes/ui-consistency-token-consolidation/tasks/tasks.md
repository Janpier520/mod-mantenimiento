# Tasks: UI Consistency Audit & Token Consolidation — VaultX Dark Aesthetic

## Review Workload Forecast

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

| Unit | PR | Base | ~Lines | Scope |
|------|----|------|--------|-------|
| Tokens + cleanup | PR 1 | feature/tracker | 280 | layout.css (full VaultX palette rewrite), Toast, Badge, delete dead files |
| Color replacements | PR 2 | PR 1 | 56 | Dashboard, Sessions, Config — pure class swaps |
| Chart dark mode | PR 3 | PR 2 | 45 | Dashboard MutationObserver + CSS vars (blue + green) |
| ActionIconButton | PR 4 | PR 3 | 100 | New component + 6 page migrations |

---

- [x] **1.1** layout.css `:root` — rewrite primary: `--primary: 217 91% 60%` (was `160 84% 39%`), `--ring: 217 91% 60%` (was `160 84% 39%`). Rewrite brand hex: `--color-brand: #3b82f6` (was `#059669`), `--color-brand-hover: #2563eb` (was `#047857`), `--color-brand-light: #dbeafe` (was `#d1fae5`)
- [x] **1.2** layout.css `:root` — add HSL vars: `--success` (`142 71% 45%`), `--success-foreground` (`142 71% 25%`), `--warning` (`35 92% 55%`), `--warning-foreground` (`35 80% 30%`), `--info` (`217 91% 60%`), `--info-foreground` (`217 80% 30%`)
- [x] **1.3** layout.css `.dark` — full palette rewrite: `--background: 222 47% 7%` (#0b0f19), `--card: 220 30% 10%` (#151a26), `--primary: 217 91% 65%` (#60a5fa), `--primary-foreground: 0 0% 100%`, `--secondary: 220 25% 14%`, `--muted: 220 20% 16%`, `--muted-foreground: 215 20% 55%` (#94a3b8), `--border: 220 25% 16%` (#1e293b), `--destructive: 0 72% 45%` (#dc2626), `--ring: 217 91% 65%`
- [x] **1.4** layout.css `.dark` — rewrite custom hex tokens: `--color-brand: #3b82f6`, `--color-brand-hover: #2563eb`, `--color-brand-light: #1e3a5f`, `--surface: #0b0f19`, `--card-hex: #151a26`, `--card-hover: #1a2033`, `--border-light: #1e293b`. Rewrite gray-50 through gray-950 to VaultX values. Rewrite sidebar vars: `--sidebar: #080c14`, `--sidebar-hover: #0b0f19`, `--sidebar-active: #151a26`, `--sidebar-text: #64748b`, `--sidebar-text-active: #f8fafc`
- [x] **1.5** layout.css `.dark` — add 6 HSL vars for status: `--success` (`142 71% 55%`), `--success-foreground` (`142 60% 85%`), `--warning` (`35 85% 65%`), `--warning-foreground` (`35 60% 85%`), `--info` (`217 80% 70%`), `--info-foreground` (`217 60% 85%`). Add chart vars: `--chart-1: 217 91% 65%`, `--chart-2: 142 71% 55%`, `--chart-3: 35 85% 65%`
- [x] **1.6** layout.css `@theme` — add `--color-success`, `--color-success-foreground`, `--color-danger` (alias: `hsl(var(--destructive))`), `--color-danger-foreground`, `--color-warning`, `--color-warning-foreground`, `--color-info`, `--color-info-foreground`
- [x] **1.7** layout.css `@theme` — add `--radius-sm: 0.375rem`, `--radius-lg: 0.75rem`, `--radius-xl: 1rem`; add typography tokens `--text-display` through `--text-xs`
- [x] **1.8** layout.css `:root` + `.dark` — add chart CSS vars: `--chart-line-1` (#3b82f6 / #60a5fa), `--chart-line-2` (#22c55e / #4ade80), `--chart-tooltip-bg` (#1e293b / #151a26), `--chart-grid-color` (#94a3b8 / #475569), `--chart-grid-line` (#e2e8f0 / #1e293b)
- [x] **1.9** layout.css — rewrite card hover shadows: replace `rgba(5, 150, 105, ...)` with `rgba(59, 130, 246, ...)` in `.card:hover`, `.dark .card:hover`, `.card-elevated:hover`, `.stat-card:hover`, `.stat-card-featured:hover`. Update dark scrollbar thumb: `#333` → `#2d3a4f`, `#555` → `#475569`
- [x] **1.10** layout.css — remove `@import '../../design-system/tokens.css'`; delete `design-system/tokens.css` and `design-system/tokens.json`
- [x] **1.11** Verify: grep for `tokens\.\(css\|json\)` in src/ → 0 hits. Grep for `#059669\|#047857\|rgba(5, 150, 105` in layout.css → 0 hits
- [ ] **2.1** +page.svelte — replace `bg-white` → `bg-card`, `text-gray-700/800` → `text-foreground`, `text-gray-500/600` → `text-muted-foreground` in 4 quick-action cards + 2 list items
- [ ] **2.2** Same — replace `hover:bg-gray-50` → `hover:bg-muted/50`, `dark:bg-gray-800/50` → `dark:bg-card`, `dark:hover:bg-gray-800` → `dark:hover:bg-muted/50` in list items
- [ ] **2.3** Same — replace period buttons: `bg-gray-100 dark:bg-gray-800` → `bg-muted`; active → `bg-card text-foreground shadow-sm`; inactive → `text-muted-foreground hover:text-foreground`
- [ ] **2.4** Same — replace `border-border-light` → `border-border` (×6); emerald → `bg-success/15 text-success`, red → `bg-destructive/15 text-destructive`, blue → `bg-info/15 text-info`, amber → `bg-warning/15 text-warning` (×7)
- [ ] **2.5** Verify: grep for `bg-white\|border-border-light\|text-gray-[5678]\|dark:bg-gray-800` in +page.svelte → 0
- [ ] **3.1** sessions/+page.svelte — `bg-white dark:bg-gray-900` → `bg-card`; revoke → `bg-destructive/10 text-destructive`
- [ ] **3.2** config/+page.svelte — `border-gray-200 dark:border-gray-700` → `border-border`; `bg-white dark:bg-gray-900` → `bg-card`; drop `shadow-xl`
- [ ] **4.1** +page.svelte — add `isDark` $state from `document.documentElement.classList.contains('dark')`
- [ ] **4.2** Same — add MutationObserver on `<html>` class attr → flip `isDark`
- [ ] **4.3** Same — refactor `initChart()` to read colors via `getComputedStyle()` per mapping (blue #3b82f6 as line-1, green #22c55e as line-2); add `requestAnimationFrame` debounce; add `isDark` to $effect deps
- [ ] **5.1** Toast.svelte — emerald class → `bg-success/10 border-success text-success-foreground bar:bg-success`; red → `bg-destructive/10 border-destructive text-destructive-foreground bar:bg-destructive`
- [ ] **5.2** Badge.svelte — replace all 5 variant class strings per TC-6 mapping table (emerald→success/green, red→destructive, amber→warning, blue→info, gray→muted)
- [ ] **5.3** Verify: grep for `emerald-\|red-\|amber-\|blue-` in Toast/Badge → 0
- [ ] **6.1** Create `ActionIconButton.svelte` — props: `icon`, `variant` (edit/delete/default), `onclick`, `label`, `size` (sm/md); renders shadcn Button ghost + variant class (edit → `text-primary` = #3b82f6 blue)
- [ ] **6.2** equipos/+page.svelte — replace edit/delete buttons (lines 251-264)
- [ ] **6.3** equipos/tipos/+page.svelte — replace (lines 95-108)
- [ ] **6.4** tickets/+page.svelte — replace (lines 327-340)
- [ ] **6.5** proveedores/+page.svelte — replace (lines 160-173)
- [ ] **6.6** usuarios/+page.svelte — replace (lines 205-218)
- [ ] **6.7** mantenimiento/+page.svelte — replace plan-level inline SVG (lines 267-300) with Lucide + ActionIconButton; replace task-level (lines 365-378) with size="sm"
