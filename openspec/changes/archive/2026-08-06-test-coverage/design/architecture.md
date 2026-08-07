# Design: Test Coverage for Server Logic & Core Routes

## Technical Approach

Two-tier suite over the existing codebase (SvelteKit 5 + Drizzle ORM + libSQL):

- **Tier 1 — pure unit**: `state-machines.ts`, `validators.ts` (pure part), `utils.ts`. Zero infra.
- **Tier 2 — integration**: auth, DB validators, and the three CRUD actions (`equipos`, `usuarios`, `tickets`) against a fresh in-memory SQLite DB **per test file**, using Vitest's module isolation (`isolate: true` default) — no mocks, no `it.concurrent`.

Infrastructure: `vitest.config.ts` aliases + `setupFiles` env injection + v8 coverage thresholds; `test-helpers.ts` pushes the schema programmatically via `drizzle-kit/api` and seeds a minimal dataset with a pre-hashed password. No production code changes (no seams needed — all three route actions take `{ request, locals }` and are directly invocable).

## Architecture Decisions

### D1: DATABASE_URL injection — `setupFiles`, not first-import in helper

| Option                            | Tradeoff                                                                                                                          | Decision  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------- |
| First import in `test-helpers.ts` | Import-order dependent; a route test importing `$lib/server/db` before the helper would bind `db` to the real `file:equip-lab.db` | ❌ Reject |
| `globalSetup`                     | Runs in a separate process — env wouldn't reach the worker                                                                        | ❌ Reject |
| `test.setupFiles` entry           | Runs in the worker **before** any test-file module import; immune to import order                                                 | ✅ Adopt  |

`src/lib/server/db/test-setup.ts` contains ONLY `process.env.DATABASE_URL = 'file::memory:'` (plus `NODE_ENV='test'`). `db/index.ts` reads the env at module load and creates the libSQL client eagerly — per-file module isolation gives each file its own client and its own in-memory DB. `test-helpers.ts` also re-asserts the env at its top (spec TC-2 compliance, belt-and-braces).

### D2: Aliases — `$lib` real path, `$app` defensive mock

Verified by grep: the 3 target route handlers + their full import graph (`db/index.ts`, `schema.ts`, `auth.ts`, `validators.ts`, `state-machines.ts`, `utils.ts`, `types.ts`) import **zero** `$app/*` modules at runtime. `$app` appears only in `.svelte` files, `animations.ts`, and `toast.svelte.ts` — all out of scope. The `./$types` import in route handlers is `import type` → erased by esbuild at runtime.

| Option                                            | Tradeoff                                                                                     | Decision  |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------- |
| Only `$lib` alias                                 | Minimal; but spec TC-1 mandates `$app` too                                                   | ❌ Reject |
| `$app` → `./.svelte-kit/ambient.d.ts`             | It's a type-declaration file, not a runtime module — cannot import values from it            | ❌ Reject |
| `$app` → tiny mock dir `src/lib/test/mocks/$app/` | Self-contained, no dependency on generated `.svelte-kit`; currently unreferenced (defensive) | ✅ Adopt  |

`resolve.alias`: `$lib` → `src/lib`, `$app` → `src/lib/test/mocks/$app` (module `environment.ts` = `browser: false, dev: true, building: false, version: 'test'`; minimal `forms.ts`, `navigation.ts`, `stores.ts` stubs for future-proofing).

### D3: Coverage threshold — pin `statements: 70`, exclude `seed.ts`

| Option                              | Tradeoff                                                        | Decision  |
| ----------------------------------- | --------------------------------------------------------------- | --------- |
| Range 65–70                         | Non-deterministic CI; threshold is a single number in v8 config | ❌ Reject |
| `statements: 70` + exclude patterns | Deterministic; achievable (see estimate)                        | ✅ Adopt  |

`coverage.include` = `src/lib/server/**`, `src/lib/utils.ts`, the 3 route handlers. `coverage.exclude` = `src/lib/server/db/seed.ts` (bootstrap/demo code, never imported by tests — would otherwise drag the aggregate below 70%). Estimate: server libs ≈85% (auth drags), handlers ≈80–85% (load functions untested, crud ~90%), utils ≈90% → aggregate ≈80%+. If the first run lands short, add 2–3 targeted assertions — **never** lower below 65 (spec floor).

### D4: Schema creation — `pushSQLiteSchema`, documented fallback

`drizzle-kit@0.31.10` exports `pushSQLiteSchema(imports: Record<string, unknown>, drizzleInstance: LibSQLDatabase<any>)` → `{ hasDataLoss, warnings, statementsToExecute, apply }` (verified in `node_modules/drizzle-kit/api.d.ts`). Call: `pushSQLiteSchema({ schema }, db)` — `imports` keys are module labels consumed by `prepareFromExports`. Fallback (same effect, no migrations folder): `generateSQLiteDrizzleJson({})` → prev snapshot, `generateSQLiteDrizzleJson({ schema })` → cur snapshot, `generateMigration(prev, cur)` → `string[]` executed via `db.run(sql.raw(stmt))`. Full contract in `components/test-helpers.md`.

### D5: Action invocation — call exported `actions.crud` directly

| Option                                           | Tradeoff                                            | Decision  |
| ------------------------------------------------ | --------------------------------------------------- | --------- |
| `use:enhance` + DOM/Playwright                   | E2E — out of scope                                  | ❌ Reject |
| Direct call with typed `Request` + fake `locals` | Unit-speed, no browser; requires a narrow type cast | ✅ Adopt  |

Handlers destructure only `{ request, locals }` (equipos/tickets) and `{ request, locals }` via `requireRole(locals, 'admin')` (usuarios). `request` = `new Request(url, { method: 'POST', body: formData })`. Assertions on results use the **verified runtime shapes**: `fail()` returns `ActionFailure` instance with `.status` and `.data` (no `.type` at runtime — that's TS-only); `redirect()` **throws** a `Redirect` instance `{ status, location }` (not an `Error`). Full harness in `components/route-test-harness.md`.

### D6: Deterministic time — explicit timestamps, no fake timers

| Option                                     | Tradeoff                                                                                                       | Decision  |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | --------- |
| `vi.useFakeTimers`                         | Fakes `Date.now()` globally; DB rows store real timestamps at insert — mismatched ages, leak risk across files | ❌ Reject |
| Explicit `created_at`/`expires_at` inserts | Deterministic, no sleeps, spec TC-11 compliant                                                                 | ✅ Adopt  |

Rate-limit and sliding-window tests insert rows with explicit timestamps computed from `Date.now()` at insert time (e.g. `now − 20min`), then assert against the real clock. No `it.concurrent`, no sleeps.

### D7: Ticket numbering — `count()`-based, sequential per file

`generateTicketNumber()` (tickets handler) does `count(*) WHERE numero_ticket LIKE 'TKT-<datePart>-%'` then `+1`. In a fresh per-file in-memory DB the count starts at 0 → first create yields `-001`, second `-002` **provided tests run serially**. Assert with regex `^TKT-\d{8}-00[12]$` (never hardcode the date — it's the real clock's UTC date). Constraint: no `it.concurrent` in `tickets/+page.server.test.ts` (spec TC-11).

### D8: bcrypt — one hash for seed, accept route-level cost

`getTestPasswordHash()` caches a module-level promise (computed once per worker). Seed users reuse it. Route handlers internally hash new passwords on create/update (real code under test) ≈100ms each → keep password-hashing creations to 2–3 per file (~0.5s total, acceptable). Login tests call `bcrypt.compare` ~3–4 times.

### D9: Naming & structure

Tests co-located (`src/**/*.test.ts` — matches existing `include`). Helpers under `src/lib/server/db/` (next to the code they set up); `$app` mocks under `src/lib/test/mocks/$app/`. All within `src/` so `svelte-check`, `eslint`, and `prettier` cover them without tsconfig changes.

## Data Flow

```
vitest worker (per test file)
  │
  ├─ setupFiles: test-setup.ts → process.env.DATABASE_URL = 'file::memory:'
  │
  ├─ test imports test-helpers.ts
  │     └─ test-helpers imports ./index → db client created with :memory: URL
  │
  ├─ beforeAll(initTestDb)
  │     ├─ pushSQLiteSchema({ schema }, db) + apply()   (or generateMigration fallback)
  │     └─ seedTestData(): users ×3, types ×2, equipos ×4 (all states), proveedor ×1
  │
  ├─ test invokes actions.crud({ request, locals })  ← real handler, real in-memory DB
  │     └─ result: ActionFailure { status, data } | success { success: true } | throws Redirect
  │
  └─ assertions read DB state via db.query.*  (no mocks)
```

## File Changes

| File                                                                                  | Action | Description                                                                                         |
| ------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| `vitest.config.ts`                                                                    | Modify | `resolve.alias` (`$lib`, `$app`), `test.setupFiles`, v8 coverage include/exclude + `statements: 70` |
| `package.json`                                                                        | Modify | Add `@vitest/coverage-v8@^4.1.10` devDep; add `"test:coverage": "vitest run --coverage"`            |
| `src/lib/server/db/test-setup.ts`                                                     | Create | Sets `DATABASE_URL` before any import                                                               |
| `src/lib/server/db/test-helpers.ts`                                                   | Create | `initTestDb()`, `seedTestData()`, `getTestPasswordHash()` (see component doc)                       |
| `src/lib/test/mocks/$app/environment.ts` (+ `forms.ts`, `navigation.ts`, `stores.ts`) | Create | Defensive `$app` stubs (currently unreferenced)                                                     |
| `src/lib/server/state-machines.test.ts`                                               | Create | ~18 tests (TC-3)                                                                                    |
| `src/lib/server/validators.test.ts`                                                   | Create | ~14 tests (TC-4)                                                                                    |
| `src/lib/utils.test.ts`                                                               | Create | ~12 tests (TC-5)                                                                                    |
| `src/lib/server/auth.test.ts`                                                         | Extend | 1 existing + ~15 new (TC-6)                                                                         |
| `src/lib/server/validators.db.test.ts`                                                | Create | ~6 tests (TC-7)                                                                                     |
| `src/routes/equipos/+page.server.test.ts`                                             | Create | ~9 tests (TC-8)                                                                                     |
| `src/routes/usuarios/+page.server.test.ts`                                            | Create | ~8 tests (TC-9)                                                                                     |
| `src/routes/tickets/+page.server.test.ts`                                             | Create | ~7 tests (TC-10)                                                                                    |

No production files modified.

## Testing Strategy

| Layer       | What to Test                                                                                       | Approach                                            |
| ----------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Unit        | State machines, pure validators, utils                                                             | Direct calls, boundary cases                        |
| Integration | Auth (rate limit, sessions, sliding window, login, cookies, guards), DB validators, 3 CRUD actions | In-memory DB + direct action invocation             |
| Reliability | Fresh DB per file, deterministic time, sequential numbering                                        | Module isolation, explicit timestamps, serial tests |

## Migration / Rollout

No data migration, no feature flags, no production refactors. Tests are additive; rollback = `git revert <sha>`.

## Open Questions

- None — all spec scenarios map to concrete test cases. One spec-vs-code conflict resolved in the design (see `components/route-test-harness.md`, TC-10 note).
