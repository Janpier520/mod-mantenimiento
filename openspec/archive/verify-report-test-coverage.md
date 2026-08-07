# Verification Report — Test Coverage for Server Logic & Core Routes

**Change**: test-coverage
**Version**: delta spec `openspec/changes/archive/2026-08-06-test-coverage/specs/test-coverage/spec.md` (synced to main spec `openspec/specs/test-coverage.md`)
**Mode**: Standard (strict_tdd: false in `openspec/config.yaml`)
**Date**: 2026-08-07
**Status**: ARCHIVED (verification executed pre-archive; copy preserved per flat repo convention)

## Verdict

**PASS WITH WARNINGS** — all 11 spec requirements (TC-1..TC-11) are COMPLIANT with passing covering tests; all gates green (139/139 tests, coverage 78.29% vs 70% threshold enforced, check 0/0, prettier+eslint clean on change files). Warnings are non-spec-breaking design deviations and one coverage observation.

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 16 |
| Tasks complete | 16 |
| Tasks incomplete | 0 |

All tasks in `tasks.md` marked `[x]` (Phases 1–6). Verified against files on disk.

## Gate Results (executed 2026-08-07)

| Gate | Command | Result |
|------|---------|--------|
| Test | `npm run test` | ✅ 139/139 passed, 8 files, 23.21s |
| Coverage | `npm run test:coverage` | ✅ 139/139 passed; statements **78.29%** (505/645), branches 67.18%, functions 82.55%, lines 81.11% — above threshold **70** (enforced; run exits non-zero below it) |
| Type check | `npm run check` | ✅ 0 errors, 0 warnings (svelte-check) |
| Format | `npx prettier --check` (all 12 change files) | ✅ All files use Prettier code style |
| Lint | `npx eslint` (10 change test/helper files) | ✅ Clean (no output) |
| Lint global | `npm run lint` | ⚠️ Fails ONLY on 23 pre-existing unformatted files (orchestrator-verified, not part of this change) |

Coverage per-glob (v8 report): `lib/server` 90.84% (auth 83.95%, state-machines 100%, validators 98.03%), `lib/server/db` 88.59% (schema 90.74%, test-helpers 80.55%), `routes/usuarios` 73.33%, `routes/equipos` 64.36%, `routes/tickets` 61.98%.

## Compliance Matrix (TC-1..TC-11)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| TC-1 Vitest infra & coverage | ✅ COMPLIANT | `vitest.config.ts`: aliases `$lib`→`src/lib`, `$app`→`src/lib/test/mocks/$app`; `include: ['src/**/*.test.ts']`; setupFiles → `test-setup.ts`; provider v8; `@vitest/coverage-v8@^4.1.10` devDep; `thresholds.statements: 70` (in 65–70 band); exclude `seed.ts` + `coverage` in .gitignore. Route tests import `$lib/server/db` and pass without SvelteKit plugin. Coverage run produced v8 report and enforced the threshold (exit 0 at 78.29%) |
| TC-2 Test DB helper | ✅ COMPLIANT | `test-setup.ts` sets `DATABASE_URL='file::memory:'` + `NODE_ENV='test'` in setupFiles (pre-import); `test-helpers.ts` re-asserts env, uses `pushSQLiteSchema(schema, db)` via dynamic import with documented fallback (`generateSQLiteDrizzleJson` + `generateMigration` executed via `db.run(sql.raw(...))`); seed = 3 users (admin/tecnico/consultor), 2 types (PC/Notebook), 4 equipos covering all states, 1 proveedor; `getTestPasswordHash()` module-cached promise; `initTestDb()` idempotent, called in `beforeAll` of all 5 DB files. Isolation proven: 8 files run in one Vitest run, each sees only its own data |
| TC-3 State machines | ✅ COMPLIANT | `src/lib/server/state-machines.test.ts` (26 tests): both machines, valid/invalid transitions, `dado_de_baja` sink `[]`/`false`, unknown-state `'inexistente'` → `false` no-throw, role guards (tecnico→dado_de_baja blocked w/ admin-only error, admin allowed; ticket cerrado admin/consultor-only), reopen `cerrado → abierto` |
| TC-4 Validators (pure) | ✅ COMPLIANT | `src/lib/server/validators.test.ts` (22 tests): `validateEmail` valid/malformed, `validateUsername` 3–50 `[a-zA-Z0-9_.-]` boundaries, `validatePasswordStrength` 5/6/128/129 + empty→required, `validateRequired`, `escapeLike` `%`→`\%`, `_`→`\_`, both, plain, empty→`''` |
| TC-5 Utils | ✅ COMPLIANT | `src/lib/utils.test.ts` (17 tests): `cn` conflict→last class, `capitalize`, `formatDate`/`formatDateShort` loose es-AR (year + month-name substring, no exact locale strings), `null`/`undefined`→`'—'`, `hasAccess` empty/undefined→grant + undefined-with-required→deny + non-match→deny, `statusLabel` known labels + capitalize fallback |
| TC-6 Auth (integration) | ✅ COMPLIANT | `src/lib/server/auth.test.ts` (22 tests): 5th failed attempt → `allowed:false` + `retryAfterMs>0`; 20-min-old attempt not counted; `reset:` namespace isolation both directions; session create/validate/delete; expired→null; sliding window 13h→extended ≈now+24h, 6h→unchanged; login unknown-user/disabled/wrong-password; success clears attempts; cookie helpers set/read/clear `equip-lab-session` on mock Cookies; `requireAuth` 303→`/login`, `requireRole` tecnico→admin 303→`/` |
| TC-7 DB validators | ✅ COMPLIANT | `src/lib/server/validators.db.test.ts` (9 tests): `isLastActiveAdmin` 1-admin→true / +2nd→false / non-admin→false / inactive→false; `isUsernameTaken`/`isEmailTaken` true + `excludeUserId`→false; `isEquipmentTypeNameTaken`; `userExists` |
| TC-8 Route — equipos | ✅ COMPLIANT | `src/routes/equipos/crud.test.ts` (14 tests): create/update success, status history row (estado_anterior/nuevo, cambiado_por=admin), missing `modelo`/`marca`/`tipo_id`→400, invalid transition `dado_de_baja→operativo`→400, tecnico decommission→403, delete with ticket ref→400 / PM-plan ref→400, unreferenced delete success, unauth 303, consultor 403, invalid estado 400 |
| TC-9 Route — usuarios | ✅ COMPLIANT | `src/routes/usuarios/crud.test.ts` (14 tests): joined validation errors (5 errors in one message), duplicate username/email→400, update to other's email→400 + keep own→success (`excludeUserId`), last-admin deactivate/role-change/delete→400, self-delete→400, delete ref'd by ticket→400 / pm_execution→400 (plan+task+exec inserted inline), unreferenced→success, non-admin→303 `/` |
| TC-10 Route — tickets | ✅ COMPLIANT | `src/routes/tickets/crud.test.ts` (18 tests): empty title→400, decommissioned equipment→400, sequential `TKT-\d{8}-001/002` (regex, same date part), invalid `abierto→resuelto`→400, tecnico `→cerrado`→403 (role map), delete non-creator-non-admin→403 / creator→success / admin→success, `add_comment` row created / empty→400 / missing ticket→404 / missing id→400, non-existent equipment/tecnico→400. Consultor-created-ticket state seeded via direct insert per design TC-10 note (action blocks consultor at top — asserted separately) |
| TC-11 Reliability | ✅ COMPLIANT | No `it.concurrent` anywhere (grep: only a comment mentions it); bcrypt only in `test-helpers.ts` as module-cached promise (grep: zero `bcrypt` in test files; seed uses pre-hashed value); no sleeps/fake timers (grep: zero `setTimeout`/`sleep`/`vi.waitFor`/`fakeTimers`); time-dependent tests insert explicit `created_at`/`expires_at` timestamps (auth.test.ts rate-limit/sliding-window); fresh in-memory DB per file via setupFiles env injection + Vitest module isolation |

**Compliance summary**: 11/11 requirements COMPLIANT, 22/22 spec scenarios covered by passing tests.

## Correctness (Static Evidence)

| Item | Status | Notes |
|------|--------|-------|
| Production code modified | ✅ None | `git status`: only test files, `vitest.config.ts`, `package.json`, `package-lock.json`, `openspec/config.yaml`, `.gitignore` (coverage dir), `.atl/*` touched. Zero `+page.server.ts` / `auth.ts` / `validators.ts` / `state-machines.ts` / `utils.ts` / `db/*` source changes |
| `openspec/config.yaml` runner | ✅ Updated | `testing.runner: none detected` → `vitest` with note (task 6.1) |
| No migrations folder | ✅ | Schema created via `pushSQLiteSchema` only; no `migrations/` committed |
| `test:coverage` script | ✅ | `"test:coverage": "vitest run --coverage"` in package.json |

## Issues Found

**CRITICAL**: None

**WARNING**:
1. **Per-glob coverage below design estimate / spec-floor note**: `routes/equipos` (64.36%) and `routes/tickets` (61.98%) sit below the 65% spec-floor figure cited in the proposal, and below design D3's 80–85% estimate (load functions untested drag the handlers down). The enforced threshold is the single global `statements: 70` over the union of includes, which passes at 78.29% — TC-1 compliant as configured. If per-glob ≥65% is intended, add targeted load-function/branch tests for these two handlers. Severity: WARNING (no spec break as written).
2. **Test file naming deviates from design D9/file table**: files are `crud.test.ts` (co-located in route dirs) instead of `+page.server.test.ts`. Functionally equivalent (imports `./+page.server` + `./$types` from same dir; still matches `src/**/*.test.ts`), but the design's File Changes table predicted different names. Severity: WARNING (cosmetic, spec-agnostic).

**SUGGESTION**:
1. Design D4 specified `pushSQLiteSchema({ schema }, db)`; implementation passes the module namespace directly (`pushSQLiteSchema(schema, db)`) — works at runtime (drizzle-kit `prepareFromExports` runs `Object.values(imports)`), and the code documents why. Consider updating the design doc for accuracy.
2. `test-helpers.ts` is inside the `src/lib/server/**` coverage include; its 80.55% counts toward the threshold. Harmless (it is real tested code), but worth knowing if thresholds get tightened.

## Next Recommended

**None — SDD cycle complete.** Change fully implemented, verified, and archived. Delta spec synced to `openspec/specs/test-coverage.md`; change folder at `openspec/changes/archive/2026-08-06-test-coverage/`.

## Risks

- Low: tickets/equipos handler coverage (~62–64%) makes those two globs more fragile to regressions in untested branches (load functions). Not a current gate failure.
- Low: `pushSQLiteSchema` is experimental in drizzle-kit 0.31; the documented fallback path (generateMigration) is implemented but not runtime-exercised (primary path always succeeds). If drizzle-kit bumps break the primary path, the fallback activates — untested code path.
