# Proposal: Service Layer for CRUD Business Logic

## Intent

Thesis weakness #3 — no service layer. Business logic lives inside route form actions (one `crud` action switching on `_action`). Extract it into typed services under `src/lib/server/services/` so routes become thin adapters and logic is unit-testable in isolation. Zero user-visible behavior change.

## Scope

### In Scope

- `src/lib/server/services/`: `types.ts` (ServiceResult + Actor), `tickets.ts`, `equipos.ts`, `usuarios.ts`, `mantenimiento.ts`
- 4 thin adapters: `tickets|equipos|usuarios|mantenimiento/+page.server.ts`
- Direct service unit tests per module (in-memory SQLite via `test-helpers.ts`)
- Coverage wiring (see Technical Notes)

### Out of Scope

- `proveedores`/`tipos`/`config`/`sessions` services (phase 2)
- `reportes`/dashboard read-only query services (phase 3)
- `auth.ts` refactor — stays in place as the auth service

## Capabilities

### New Capabilities

None — pure internal refactor, no user-visible behavior change.

### Modified Capabilities

None — no spec-level requirement changes. Direct service tests extend `test-coverage` at implementation level only.

## Approach

1. **ServiceResult**: typed input/result — `{ ok: true; data: T } | { ok: false; error: string; status?: number }` (400 validation/conflict, 403 authz, 404 not-found). Matches `auth.login` / `canTransition` idiom.
2. **Option A extraction**: move logic verbatim into services; adapters parse FormData → call service → `fail(status, { error, _action })` or `{ success: true, _action }`. `requireAuth`/`requireRole` redirects, cookies, load functions STAY in routes.
3. **Dependency graph**: services → {validators, state-machines, auth (hashPassword), db}. No service imports another service.
4. **Work-unit commits** per service (tickets → equipos → usuarios → mantenimiento), each bundling extraction + adapter + tests + green suite.

## Technical Notes

- Test contract byte-for-byte: 139 tests call `actions.crud({request, locals})` asserting `res.status`, `res.data.error`, `{ success: true }`. Full suite after EVERY migration.
- 403 traps (verified): tickets AND equipos consultor guards use literal `_action: ''`; canTransition 403s use real `_action`; usuarios has no 403 fail (`requireRole` throws 303); mantenimiento 403s use 8 literal per-action `_action`s.
- 404 traps: equipos update/delete → 400; tickets delete → 400, update/add_comment → 404; usuarios/mantenimiento → 404. Error strings verbatim.
- Coverage: services/ already matches `src/lib/server/**` glob — extraction WITHOUT same-commit tests drops aggregate below 70% statements.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/server/services/*.ts` | New | types + tickets/equipos/usuarios/mantenimiento services |
| `src/routes/{tickets,equipos,usuarios,mantenimiento}/+page.server.ts` | Modified | Thin adapters (FormData → service → fail/success) |
| `src/lib/server/services/*.test.ts` | New | Direct service tests |
| `vitest.config.ts` | Modified (optional) | Explicit services glob (already covered by `src/lib/server/**`) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Contract breaks (status codes, `_action` literals, error strings) | Med | Verbatim extraction; full suite after each service |
| Coverage < 70% mid-migration | Med | Service tests in the SAME commit as extraction |
| Scope creep into phases 2/3 | Med | Hard scope; one work unit per service |
| mantenimiento has no existing tests | Low | Direct service tests are its new safety net |

## Rollback Plan

`git revert` per work-unit commit (each extraction+adapter+tests is one commit). No schema/DB/migration changes — nothing to migrate back.

## Dependencies

- None new. Existing: drizzle ORM, `validators.ts`, `state-machines.ts`, `auth.ts`, `db/test-helpers.ts`.

## Success Criteria

- [ ] All 139 existing tests pass UNCHANGED (no edits to `crud.test.ts`)
- [ ] Direct service tests green per module
- [ ] Coverage ≥ 70% statements (same thresholds)
- [ ] No service imports another service; routes only parse/map

## Delivery Strategy

`exception-ok`: work-unit commits per service, NOT chained PRs this session — local commits on `main`, user controls push.
