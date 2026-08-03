# Archive: UI Consistency Audit & Token Consolidation

## Change Summary

- **Propuesta**: `openspec/proposals/ui-consistency-token-consolidation.md`
- **Specs**: `openspec/specs/design-tokens.md`, `openspec/specs/chart-theming.md`
- **Design**: `openspec/changes/archive/2026-08-03-ui-consistency-token-consolidation/design/architecture.md` + `design/components/action-icon-button.md`
- **Tasks**: `openspec/changes/archive/2026-08-03-ui-consistency-token-consolidation/tasks/tasks.md` (31/31 completadas según evidencia de código)
- **Verify**: `openspec/archive/verify-report-ui-consistency-token-consolidation.md` ✅ PASS WITH WARNINGS
- **Commits**: 49947f5 (head; abarca aa29105, b494d63, 51c94c8, 49947f5)

## Files Changed

```
src/routes/layout.css                 — tokens consolidados en @theme, paleta VaultX, radius + typography scale
src/routes/+page.svelte               — tokens semánticos + MutationObserver chart dark-mode
src/routes/sessions/+page.svelte      — bg-card / text-destructive
src/routes/config/+page.svelte        — border-border / bg-card
src/lib/ui/Toast.svelte               — colores semánticos success/destructive
src/lib/ui/Badge.svelte               — variantes success/destructive/warning/info/muted
src/lib/ui/ActionIconButton.svelte    — NUEVO: botón icono edit/delete/default reutilizable
src/routes/equipos/+page.svelte       — migrado a ActionIconButton
src/routes/equipos/tipos/+page.svelte — migrado a ActionIconButton
src/routes/tickets/+page.svelte       — migrado a ActionIconButton
src/routes/proveedores/+page.svelte   — migrado a ActionIconButton
src/routes/mantenimiento/+page.svelte — migrado a ActionIconButton
src/routes/usuarios/+page.svelte      — migrado a ActionIconButton
design-system/tokens.css              — ELIMINADO (dead file)
design-system/tokens.json             — ELIMINADO (dead file)
```

## Outcomes

- Sistema de tokens unificado en `layout.css` (paleta VaultX dark-first: #0b0f19 bg, primary azul)
- Colores semánticos success/danger/warning/info vía HSL + `@theme` con soporte de opacidad
- Chart.js del dashboard reactivo a dark mode (MutationObserver + getComputedStyle, reinit ~57ms)
- `ActionIconButton` usado en las 6 páginas CRUD (equipos, tipos, tickets, proveedores, mantenimiento, usuarios)
- Archivos muertos de `design-system/` eliminados, sin referencias residuales (`tokens.css|json` → 0 hits)
- Typography scale `--text-*` definida para uso futuro (sin reemplazar usos existentes)
- Build y type-check pasan (0 errores); 1 test vitest pre-existente pasa

## Known Deviations (documentadas en verify report)

- Radius tokens usan escala shadcn-default (spec decía 0.375/0.5/0.75/1rem) — PARTIAL
- Light primary desaturado a `217 76% 60%` (#4b86e7) vs spec `217 91%` — override deliberado de taste-design
- `ActionIconButton` renderiza `<button>` nativo, no shadcn Button ghost (deviación cosmética)
- Badge/Toast omiten variantes `dark:` del spec (la adaptación ocurre vía overrides de tokens `.dark`)
- Sessions/config usan `dark:bg-background` en vez de `dark:bg-card`
- `npm run lint` falla: 19 archivos prettier (8 pre-existentes al base + 11 nuevos)
- tasks.md quedó stale: apply nunca tildó tareas 2.x-6.x aunque el código está completo
- Spec TC-4 (chart-theming) tiene tabla stale (line-1 emerald/line-2 blue) que contradice design + implementación (line-1 blue/line-2 green)
- Hardcodes fuera de scope residuales: +error.svelte, auth/reset-password, reportes, login, +layout (bg-white/5)

## Archivo

Este cambio se considera COMPLETO y ARCHIVADO.
