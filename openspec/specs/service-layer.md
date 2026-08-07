# Service Layer — Specification

## Purpose

Extract CRUD business logic from the four route form actions (`tickets`, `equipos`, `usuarios`, `mantenimiento`) into typed services under `src/lib/server/services/`, leaving routes as thin adapters (FormData → service → fail/success). Pure structural refactor: no user-visible behavior, schema, or feature change; the 139 existing tests pass unmodified. All requirements here are ADDED — no existing behavior changes.

## Requirements

### SC-1: Service Directory & Types

`src/lib/server/services/` MUST exist with `types.ts` exporting `ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number }` and `Actor = { id: string; rol: UserRole }` (role union from `$lib/server/db/schema`).

#### Scenario: Discriminated result

- GIVEN a service call succeeds
- WHEN it returns a result
- THEN `ok` MUST be `true` with typed `data`; a failure MUST return `ok: false`, an `error` string, and optional `status`

#### Scenario: Actor typing

- GIVEN a service function accepting an `Actor`
- WHEN it receives `{ id, rol }`
- THEN `rol` MUST be a valid `UserRole` at compile time

### SC-2: Tickets Service

`services/tickets.ts` MUST export `createTicket`, `updateTicket`, `deleteTicket`, `addComment`, and `generateTicketNumber` with typed inputs, calling the existing validators and state machines. Behavior MUST be preserved: numbering `TKT-YYYYMMDD-NNN` (sequential per day), decommissioned equipment rejected, transition guards, delete creator-or-admin.

#### Scenario: Sequential numbering

- GIVEN two tickets created the same day
- WHEN `generateTicketNumber` runs per create
- THEN numbers MUST be `TKT-YYYYMMDD-001` and `TKT-YYYYMMDD-002`

#### Scenario: Decommissioned equipment rejected

- GIVEN a ticket referencing a `dado_de_baja` equipment
- WHEN `createTicket` runs
- THEN it MUST return `{ ok: false }` with the decommissioned-equipment error

### SC-3: Equipos Service

`services/equipos.ts` MUST export `createEquipo`, `updateEquipo`, `deleteEquipo`; MUST preserve state-transition and role guards, record `equipment_status_history` on state change, and run referential delete checks (tickets, then PM plans).

#### Scenario: Status history on transition

- GIVEN an equipment moved `operativo` → `en_reparacion` by an actor
- WHEN `updateEquipo` runs
- THEN one `equipment_status_history` row MUST record previous/new state and actor

#### Scenario: Referential delete guards

- GIVEN an equipment referenced by a ticket and one by a PM plan
- WHEN `deleteEquipo` runs on each
- THEN both MUST fail with the respective reference error; an unreferenced equipment MUST delete

### SC-4: Usuarios Service

`services/usuarios.ts` MUST export `createUser`, `updateUser`, `deleteUser`; MUST preserve aggregated validation (errors joined), duplicate checks with `excludeUserId`, last-active-admin protection, self-delete guard, and referential checks (tickets, PM executions).

#### Scenario: Duplicate with exclusion

- GIVEN a user owning an email
- WHEN `updateUser` assigns that email to the owner
- THEN it MUST succeed; assigning it to a different user MUST fail 400

#### Scenario: Last admin and self-delete

- GIVEN a single active admin
- WHEN deactivating, role-changing, or deleting that admin
- THEN each MUST fail 400 with the last-admin error; deleting one's own account MUST fail 400 with the self-delete error

### SC-5: Mantenimiento Service

`services/mantenimiento.ts` MUST export `createPlan`, `updatePlan`, `deletePlan`, `addTask`, `updateTask`, `deleteTask`, `scheduleExecution`, `completeExecution`; MUST preserve the consultor 403 guard, existence checks, delete guards (plan/task with executions), `max-orden` task numbering, bulk execution scheduling, and the completion guard (`pendiente` only).

#### Scenario: Bulk scheduling

- GIVEN a plan with N tasks
- WHEN `scheduleExecution` runs
- THEN N `pm_executions` rows MUST be created as `pendiente`; a plan without tasks MUST fail 400

#### Scenario: Completion guard

- GIVEN an execution already processed
- WHEN `completeExecution` runs on it
- THEN it MUST fail 400 with the already-processed error

### SC-6: Route Adapters

The four `+page.server.ts` files MUST become thin adapters: parse FormData, call the service, map `ServiceResult` to `fail(status, { error, _action })` or `{ success: true, _action }`. `requireAuth`/`requireRole` redirects, cookies, and `load` functions MUST stay in routes.

#### Scenario: Adapter maps service failure

- GIVEN a service returning `{ ok: false, error, status: 400 }`
- WHEN the adapter maps it
- THEN it MUST `fail(400, { error, _action })`

#### Scenario: Adapter maps success

- GIVEN a service returning `{ ok: true, data }`
- WHEN the adapter maps it
- THEN it MUST return `{ success: true, _action }`

### SC-7: Contract Preservation

The exact `fail()` statuses, literal error strings, and `_action` values MUST be preserved. Traps: tickets AND equipos consultor 403 guards use literal `_action: ''`; `canTransition` 403s use the real `_action`; usuarios has no fail-403 (`requireRole` throws 303); equipos update/delete and tickets delete → 400, tickets update/add_comment → 404; mantenimiento 403s use 8 literal per-action `_action`s.

#### Scenario: Existing suite passes unchanged

- GIVEN the 139 existing tests (three `crud.test.ts` + unit files)
- WHEN the refactor lands and `npm run test` runs
- THEN all 139 MUST pass with zero test-file edits

#### Scenario: Literal 403 traps

- GIVEN a `consultor` submitting to tickets or equipos
- WHEN the guard returns 403
- THEN `_action` MUST be `''`; a `canTransition` denial MUST carry the real `_action`

### SC-8: Service Tests

Direct tests `services/{tickets,equipos,usuarios,mantenimiento}.test.ts` MUST exist using the existing `initTestDb()` in-memory pattern, covering the extracted logic per service. New coverage MUST keep aggregate statement coverage ≥ 70% (same thresholds as `test-coverage`).

#### Scenario: Direct service test

- GIVEN an `initTestDb()`-seeded DB
- WHEN a service test exercises a happy path
- THEN the returned `ServiceResult` MUST match the expected `ok`/`data` shape

#### Scenario: Coverage maintained

- GIVEN extraction commits land with their tests
- WHEN `npm run test:coverage` runs at any commit
- THEN statements coverage on `src/lib/server/**` MUST stay ≥ 70%

### SC-9: No Behavioral Change

The change MUST be a structural refactor only: no user-visible behavior, schema, or feature change. Preserved behavior IS the acceptance criterion.

#### Scenario: Zero functional delta

- GIVEN the same flows exercised pre- and post-refactor
- WHEN create/update/delete/comment/schedule operations run
- THEN rows, statuses, error strings, and `_action` echoes MUST be identical

#### Scenario: No schema change

- GIVEN the refactor diff
- WHEN it is inspected
- THEN no schema.ts, migration, or seed change MUST be present

## Out of Scope

Services for `proveedores`/`tipos`/`config`/`sessions` (phase 2), read-only `reportes`/dashboard query services (phase 3), and the `auth.ts` refactor. UI components, `load` functions, and Svelte rendering.
