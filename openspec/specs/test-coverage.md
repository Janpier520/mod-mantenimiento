# Test Coverage — Specification

## Purpose

Build a two-tier automated suite over server logic and the three core CRUD handlers (equipos, usuarios, tickets) plus the Vitest infrastructure to make coverage measurable. Tier 1 is pure unit tests (state machines, validators, utils); Tier 2 is integration tests against a fresh in-memory SQLite DB per file with no mocks.

## Requirements

### TC-1: Vitest Infrastructure & Coverage

The test runner config `vitest.config.ts` MUST resolve `$lib` → `src/lib` and `$app` → `$app` (virtual module) aliases so route handlers and server modules are importable from test files. The include pattern MUST remain `src/**/*.test.ts`. Coverage MUST use provider `v8` (`@vitest/coverage-v8` devDependency) with statement thresholds between 65% and 70% applied to server logic (`src/lib/server/**`), `src/lib/utils.ts`, and the three target route handlers.

#### Scenario: Aliases resolve in tests

- GIVEN a test file imports a route handler via `$lib/server/db`
- WHEN `npm run test` executes
- THEN the import MUST resolve without the SvelteKit plugin

#### Scenario: Coverage is measurable and enforced

- GIVEN coverage is enabled (coverage script)
- WHEN the suite runs
- THEN a v8 report MUST be produced
- AND the run MUST fail if statements coverage on the configured globs falls below the threshold

### TC-2: Test DB Helper

`src/lib/server/db/test-helpers.ts` MUST set `process.env.DATABASE_URL = 'file::memory:'` BEFORE any import of a module that pulls `$lib/server/db` (the client is created eagerly at module load). It MUST create the schema programmatically via `pushSQLiteSchema` from `drizzle-kit/api`, and MUST document the fallback (temp migrations via `generateMigration` + `migrate`) for environments where `pushSQLiteSchema` is unavailable. It MUST expose a minimal seed: admin + tecnico users, equipment types, and a few equipos covering all four equipment states; the bcrypt password hash MUST be computed once (e.g. in `beforeAll`), never per test.

#### Scenario: Fresh in-memory DB per file

- GIVEN a test file calls the helper
- WHEN tables are pushed and the seed runs
- THEN all tables exist, seed users/equipos/types are queryable, and the DB is isolated per file

#### Scenario: Schema fallback path

- GIVEN `pushSQLiteSchema` is unavailable at runtime
- WHEN the helper uses the documented fallback
- THEN the schema MUST still be created via generated migrations

### TC-3: State Machine Coverage

`src/lib/server/state-machines.test.ts` MUST cover `isValidTransition`, `getValidTransitions`, and `canTransition` for both machines. It MUST assert all valid and invalid transitions, role guards (equipment `dado_de_baja` admin-only; ticket per-`to`-state role map), unknown-state safety, the `dado_de_baja` sink (no outgoing transitions), and ticket reopen (`cerrado` → `abierto`).

#### Scenario: Happy path transitions

- GIVEN an equipment in `operativo`
- WHEN `isValidTransition('operativo', 'en_reparacion', 'equipment')`
- THEN it MUST return `true` and `getValidTransitions` MUST include `en_reparacion`

#### Scenario: Sink and unknown states

- GIVEN an equipment in `dado_de_baja`
- WHEN querying transitions
- THEN `getValidTransitions` MUST return `[]` and `isValidTransition` MUST return `false` for any target
- WHEN `isValidTransition('inexistente', 'operativo', 'equipment')`
- THEN it MUST return `false` without throwing

#### Scenario: Role guards

- GIVEN a `tecnico` user
- WHEN `canTransition('operativo', 'dado_de_baja', 'tecnico', 'equipment')`
- THEN `allowed` MUST be `false` with the admin-only error
- AND the same call with role `admin` MUST return `allowed: true`

### TC-4: Validator Coverage (pure)

`src/lib/server/validators.test.ts` MUST cover `validateEmail`, `validateUsername`, `validatePasswordStrength`, `validateRequired`, and `escapeLike` with boundary and edge cases.

#### Scenario: Email and username boundaries

- GIVEN valid and invalid emails
- WHEN `validateEmail` runs
- THEN well-formed emails MUST return `null` and malformed ones MUST return the format error
- AND `validateUsername` MUST accept 3–50 chars of `[a-zA-Z0-9_.-]` and reject empty, too-short, too-long, and charset-violating inputs

#### Scenario: Password strength boundaries

- GIVEN passwords of length 5, 6, 128, and 129
- WHEN `validatePasswordStrength` runs
- THEN length <6 and >128 MUST return errors, 6 and 128 MUST return `null`, and empty MUST return the required error

#### Scenario: escapeLike edge cases

- GIVEN strings with `%`, `_`, both, or neither
- WHEN `escapeLike` runs
- THEN `%` → `\%`, `_` → `\_`, plain text MUST be unchanged, and an empty string MUST return `''`

### TC-5: Utils Coverage

`src/lib/utils.test.ts` MUST cover `cn`, `formatDate`, `formatDateShort`, `capitalize`, `hasAccess`, and `statusLabel`. For es-AR locale, assertions MUST be loose — assert date parts (day/month/year presence), not exact locale strings (Node ICU variance).

#### Scenario: cn and capitalize

- GIVEN conflicting Tailwind classes (`'px-2'`, `'px-4'`)
- WHEN `cn` merges them
- THEN the result MUST contain only the last class
- AND `capitalize('hola')` MUST return `'Hola'` and `capitalize('')` MUST return `''`

#### Scenario: Date formatting

- GIVEN a valid ISO date and `null`
- WHEN `formatDate` and `formatDateShort` run
- THEN a valid date MUST render containing the year and month name (es-AR), and `null`/`undefined` MUST render `'—'`

#### Scenario: Access and labels

- GIVEN roles and allowed-role lists
- WHEN `hasAccess` runs
- THEN empty/undefined allowed roles MUST grant access, an undefined role MUST deny when roles are required, and non-matching roles MUST deny
- AND `statusLabel` MUST return the known label for `en_reparacion`/`critica` and the capitalized input for unknown states

### TC-6: Auth Coverage (integration)

The existing `src/lib/server/auth.test.ts` MUST be extended to cover rate limiting, session lifecycle, sliding window, login flows, cookie helpers, and guards. Rate limiting: the 5th failed attempt within the 15-min window MUST block with `retryAfterMs` > 0; attempts older than the window MUST NOT count; reset attempts (namespaced `reset:` prefix) MUST NOT affect the login counter. Sessions: create returns a token, validate resolves the user, delete invalidates. Sliding window: a session older than half its TTL (13h of 24h) MUST be extended; one at 6h MUST be untouched. Login: wrong user, disabled account, and wrong password MUST each return `success: false` with the correct error. Cookie helpers MUST set/read/clear the `equip-lab-session` cookie on a mock `Cookies`. `requireAuth`/`requireRole` MUST throw SvelteKit `redirect` (303 → `/login`, `/`).

#### Scenario: Login lockout

- GIVEN 4 failed attempts for a username within 15 minutes
- WHEN a 5th attempt is checked via `checkLoginRateLimit`
- THEN `allowed` MUST be `false` with a positive `retryAfterMs`
- AND an attempt recorded 20 minutes ago MUST NOT count toward the lockout

#### Scenario: Namespace isolation

- GIVEN 3 failed reset attempts for a username
- WHEN `checkLoginRateLimit` runs for the same username
- THEN it MUST still report `allowed: true`

#### Scenario: Sliding window

- GIVEN a session created 13h ago (of a 24h TTL)
- WHEN `validateSession` runs
- THEN `expires_at` MUST be extended by 24h from now
- AND a session created 6h ago MUST keep its `expires_at` unchanged

#### Scenario: Guards

- GIVEN unauthenticated locals
- WHEN `requireAuth` runs
- THEN it MUST throw a 303 redirect to `/login`
- AND `requireRole(locals, 'admin')` with a `tecnico` user MUST throw a 303 redirect to `/`

### TC-7: DB Validator Coverage

`src/lib/server/validators.db.test.ts` MUST cover the DB-backed validators exported from `src/lib/server/validators.ts`: `isLastActiveAdmin`, `isUsernameTaken`, `isEmailTaken`, `isEquipmentTypeNameTaken`, and `userExists`, including `excludeUserId` semantics.

#### Scenario: Last active admin

- GIVEN exactly one active admin
- WHEN `isLastActiveAdmin(thatAdminId)` runs
- THEN it MUST return `true`
- AND with a second active admin seeded, it MUST return `false`
- AND a non-admin or inactive admin MUST return `false`

#### Scenario: Duplicate checks with exclusion

- GIVEN a user owning username/email X
- WHEN `isUsernameTaken(X)` / `isEmailTaken(X)` run
- THEN both MUST return `true`, and with `excludeUserId` set to the owner's id both MUST return `false`

### TC-8: Route Coverage — equipos

`src/routes/equipos/+page.server.test.ts` MUST cover the `crud` action: create/update/delete success paths, create validation failures (missing `modelo`), invalid state transitions rejected (400), decommission (`dado_de_baja`) blocked for non-admin (403), status history rows recorded on state change, and delete blocked when tickets or PM plans reference the equipment.

#### Scenario: Create and update with transition

- GIVEN a seeded admin session and valid form data
- WHEN `_action = 'create'`
- THEN a new equipment row MUST exist
- WHEN `_action = 'update'` moves it `operativo` → `en_reparacion`
- THEN the row MUST update AND one `equipment_status_history` row MUST record the change

#### Scenario: Invalid transition and role guard

- GIVEN an equipment in `dado_de_baja`
- WHEN updating to `operativo`
- THEN the action MUST fail 400 with the transition error
- WHEN a `tecnico` updates an `operativo` equipment to `dado_de_baja`
- THEN the action MUST fail 403

#### Scenario: Referential delete guards

- GIVEN an equipment referenced by a ticket and another referenced by a PM plan
- WHEN `_action = 'delete'`
- THEN both MUST fail 400 with the respective reference error
- AND an unreferenced equipment MUST delete successfully

### TC-9: Route Coverage — usuarios

`src/routes/usuarios/+page.server.test.ts` MUST cover validation aggregation (multiple errors joined in one message), duplicate username/email rejection, email duplicate with `excludeUserId` on update, last-active-admin protection on deactivate/role change/delete, self-delete protection, and referential guards (tickets, PM executions).

#### Scenario: Validation aggregation and duplicates

- GIVEN a create form with empty username, empty email, and short password
- WHEN the action runs
- THEN it MUST fail 400 with all errors joined
- GIVEN an existing username/email
- WHEN creating a second user with them
- THEN it MUST fail 400 with the duplicate error
- AND updating a user to another user's email MUST fail 400, while keeping one's own email MUST succeed

#### Scenario: Last admin and self-delete

- GIVEN a single active admin
- WHEN deactivating, changing the role of, or deleting that admin
- THEN each MUST fail 400 with the last-admin error
- WHEN a user attempts to delete their own account
- THEN it MUST fail 400 with the self-delete error

#### Scenario: Referential guards

- GIVEN a user referenced by tickets and one referenced by PM executions
- WHEN deleting them
- THEN the action MUST fail 400 with the ticket/PM count error
- AND an unreferenced user MUST delete successfully

### TC-10: Route Coverage — tickets

`src/routes/tickets/+page.server.test.ts` MUST cover create validations (missing title, decommissioned equipment rejected), sequential `generateTicketNumber` (`TKT-YYYYMMDD-NNN`), transition guards (invalid 400, role 403), delete creator-or-admin, and `add_comment`.

#### Scenario: Create validations and numbering

- GIVEN a create form with an empty title
- WHEN the action runs
- THEN it MUST fail 400
- GIVEN a create form referencing a `dado_de_baja` equipment
- THEN it MUST fail 400 with the decommissioned error
- WHEN two tickets are created in the same day
- THEN their numbers MUST be `TKT-YYYYMMDD-001` and `TKT-YYYYMMDD-002`

#### Scenario: Transition and delete guards

- GIVEN a ticket in `abierto`
- WHEN updating to `resuelto`
- THEN it MUST fail 400 (invalid transition)
- WHEN a `consultor` creates the ticket and a `tecnico` deletes it
- THEN the delete MUST fail 403 (not creator, not admin)
- AND the creator or an admin MUST delete successfully

#### Scenario: add_comment

- GIVEN a valid ticket
- WHEN `_action = 'add_comment'` with non-empty content
- THEN a comment row MUST be created
- AND empty content MUST fail 400, and a missing ticket MUST fail 404

### TC-11: Test Reliability Rules

The suite MUST follow: no `it.concurrent` in tickets tests (shared in-memory DB per file); bcrypt hashing only once in `beforeAll`; no real sleeps — time-dependent assertions MUST use explicit `created_at`/`expires_at` timestamps; and a fresh in-memory DB per file via Vitest module isolation.

#### Scenario: Deterministic time

- GIVEN a rate-limit or sliding-window test
- WHEN assertions need a specific age
- THEN the test MUST insert rows with explicit timestamps instead of waiting

#### Scenario: Isolation without concurrency

- GIVEN two test files sharing imports of `$lib/server/db`
- WHEN both run in the same Vitest run
- THEN each MUST see only its own seeded data

## Out of Scope

Component/Svelte rendering, `reportes`/`sessions` routes, load functions, `animations.ts`, E2E/Playwright, and CI/CD wiring are NOT covered by this spec.
