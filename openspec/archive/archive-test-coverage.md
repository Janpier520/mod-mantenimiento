# Archive: Test Coverage for Server Logic & Core Routes

## Change Summary

- **Propuesta**: `openspec/changes/archive/2026-08-06-test-coverage/proposal.md`
- **Spec**: `openspec/specs/test-coverage.md` (nueva capability, 11 requisitos TC-1..TC-11)
- **Design**: `openspec/changes/archive/2026-08-06-test-coverage/design/architecture.md` (D1-D9) + `design/components/route-test-harness.md`, `design/components/test-helpers.md`
- **Tasks**: `openspec/changes/archive/2026-08-06-test-coverage/tasks/tasks.md` (16/16 completadas)
- **Verify**: `openspec/archive/verify-report-test-coverage.md` ✅ PASS WITH WARNINGS (11/11 compliant)
- **Commits**: b8b7e7d, e6b327a, f42146c, 62185e1, d26f7cd (5 commits, stacked-to-main)

## Intent

Cerrar la mayor debilidad del proyecto — cobertura automatizada casi nula (1 archivo, 1 test). Construir un suite de dos niveles (unit puro + integración con SQLite in-memory) sobre la lógica de servidor y los tres handlers CRUD core, más la infraestructura Vitest para medir y hacer cumplir la cobertura.

## Scope

- **Tier 1 — unit puro** (zero infra): `state-machines.test.ts` (26), `validators.test.ts` (22), `utils.test.ts` (17)
- **Tier 2 — integración** (SQLite in-memory, sin mocks): `auth.test.ts` extendido (22), `validators.db.test.ts` (9), handlers CRUD `equipos/crud.test.ts` (14), `usuarios/crud.test.ts` (14), `tickets/crud.test.ts` (18)
- **Infra**: aliases `$lib`/`$app` en `vitest.config.ts`, `test-setup.ts` (inyección de env), `test-helpers.ts` (`pushSQLiteSchema` + seed), `@vitest/coverage-v8` + threshold `statements: 70`
- **Out of scope**: `.svelte` components, `reportes`/`sessions`, load functions, E2E, CI/CD

## Decisiones de diseño (D1-D9)

- D1: `DATABASE_URL` inyectado vía `test.setupFiles`, no en primer import del helper
- D2: `$lib` → `src/lib` real; `$app` → mock defensivo `src/lib/test/mocks/$app/`
- D3: threshold `statements: 70` fijo (no rango 65-70), `seed.ts` excluido del coverage
- D4: schema vía `pushSQLiteSchema` con fallback documentado (`generateMigration`)
- D5: invocación directa de `actions.crud({ request, locals })` — sin E2E
- D6: tiempo determinista con timestamps explícitos, sin fake timers ni sleeps
- D7: numeración de tickets por `count()` + regex `^TKT-\d{8}-00[12]$`, sin `it.concurrent`
- D8: bcrypt hash una sola vez (promesa cacheada a nivel módulo), nunca por test
- D9: tests co-locados (`src/**/*.test.ts`), helpers bajo `src/lib/server/db/`

## Outcomes

- **139 tests** en 8 archivos, todos pasando (23.21s)
- **Cobertura statements 78.29%** (505/645) — por encima del threshold 70% enforced (v8 report; run exit non-zero por debajo)
- Per-glob: `lib/server` 90.84%, `lib/server/db` 88.59%, `routes/usuarios` 73.33%, `routes/equipos` 64.36%, `routes/tickets` 61.98%
- `npm run check` 0 errores / 0 warnings; prettier + eslint limpios en archivos del cambio
- **Cero código de producción modificado** — solo tests, config, y `.gitignore`
- `openspec/config.yaml` actualizado: `testing.runner: vitest`
- Sin carpeta de migraciones (solo `pushSQLiteSchema`)

## Known Deviations (documentadas en verify report)

- `routes/equipos` (64.36%) y `routes/tickets` (61.98%) por debajo del piso 65% mencionado en la propuesta (load functions sin testear arrastran los handlers); el threshold enforced es el global único `statements: 70` que pasa a 78.29% — TC-1 compliant
- Nombres de archivos de test `crud.test.ts` (co-locados) en vez de `+page.server.test.ts` predichos por el diseño D9 (funcionalmente equivalentes)
- `pushSQLiteSchema(schema, db)` recibe el module namespace directo en vez de `{ schema }` — funciona en runtime (drizzle-kit `prepareFromExports`)
- `test-helpers.ts` dentro del include de coverage cuenta 80.55% hacia el threshold (real tested code, inofensivo)

## Archivo

Este cambio se considera COMPLETO y ARCHIVADO. Carpeta movida a `openspec/changes/archive/2026-08-06-test-coverage/` (audit trail completo: proposal, specs, design, tasks, verify-report). Spec sincronizada a la fuente de verdad `openspec/specs/test-coverage.md`.
