# Tasks: Test Coverage for Server Logic & Core Routes

## Review Workload Forecast

| Field                   | Value                                   |
| ----------------------- | --------------------------------------- |
| Estimated changed lines | 800–1400 (9 test files + 4 infra files) |
| 400-line budget risk    | High                                    |
| Chained PRs recommended | No                                      |
| Delivery strategy       | exception-ok                            |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

### Work Units (one commit per unit)

| Unit                                                      | Commit                                            |
| --------------------------------------------------------- | ------------------------------------------------- |
| 1 Vitest infra (config, coverage, test-setup, $app mocks) | `test: vitest aliases, setupFiles, v8 coverage`   |
| 2 test-helpers.ts + seed                                  | `test: in-memory db helper and seed`              |
| 3 Tier 1 pure units (3 files)                             | 3 commits                                         |
| 4 Tier 2 integration (5 files)                            | 5 commits                                         |
| 5 Coverage verify + sdd config fix                        | `chore: verify coverage floor, update sdd config` |

## Phase 1: Infrastructure

- [x] 1.1 Update `vitest.config.ts`: `resolve.alias` `$lib`→`src/lib`, `$app`→`src/lib/test/mocks/$app`; `test.setupFiles`→`src/lib/server/db/test-setup.ts`; coverage provider `v8`, include `src/lib/server/**` + `src/lib/utils.ts` + 3 route handlers, exclude `seed.ts`, `statements: 70` (TC-1).
- [x] 1.2 `npm install -D @vitest/coverage-v8@^4.1.10`; add `"test:coverage": "vitest run --coverage"` to `package.json` (TC-1).
- [x] 1.3 Create `src/lib/server/db/test-setup.ts`: `DATABASE_URL='file::memory:'` + `NODE_ENV='test'` (TC-2).
- [x] 1.4 Create `src/lib/test/mocks/$app/environment.ts` (+ `forms.ts`, `navigation.ts`, `stores.ts` stubs) (TC-1).
- [x] 1.5 Verify `npx vitest run` — existing `auth.test.ts` passes under new config (TC-1).

## Phase 2: Test DB Helper

- [x] 2.1 Create `src/lib/server/db/test-helpers.ts`: `initTestDb()` (idempotent `pushSQLiteSchema({schema}, db)`+`apply()`, fallback `generateSQLiteDrizzleJson`+`generateMigration`), `seedTestData()`→`SeedIds` (3 users, 2 types, 4 equipos all states, 1 proveedor), `getTestPasswordHash()` cached promise (TC-2).

## Phase 3: Tier 1 — Pure Units

- [x] 3.1 Create `src/lib/server/state-machines.test.ts` (~18): both machines, valid/invalid transitions, `dado_de_baja` sink, unknown-state safety, role guards, reopen (TC-3).
- [x] 3.2 Create `src/lib/server/validators.test.ts` (~14): email, username 3–50 charset, password 5/6/128/129 + empty, `escapeLike` (TC-4).
- [x] 3.3 Create `src/lib/utils.test.ts` (~12): `cn`, `capitalize`, `formatDate`/`Short` (loose es-AR), `hasAccess`, `statusLabel` (TC-5).

## Phase 4: Tier 2 — Integration (in-memory DB)

- [x] 4.1 Extend `src/lib/server/auth.test.ts` (~16): rate limit 5th-fail + expired-window + reset-namespace, session lifecycle + sliding window 13h/6h, login failures, cookie helpers, `requireAuth`/`requireRole` 303 (TC-6).
- [x] 4.2 Create `src/lib/server/validators.db.test.ts` (~6): `isLastActiveAdmin`, `isUsernameTaken`/`isEmailTaken` + `excludeUserId`, `isEquipmentTypeNameTaken`, `userExists` (TC-7).
- [x] 4.3 Create `src/routes/equipos/+page.server.test.ts` (~9): create/update, status history, validation 400, invalid transition 400, non-admin decommission 403, ticket/PM delete refs 400 (TC-8).
- [x] 4.4 Create `src/routes/usuarios/+page.server.test.ts` (~8): joined validation errors, duplicates + `excludeUserId`, last-admin, self-delete, ticket/PM refs (TC-9).
- [x] 4.5 Create `src/routes/tickets/+page.server.test.ts` (~7): title/decommissioned 400, sequential `TKT` regex, transition 400, role 403, delete creator-or-admin, `add_comment` (TC-10).

## Phase 5: Reliability & Coverage Verification

- [x] 5.1 Audit all files for TC-11: no `it.concurrent` in tickets, bcrypt once via `getTestPasswordHash()`, no sleeps (explicit timestamps), `beforeAll(initTestDb)` per DB file (TC-11).
- [x] 5.2 Run `npx vitest run --coverage`; confirm ≥70% statements on included globs; add targeted assertions if short — never below 65 (TC-1).

## Phase 6: Cleanup

- [x] 6.1 Update `openspec/config.yaml`: `testing.runner: none detected` → `vitest` (stale from init).
- [x] 6.2 Final gate: `npm run format` && `npm run lint` && `npm run check` && `npm run test` green.
