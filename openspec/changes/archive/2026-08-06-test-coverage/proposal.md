# Proposal: Test Coverage for Server Logic & Core Routes

## Intent

Close the project's biggest weakness — near-zero automated tests (1 file, 1 test). This change builds a two-tier suite (pure unit + in-memory SQLite integration) over server logic and the three core CRUD handlers, plus the vitest infrastructure to make coverage measurable and guard regression.

## Scope

### In Scope

- **Tier 1 — pure unit tests** (zero infra):
  - `state-machines.ts` (~18 tests): transition validity, role guards, unknown-state safety
  - `validators.ts` pure part (~14 tests): email, username, password strength, required, escapeLike
  - `utils.ts` (~12 tests): cn, formatDate/Short, capitalize, hasAccess, statusLabel
- **Tier 2 — integration tests** (in-memory SQLite, no mocks):
  - `auth.test.ts` extend (~16): rate limits, session create/validate, sliding window, login flows, cookie helpers, requireAuth/requireRole
  - `validators.db.test.ts` (~6): isLastActiveAdmin, duplicate/existence checks
  - Route handlers: `equipos` (~9), `usuarios` (~8), `tickets` (~7)
- **Infra**: `$lib`/`$app` aliases in `vitest.config.ts`, `src/lib/server/db/test-helpers.ts`, `@vitest/coverage-v8` + coverage config

### Out of Scope

- `.svelte` components, `animations.ts`, `reportes` route, `sessions` route, load functions
- E2E/Playwright, CI/CD wiring
- Production refactors for testability (minimal seams only)

## Capabilities

### New Capabilities

- `test-coverage`: automated suite covering state machines, validators, utils, auth, and core route handlers with v8 coverage thresholds

### Modified Capabilities

None — no spec-level behavior changes.

## Approach

1. **Infra first**: aliases in `vitest.config.ts`; `test-helpers.ts` (in-memory client + `pushSQLiteSchema` + minimal seed with pre-hashed password); add `@vitest/coverage-v8`, configure thresholds.
2. **Tier 1**: pure unit tests — fast, highest value, zero infra risk.
3. **Tier 2**: integration tests against fresh per-file in-memory DB (Vitest module isolation).
4. **Verify**: `npm run test` green, coverage ≥ threshold, `check` + `lint` pass.

## Technical Notes

- Set `process.env.DATABASE_URL = 'file::memory:'` BEFORE first import of any module pulling `$lib/server/db` (client created eagerly at module load).
- Schema via `pushSQLiteSchema` from `drizzle-kit/api` (export verified at proposal time). No migrations folder.
- Only `$lib` alias strictly required for target routes (`$app/environment` only in excluded .svelte/animations); add `$app` alias defensively.
- Hash password once in `beforeAll` (bcrypt ≈100ms) — never per test.
- `formatDate` es-AR: assert loosely (date parts, not exact locale strings) — Node ICU varies.
- No `it.concurrent` in tickets tests — shared in-memory DB per file.

## Affected Areas

| Area                                       | Impact   | Description                                   |
| ------------------------------------------ | -------- | --------------------------------------------- |
| `vitest.config.ts`                         | Modified | Aliases + coverage config                     |
| `package.json`                             | Modified | `@vitest/coverage-v8` devDep, coverage script |
| `src/lib/server/db/test-helpers.ts`        | New      | In-memory DB setup + seed                     |
| `src/lib/server/state-machines.test.ts`    | New      | ~18 tests                                     |
| `src/lib/server/validators.test.ts`        | New      | ~14 tests                                     |
| `src/lib/utils.test.ts`                    | New      | ~12 tests                                     |
| `src/lib/server/auth.test.ts`              | Extended | ~16 tests                                     |
| `src/lib/server/validators.db.test.ts`     | New      | ~6 tests                                      |
| `src/routes/equipos/+page.server.test.ts`  | New      | ~9 tests                                      |
| `src/routes/usuarios/+page.server.test.ts` | New      | ~8 tests                                      |
| `src/routes/tickets/+page.server.test.ts`  | New      | ~7 tests                                      |

## Risks

| Risk                                                | Likelihood | Mitigation                                                                       |
| --------------------------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| `pushSQLiteSchema` experimental in drizzle-kit 0.31 | Med        | Export verified; fallback: temp migrations via `generateMigration` + `migrate()` |
| Alias resolution differs from SvelteKit plugin      | Low        | Only `$lib` required by target routes; mock `$app` if pulled                     |
| es-AR `formatDate` assertions flaky (ICU)           | Med        | Assert date parts/relative output, not exact locale strings                      |
| bcrypt cost slows suite                             | Low        | Single pre-hashed seed password in `beforeAll`                                   |
| Shared DB state breaks parallel tests               | Low        | Fresh DB per file; no `it.concurrent` in tickets                                 |

## Rollback Plan

Revert commit via `git revert <sha>`. Tests are additive; production code untouched (no planned seams). Zero schema/migration changes — nothing to migrate back.

## Dependencies

- `@vitest/coverage-v8` (new devDependency)
- `drizzle-kit/api` → `pushSQLiteSchema` (existing dep, export verified)

## Success Criteria

- [ ] `npm run test` green: ~90 tests across 9 files
- [ ] Coverage ≥ 65% statements on `src/lib/server/**`, `src/lib/utils.ts`, three route handlers
- [ ] `npm run check` and `npm run lint` pass
- [ ] No committed migrations folder (pushSQLiteSchema only)
