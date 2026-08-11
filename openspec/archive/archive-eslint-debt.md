# Archive: ESLint Debt — Lint as CI Gate

## Change Summary

- **Propuesta**: `openspec/changes/archive/2026-08-10-eslint-debt/proposal.md`
- **Spec**: `openspec/specs/eslint-debt.md` (capability nueva, 5 requisitos EL-1..EL-5) + deltas MODIFIED sobre `openspec/specs/ci-cd.md` (CC-4, CC-6) y `openspec/specs/project-readme.md` (RD-6)
- **Design**: fase de diseño SKIPPEADA (decisión registrada en `tasks.md` — "zero architectural surface", los fixes son behavior-neutral)
- **Tasks**: `openspec/changes/archive/2026-08-10-eslint-debt/tasks/tasks.md` (13/13 completadas, 12 commits por batch)
- **Verify**: `openspec/archive/verify-report-eslint-debt.md` ⚠️ PASS WITH WARNINGS (9/9 compliant)
- **Commits**: B1 `4a59217`, B2 `f4dcc09`, B3 `ab5eeec`, B4 `444902f`, B5 `9b6f044`, B6 `0d7bc07`, B7 `4c6274c`, B8 `6384baa`, B9 `a3334c9`, B11 `20f6a8d`, B12 `316d076`, B10 `805c1be` — 12 commits, base `ea5064a`, single PR stacked-to-main

## Intent

Eliminar la deuda ESLint pre-existente — **151 errores** (139 `.svelte` + 12 `.ts`, verificados 2026-08-10) — para que `npm run lint` salga 0 en todo el repo y ESLint se convierta en gate de CI. Esto revierte `ci-cd` CC-6: antes el lint quedaba deliberadamente rojo (170 errores, out of scope) y NO gateaba CI; ahora el pipeline corre `check → format:check → lint → test → test:coverage`.

## Scope

- **Fixes de código en 33 archivos**: `no-useless-mustaches` (5), `no-unused-svelte-ignore` (24), `no-unused-vars` (13 svelte + 6 ts), `require-each-key` (24), `no-navigation-without-resolve` (19), `no-explicit-any` (41 svelte + 2 ts), `prefer-svelte-reactivity` (5 + 3 ts), `prefer-writable-derived` (4), `no-unused-expressions` (3), `no-constant-binary-expression` (1), `no-empty` (1)
- **`src/lib/stores/toast.svelte.ts`**: `Map` → `SvelteMap`
- **`.github/workflows/ci.yml`**: paso `Lint` tras `format:check` y antes de `test` + header comment actualizado
- **`README.md`**: sección CI (RD-6) — lint es gate obligatorio
- **Out of scope**: `eslint.config.js` (intocado), refactors de lógica, dependency upgrades, cambios de cobertura

## Decisiones

- **Fix code, not rules**: `eslint.config.js` SIN cambios (`git diff` vacío — verificado en B13.2); **0 `eslint-disable`** restantes en `src/` (grep verificado — B10 eliminó los últimos dos de `src/lib/utils.ts` con `any` → `unknown`)
- **Per-batch commits (EL-5)**: 12 commits agrupados por categoría de regla (trivial → keys → resolve → any → reactividad → utilidades → CI → README) para revert independiente por batch; orden B1→B12 con B10 aterrizando al final (ver Known Deviations)
- **Lint gate después de `format:check`**: preserva el short-circuit Prettier-first del script `lint` (`prettier --check . && eslint .`, script sin cambios)
- **READMe RD-6 actualizado**: sin texto stale ("ESLint no es gate: ~170 errores preexistentes" eliminado)

## Outcomes

- **`npm run lint` 0 errores / 0 warnings** repo-wide (antes: 151)
- **`npm run check` 0 errores** (2 warnings pre-existentes, ajenos al cambio)
- **`npm run test` 177/177** pasando; **coverage 82.3%** statements — sin regresión (mismo número date-stamped en README desde 2026-08-07)
- **`ci.yml`** orden final: `check → format:check → lint → test → test:coverage` (≥70% statements) — lint gatea CI
- **9/9 compliance items** PASS WITH WARNINGS (5 EL + CC-4 + CC-6 ×2 cláusulas + RD-6)

## Known Deviations (documentadas en verify report)

1. **CC-6 design-record gap**: CC-6 exige que el reversal quede "recorded in the change's design", pero la fase de diseño fue skippeada; el reversal quedó documentado en proposal.md, tasks.md y el commit `20f6a8d` (header comment de ci.yml). Severity: WARNING (registro en artefactos alternativos).
2. **2 warnings pre-existentes en `npm run check`** (svelte-check): ajenos al cambio, no introducidos por ESLint fixes. EL-4 requiere 0 warnings; se documenta como WARNING pre-existente.
3. **B10 aterrizó después de B11/B12**: el commit `805c1be` (utils.ts `any`→`unknown`) es HEAD, tras `20f6a8d` (CI) y `316d076` (README). No rompe EL-5 (cada batch sigue siendo revertible independientemente); nota de orden, no de contenido.
4. **CommandPalette dead-effect removal (B8 deviation)**: en `src/lib/ui/CommandPalette.svelte` el `$effect` de reset de `selectedIndex` era **provablemente muerto** (sin dependencias reactivas — se ejecutaba una sola vez al montar sin efecto observable). En vez del rewrite a `$derived` (imposible: no hay valor derivable, el efecto no escribía estado reactivo legible), el efecto fue **eliminado**. Behavior-neutral per EL-2; la alternativa `$derived` no aplicaba. Anotado aquí como desviación documentada del plan de B8.

## Archivo

Este cambio se considera COMPLETO y ARCHIVADO. Carpeta movida a `openspec/changes/archive/2026-08-10-eslint-debt/` (audit trail completo: proposal, specs, tasks, verify-report). Specs sincronizadas a la fuente de verdad: `openspec/specs/eslint-debt.md` (nueva), `openspec/specs/ci-cd.md` (CC-4/CC-6 mergeados), `openspec/specs/project-readme.md` (RD-6 mergeado).
