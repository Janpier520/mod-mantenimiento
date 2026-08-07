# Tasks: Service Layer for CRUD Business Logic

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,600 total (≈400/unit) |
| 400-line budget risk | Medium per unit (High if consolidated) |
| Chained PRs recommended | No |
| Suggested split | 4 sequential commits on `main` |
| Delivery strategy | exception-ok |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Work Units

| Unit | Goal | Commit |
|------|------|--------|
| 1 | tickets svc + adapter + tests | `refactor(server): extract tickets service layer.` |
| 2 | equipos svc + adapter + tests | `refactor(server): extract equipos service layer.` |
| 3 | usuarios svc + adapter + tests | `refactor(server): extract usuarios service layer.` |
| 4 | mantenimiento svc + adapter + tests | `refactor(server): extract mantenimiento service layer.` |

Each unit = svc+adapter+tests in ONE commit (≥70%). Gate + revert per commit.

## Phase 1: Infrastructure

- [x] 1.1 Create `services/types.ts`: `ServiceResult<T>` + `Actor { id, rol }` (`UserRole` from state-machines, not schema — SC-1). Type-only.

## Phase 2: Work Unit 1 — Tickets

- [x] 2.1 Create `services/tickets.ts` (verbatim, route 110–282): `generateTicketNumber` (`TKT-YYYYMMDD-NNN`), create (title→priority→equipo→insert; decommissioned 400), update (404), delete (400 asymmetry; creator-or-admin 403), add_comment (404/400).
- [x] 2.2 Rewrite `routes/tickets/+page.server.ts`: keep `requireAuth` + consultor guard (`_action: ''`), crud switch, uniform fail/success mapping.
- [x] 2.3 Create `services/tickets.test.ts` — `initTestDb()`, no `it.concurrent`: numbering 001→002, decommissioned 400, transition 400 / canTransition 403, delete 404→400, creator-or-admin, add_comment 404/400, title-empty guard order.
- [x] 2.4 Gate: 139 pass unchanged → commit.

## Phase 3: Work Unit 2 — Equipos

- [x] 3.1 Create `services/equipos.ts`: `validateEquipoInputs` FIRST; update (id 400 → existence 400 → transition 400 → canTransition 403 → history row); delete (tickets ref 400 → PM ref 400 → delete).
- [x] 3.2 Rewrite `routes/equipos/+page.server.ts`: keep inline `redirect(303,'/login')` + consultor guard (`_action: ''`), parse 9 fields, crud switch.
- [x] 3.3 Create `services/equipos.test.ts`: history EXACTLY 1 row (prev/new/actor), transition 400, role 403 no-history, not-found 400, delete refs ×2, unreferenced delete, same-state no history.
- [x] 3.4 Gate: 139 tests pass → commit.

## Phase 4: Work Unit 3 — Usuarios

- [x] 4.1 Create `services/usuarios.ts`: aggregated `errors.join('. ')`, dup checks, last-admin guard, self-guard `actor.id === id` (drop `!locals.user` prefix), ticket/PM ref counts, `hashPassword` from auth.
- [x] 4.2 Rewrite `routes/usuarios/+page.server.ts`: keep `requireRole(locals,'admin')` (303), crud switch, no 403 paths.
- [x] 4.3 Create `services/usuarios.test.ts`: joined errors, dup username/email, `excludeUserId` own-email ok + other 400, last-admin ×3, self-delete, ticket/PM refs, bcrypt verify.
- [x] 4.4 Gate: 139 tests pass → commit.

## Phase 5: Work Unit 4 — Mantenimiento

- [x] 5.1 Create `services/mantenimiento.ts` — 8 ops verbatim (56–406): `CONSULTOR_ERROR` (403) FIRST per fn; `COALESCE(MAX(orden),0)`; bulk schedule `.returning()` → `scheduled`; pendiente-check before result-enum; no `VALID_PM_RESULTS`.
- [x] 5.2 Rewrite `routes/mantenimiento/+page.server.ts`: 8 named actions, literal per-action `_action`; drop unused `VALID_PM_RESULTS` import.
- [x] 5.3 Create `services/mantenimiento.test.ts`: consultor 403 ×8, plan CRUD + execution-ref guard, task CRUD + per-plan orden, bulk schedule (N→N `pendiente`; empty 400), completion guard (`pendiente` ok, processed 400, invalid 400).
- [x] 5.4 Gate: 139 tests pass → commit.

## Phase 6: Final Verification

- [x] 6.1 Full gate: format → check → test (139 + new) → coverage ≥ 70%.
- [x] 6.2 Contract diff vs `design/architecture.md`: statuses, verbatim strings, `_action` literals; no schema/seed changes (SC-9).
- [x] 6.3 No service→service imports; routes only parse + map.
