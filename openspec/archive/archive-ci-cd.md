# Archive: CI Pipeline on GitHub Actions

## Change Summary

- **Propuesta**: `openspec/changes/archive/2026-08-06-ci-cd/proposal.md`
- **Spec**: `openspec/specs/ci-cd.md` (nueva capability, 8 requisitos CC-1..CC-8)
- **Design**: `openspec/changes/archive/2026-08-06-ci-cd/design/architecture.md`
- **Tasks**: `openspec/changes/archive/2026-08-06-ci-cd/tasks/tasks.md` (8/8 completadas)
- **Verify**: `openspec/archive/verify-report-ci-cd.md` ✅ PASS (8/8 compliant)
- **Commits**: fde7de5 (style), 56e710c (ci) — 2 commits, single PR, stacked-to-main

## Intent

El proyecto tenía cero CI ("No CI/CD configurado" per AGENTS.md) — todos los quality gates (format → lint → check → test) se cumplían solo por disciplina, así que las regresiones llegaban a `main` en silencio. Este cambio agrega un workflow de GitHub Actions que machine-enforce el pre-commit contract en cada push y PR a `main`, más un commit único de deuda Prettier y un pin de `engines` para que `engine-strict=true` sea real.

## Scope

- **`.github/workflows/ci.yml`** (nuevo): single job, ubuntu-latest, Node 24, npm cache, `npm ci`, gates en orden check → format:check → test → test:coverage (≥70%), upload de artifact `coverage/`, `permissions: contents: read`, concurrency group con cancel
- **Commit de deuda Prettier** (work unit 1, separado): `prettier --write` en 12 archivos (11 `src/**` + `DESIGN.md`)
- **`.prettierignore`**: + `/openspec/` (archivo es audit trail, nunca se reformatea)
- **`package.json`**: + `format:check` script, + `engines` field
- **Out of scope**: deployment (adapter-node), matrix builds, dependabot, secrets, `npm run lint` en CI, `npm run build`, deuda eslint

## Decisiones de diseño

- **Deferral de lint**: `npm run lint` sigue rojo (170 errores eslint pre-existentes, verificados 2026-08-06) y NO gatea CI. CI gatea en `format:check` en su lugar. Decisión registrada en el header comment de `ci.yml` y en el design. Follow-up change: `eslint-debt`.
- **Gate order** espeja el pre-commit de AGENTS.md: check → format:check → test → test:coverage (threshold 70% statements, enforced en `vitest.config.ts`)
- **Triggens main-only**: `push + pull_request` con `branches: [main]`; origin/HEAD = main; ref `master` stale ignorado
- **`npm ci`** lockfile-authoritative (lockfile committed) — falla si drift entre lockfile y package.json
- **Acciones pinned @v4** (checkout, setup-node, upload-artifact) — nunca `@main`
- **`engines` pin**: `^20.19.0 || >=22.12.0` — intersección válida de todos los engines de la toolchain (vite/vitest/vite-plugin-svelte/kit/svelte-check/prettier); CI pinnea Node 24, local v24.16.0 en rango

## Outcomes

- **2 commits**: `fde7de5` (style: 13 files — `.prettierignore` + 12 formateados, 164+/66-) → `56e710c` (ci: `ci.yml` 53 líneas + `package.json` format:check/engines)
- **4 gates verdes** (replay local 2026-08-07 en orden CI): check 0 errores / 0 warnings; format:check limpio; 139/139 tests (8 archivos, 25.53s); cobertura statements **78.29%** (505/645) sobre threshold 70
- **Cero impacto de runtime/DB/schema** — solo workflow, config y formato whitespace
- **8/8 requisitos spec COMPLIANT** (CC-1..CC-8), 8/8 escenarios cubiertos
- Primer run real de CI post-merge (GitHub Actions no corre local); monitorear run #1

## Known Deviations (documentadas en verify report)

- `node-version: '24'` normalizado por Prettier a comillas simples (cosmético, YAML funcionalmente idéntico al design)
- El único gate rojo local es `npm run lint` (170 errores pre-existentes) — intencional, NO gate (CC-6)

## Archivo

Este cambio se considera COMPLETO y ARCHIVADO. Carpeta movida a `openspec/changes/archive/2026-08-06-ci-cd/` (audit trail completo: proposal, specs, design, tasks, verify-report). Spec sincronizada a la fuente de verdad `openspec/specs/ci-cd.md`.
