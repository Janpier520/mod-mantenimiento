# Design: Service Layer for CRUD Business Logic

## Technical Approach

Extract the business logic of the four CRUD form actions into typed services under `src/lib/server/services/`, leaving each `+page.server.ts` as a thin adapter: parse FormData → call service → map `ServiceResult` to `fail(status, { error, _action })` or `{ success: true, _action }`. Pure structural refactor — **zero behavior change**; the 139 existing tests pass unmodified (contract SC-7, SC-9). Extraction is verbatim: error strings, status codes, `_action` echoes, validation order, and DB write order are copied line-for-line into services.

```
Route action (thin adapter)                    Service (business logic)
┌─────────────────────────────────┐            ┌────────────────────────────────┐
│ requireAuth/requireRole throws  │            │ validate → guard → db writes   │
│ consultor guard (tickets/equipos│            │ → ServiceResult<T>             │
│  literal _action:'')            │            │   ok:true data | ok:false      │
│ FormData parse + _action switch │ ──input──▶ │   error + status(400/403/404)  │
│ fail()/success mapping          │ ◀─result── │                               │
└─────────────────────────────────┘            └────────────────────────────────┘
```

Per-route component docs (exhaustive signatures + mapping tables): `services-tickets.md`, `services-equipos.md`, `services-usuarios.md`, `services-mantenimiento.md`.

## Architecture Decisions

### Decision: UserRole source — spec discrepancy resolved
**Choice**: `types.ts` imports `UserRole` from `$lib/server/state-machines`.
**Rationale**: SC-1 says "role union from `$lib/server/db/schema`", but `schema.ts` does NOT export `UserRole`. The canonical exported union is `state-machines.ts` (`VALID_USER_ROLES` → `export type UserRole`), already used by `auth.ts` casts and identical to the inline `users.rol` enum. `state-machines.ts` imports nothing → no import cycle (`types.ts → state-machines → ∅`).
**Alternatives**: re-export from schema (requires editing schema.ts — violates SC-9 "no schema change"); inline the union (duplication).
**Traps**: do NOT add a `UserRole` export to schema.ts.

### Decision: Consultor guard placement — where the `_action: ''` trap lives
**Choice**: tickets/equipos consultor guards stay in the ADAPTER; mantenimiento consultor guard lives in the SERVICE.
- tickets/equipos (SC-2/SC-3 do NOT list the consultor guard as service behavior): adapter keeps `if (locals.user.rol === 'consultor') return fail(403, { error: 'Los consultores no pueden modificar …', _action: '' });` at the top of `crud`, before formData parse. Services never see a consultor and can return 403 only for `canTransition`/creator-or-admin, which the adapter maps with the REAL form `_action`. This preserves the literal `_action: ''` trap with zero ambiguity.
- mantenimiento (SC-5 explicitly requires the guard in the service): each of the 8 service functions starts with `if (actor.rol === 'consultor') return consultorError;` (module-private `const consultorError: ServiceResult<never>`), and the adapter maps any 403 with its literal per-action `_action`.
- usuarios: no fail-403 exists (`requireRole(locals, 'admin')` throws 303 before the adapter parses anything) — stays in route, service never returns 403.
**Rationale**: putting the tickets/equipos guard in the service would force the adapter to distinguish consultor-403 from transition-403 by error-string matching to pick `''` vs real `_action` — fragile. Adapter-side guard is the only mechanical way to honor the literal trap.

### Decision: `_action` is an adapter concern, never a service input
**Choice**: services receive typed inputs (no `_action` field, no FormData). The `_action` switch and the `'Acción no válida'` fallthrough stay in the adapter.
**Rationale**: `_action` is transport/protocol detail. Mantenimiento never reads `_action` from the form at all (8 named action functions, literal `_action` in every fail/success) — services must not model it.

### Decision: Dead branch removal (usuarios delete self-guard)
**Choice**: `deleteUser` self-guard is `if (actor.id === id) return { ok: false, error: 'No podés eliminar tu propio usuario', status: 400 };` — the `!locals.user ||` prefix is dropped.
**Rationale**: `requireRole` (which calls `requireAuth`) throws 303 if `locals.user` is null, so the branch is unreachable post-guard. `Actor` is non-nullable by construction. Behavior identical.

### Decision: Service success payloads are minimal and behavior-neutral
**Choice**: mutating services return `ServiceResult<{ id: string }>` (createTicket adds `numero_ticket`; addTask adds `orden`; scheduleExecution adds `scheduled: number`). `createTicket` and `scheduleExecution` use `.returning()` to obtain ids — row creation is identical, no behavioral delta.
**Rationale**: the adapter discards `data` (always returns `{ success: true, _action }`), but typed payloads let direct service tests assert DB-agnostic results.

### Decision: No vitest.config.ts change
**Choice**: leave `vitest.config.ts` untouched. Coverage `include` already has `src/lib/server/**`, which now covers `services/*.ts` and `services/*.test.ts`. (Note: `src/routes/mantenimiento/+page.server.ts` is NOT in the coverage include today; extraction moves its logic under `src/lib/server/**`, so it becomes covered without config edits.)
**Alternatives**: explicit `'src/lib/server/services/**'` glob — redundant.

### Decision: Validation order preserved inside services
**Choice**: `updateEquipo` runs field validation (modelo/marca/tipo/estado) BEFORE the id/existence checks, matching the current `create || update` shared block ordering. `completeExecution` checks `pendiente` BEFORE the result-enum check (current order: existence → already-processed → enum). All DB write orders copied verbatim.
**Rationale**: error precedence is part of the observable contract (a request violating two rules must still fail with the FIRST error the old handler returned).

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/server/services/types.ts` | Create | `ServiceResult<T>` + `Actor` |
| `src/lib/server/services/tickets.ts` | Create | ticket service + `generateTicketNumber` |
| `src/lib/server/services/equipos.ts` | Create | equipment service |
| `src/lib/server/services/usuarios.ts` | Create | user service (imports `hashPassword` from auth) |
| `src/lib/server/services/mantenimiento.ts` | Create | PM plan/task/execution service (8 ops) |
| `src/lib/server/services/tickets.test.ts` | Create | direct ticket service tests |
| `src/lib/server/services/equipos.test.ts` | Create | direct equipment service tests |
| `src/lib/server/services/usuarios.test.ts` | Create | direct user service tests |
| `src/lib/server/services/mantenimiento.test.ts` | Create | direct PM service tests |
| `src/routes/tickets/+page.server.ts` | Modify | thin adapter (crud switch → service calls) |
| `src/routes/equipos/+page.server.ts` | Modify | thin adapter (crud switch → service calls) |
| `src/routes/usuarios/+page.server.ts` | Modify | thin adapter (crud switch → service calls) |
| `src/routes/mantenimiento/+page.server.ts` | Modify | thin adapter (8 named actions → service calls) |
| `vitest.config.ts` | — | NO change required (see Decision above) |
| `schema.ts` / seed / migrations | — | MUST NOT change (SC-9) |

## Interfaces / Contracts

### types.ts (exact)

```ts
import type { UserRole } from '$lib/server/state-machines';

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export type Actor = { id: string; rol: UserRole };
```

`status` semantics: 400 validation/conflict, 403 authz (only tickets `canTransition`/creator-or-admin and mantenimiento consultor), 404 not-found. `status` omitted ⇒ adapter defaults to 400.

### Adapter mapping contract (SC-7 — THE critical contract)

Adapter failure mapping is uniform per route: `if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action });` where `_action` is the real form value (tickets/equipos/usuarios crud) or the literal per-action value (mantenimiento). Success: `return { success: true, _action };`.

**Status-code asymmetries (must be byte-preserved):**

| Route · action | Case | Status |
|---|---|---|
| tickets · update | missing id / title / priority / state / transition / tech / equipo | 400 |
| tickets · update | ticket not found | **404** |
| tickets · delete | ticket not found | **400** (not 404) |
| tickets · delete | not creator and not admin | 403 |
| tickets · add_comment | not found | **404** |
| tickets · add_comment | missing ticket_id / empty content | 400 |
| equipos · update | equipo not found | **400** (not 404) |
| equipos · update | invalid transition | 400 |
| equipos · update | role denied (`canTransition`) | 403 (real `_action`) |
| equipos · delete | id missing / tickets ref / PM ref | 400 |
| usuarios · all | non-admin actor | **no fail — `requireRole` throws 303 → `/`** |
| usuarios · update | user not found | 404 |
| usuarios · delete | user not found | 404 |
| usuarios · all other fails | 400 |
| mantenimiento · all 8 | consultor | 403 with **literal per-action `_action`** |
| mantenimiento · update/delete plan, add/update/delete task, schedule, complete | entity not found | 404 |
| mantenimiento · all other fails | 400 |

**Literal `_action: ''` traps (verbatim strings):**
- tickets: `'Los consultores no pueden modificar tickets'` with `_action: ''`
- equipos: `'Los consultores no pueden modificar equipos'` with `_action: ''`

**All 139 existing tests must pass UNCHANGED** — `crud.test.ts` files (tickets 17, equipos 14, usuarios 14) exercise the adapter contract; `auth` 26, `state-machines` 30, `validators` 19, `validators.db` 9 cover the rest.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Existing route tests | Adapter contract (statuses, `_action`, error strings, `success` shape) | 139 tests untouched, run after EVERY commit |
| New service tests (same commit as each extraction) | Extracted logic per service | `initTestDb()` in-memory pattern (`src/lib/server/db/test-helpers.ts`), `beforeAll`, no `it.concurrent` in tickets file (sequential numbering) |

New direct tests per service — see component docs for full lists. Summary of targeted coverage:

| Service test file | Targets |
|---|---|
| `services/tickets.test.ts` | `generateTicketNumber` sequencing 001→002 same day; decommissioned equipment rejection; transition 400 + `canTransition` 403; delete creator-or-admin + 400-not-found asymmetry; add_comment 404/400 |
| `services/equipos.test.ts` | status-history row (previous/new/actor, exactly 1); transition 400; role 403 (tecnico→`dado_de_baja`); delete refs (tickets then PM); unreferenced delete |
| `services/usuarios.test.ts` | aggregated errors joined `. `; duplicate username/email; `excludeUserId` own-email success + other-email 400; last-admin (deactivate/role-change/delete); self-delete; ticket/PM ref guards |
| `services/mantenimiento.test.ts` | all 8 ops: plan CRUD + execution-ref delete guard; `max-orden` numbering; task CRUD + ref guard; bulk scheduling (N tasks → N `pendiente` rows; empty plan 400); completion guard (`pendiente` only, already-processed 400, invalid result 400); consultor 403 per op |

Coverage: aggregate statements on `src/lib/server/**` must stay ≥ 70% at EVERY commit (service tests land in the same commit as their extraction — proposal Risk #2).

## Work-Unit Commits (delivery strategy: `exception-ok`)

Order is deliberate — safest contracts first, riskiest last:

| # | Commit (conventional) | Content | Why this order |
|---|----------------------|---------|----------------|
| 1 | `refactor(server): extract tickets service + adapter + tests` | `services/tickets.ts` + `+page.server.ts` + `services/tickets.test.ts` | 17-test contract to preserve; numbering + guards covered by route tests already |
| 2 | `refactor(server): extract equipos service + adapter + tests` | `services/equipos.ts` + adapter + `services/equipos.test.ts` | 14-test contract; status-history logic now direct-tested |
| 3 | `refactor(server): extract usuarios service + adapter + tests` | `services/usuarios.ts` + adapter + `services/usuarios.test.ts` | 14-test contract; last-admin/self-delete direct-tested |
| 4 | `refactor(server): extract mantenimiento service + adapter + tests` | `services/mantenimiento.ts` + adapter + `services/mantenimiento.test.ts` | NO existing route tests — highest risk; new tests are its safety net |

Each commit MUST: bundle service + adapter + service tests, and pass the full gate before the next. Revert per commit via `git revert` (proposal Rollback Plan). Forecast for sdd-tasks: whole change ≈ 1,600+ added/changed lines across 4 work units (≈400/unit) — exceeds a single 400-line PR, but `exception-ok` is already declared (local commits on `main`, user controls push; no chained PRs this session).
Guard lines: `Decision needed before apply: No`, `Chained PRs recommended: No`, `400-line budget risk: Medium` (per-unit ≈400; whole change High if ever one PR).

## Dependency Rules

```
services/* → validators.ts | state-machines.ts | auth.ts (hashPassword ONLY) | db/
types.ts   → state-machines.ts (type-only)
```
- NO service→service imports (tickets must not import equipos, etc.).
- usuarios service imports `hashPassword` from `auth.ts` — the ONLY auth import allowed in services.
- `requireAuth`/`requireRole`/`login`/cookies stay out of services (redirects are route concerns).
- No circular-import risk: `state-machines` imports nothing; `validators` imports `db` + `schema`; `auth` imports `db` + `schema`; services import only leaves.

## What Stays in Routes (unchanged)

- `load` functions (all listing queries + filter/search/pagination)
- `requireAuth` (tickets, mantenimiento per action), inline `throw redirect(303,'/login')` (equipos — keep verbatim, do NOT convert to `requireAuth`), `requireRole(locals, 'admin')` (usuarios)
- tickets/equipos consultor 403 guards (literal `_action: ''`)
- FormData parsing, `_action` switch (crud) / 8 named actions (mantenimiento), `'Acción no válida'` fallthrough
- `fail(status, { error, _action })` / `{ success: true, _action }` mapping
- cookies (none in these routes, but principle: never in services)

## Migration / Rollout

No migration required — no schema, seed, or DB changes (SC-9). Rollout = 4 sequential local commits; `git revert` per commit if needed.

## Open Questions

- None blocking. One flagged discrepancy (UserRole location) is resolved above; `VALID_PM_RESULTS` import in `mantenimiento/+page.server.ts` becomes unused after extraction — drop the import in the adapter (eslint would flag it).
