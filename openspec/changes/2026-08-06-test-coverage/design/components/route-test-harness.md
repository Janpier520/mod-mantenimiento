# Component Design: Route Test Harness & Per-File Test Matrix

## Purpose

Define the exact way test files invoke SvelteKit form actions synchronously (no browser), assert on `fail()` / `redirect()` results using the verified runtime shapes, and map every spec scenario (TC-1..TC-11) to concrete test files.

## Action Invocation Harness

Handlers destructure only `{ request, locals }` — verified in all three `+page.server.ts` files. `RequestEvent` has many more fields, so a narrow cast is required (TypeScript-only; eslint `no-explicit-any` is warn-level, prefer the typed cast below).

```ts
// Shared snippet shape (each route test file defines its own small helpers)
import { fail, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { actions } from './+page.server';

export function buildFormData(fields: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.set(k, v);
	return fd;
}

export function fakeLocals(user: App.Locals['user']): App.Locals {
	return { user };
}

export function invokeCrud(
	locals: App.Locals,
	fields: Record<string, string>
): ReturnType<typeof actions.crud> {
	const request = new Request('http://localhost/test', {
		method: 'POST',
		body: buildFormData(fields)
	});
	return actions.crud({ request, locals } as unknown as RequestEvent);
}
```

### Assertion shapes (VERIFIED against installed @sveltejs/kit 2.63)

- **`fail(status, data)`** returns an `ActionFailure` **instance** with runtime props `.status` and `.data` only. `type: 'failure'` exists on the TS type, NOT at runtime — never assert `.type`.
  ```ts
  const res = await invokeCrud(locals, { _action: 'create', ... });
  expect(res.status).toBe(400);
  expect(res.data).toMatchObject({ error: expect.stringContaining('El modelo es obligatorio') });
  ```
- **Success** returns a plain object `{ success: true, _action }` → `expect(res).toMatchObject({ success: true })`.
- **`redirect(status, location)`** **throws** a `Redirect` instance `{ status, location }` (not an `Error` — no `.message`).
  ```ts
  await expect(invokeCrud(locals, { _action: 'create' })).rejects.toMatchObject({
  	status: 303,
  	location: '/login'
  });
  ```
- DB assertions after actions: `db.query.equipment.findFirst(...)` etc. — same instance the action wrote to.

### Fake cookies (auth.test.ts only)

```ts
const cookies = {
	set: vi.fn(),
	get: vi.fn(() => 'token'),
	delete: vi.fn()
} as unknown as Cookies;
```

## Per-File Test Matrix (TC → file → count)

| Spec              | Test file                                            | Approx. tests                                                 |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| TC-3              | `src/lib/server/state-machines.test.ts`              | 18                                                            |
| TC-4              | `src/lib/server/validators.test.ts` (pure part only) | 14                                                            |
| TC-5              | `src/lib/utils.test.ts`                              | 12                                                            |
| TC-6              | `src/lib/server/auth.test.ts` (extend existing)      | 16 (1 existing + 15)                                          |
| TC-7              | `src/lib/server/validators.db.test.ts`               | 6                                                             |
| TC-8              | `src/routes/equipos/+page.server.test.ts`            | 9                                                             |
| TC-9              | `src/routes/usuarios/+page.server.test.ts`           | 8                                                             |
| TC-10             | `src/routes/tickets/+page.server.test.ts`            | 7                                                             |
| TC-1, TC-2, TC-11 | Infrastructure + helper                              | (covered by config + every DB file's `beforeAll(initTestDb)`) |

Total ≈ 90 tests across 8 files (matches proposal success criteria).

## Per-file scenario notes

### state-machines (TC-3)

Full transition matrix both machines (`isValidTransition` / `getValidTransitions`), `dado_de_baja` sink returns `[]`/`false`, unknown state `'inexistente'` → `false` without throw, equipment `dado_de_baja` admin-only via `canTransition` (tecnico → `{ allowed: false }` + error; admin → `{ allowed: true }`), ticket role map per `to`-state (e.g. `cerrado` requires admin/consultor), ticket reopen `cerrado → abierto` valid.

### validators pure (TC-4)

Email format, username 3–50 `[a-zA-Z0-9_.-]` boundaries, password length 5/6/128/129 + empty → required, `escapeLike` `%`→`\%`, `_`→`\_`, plain unchanged, empty→`''`.

### utils (TC-5)

`cn('px-2','px-4')` → only `px-4`; `capitalize`; `formatDate`/`formatDateShort` es-AR — assert **loosely** (contains year `'2026'` and a month name, or `dd/mm/yyyy` via parts) — Node ICU varies; `null`/`undefined` → `'—'`; `hasAccess` empty/undefined roles → true, undefined role + required roles → false, non-matching → false; `statusLabel` known labels + capitalize fallback.

### auth (TC-6, integration — beforeAll(initTestDb))

- **Rate limit**: 5 failed attempts (direct insert `created_at = now − 1min`) → `checkLoginRateLimit` `allowed: false` + `retryAfterMs > 0`; insert 4 recent + 1 at `now − 20min` → `allowed: true` (window excludes old). Namespace: 3 `recordFailedReset('user')` → login counter for `'user'` still `allowed: true`; `checkResetRateLimit` → blocked.
- **Sessions**: create → token; validate → user; delete → validate → `null`. Sliding window: insert `created_at = now−13h`, `expires_at = now+11h` → validate extends to ≈ `now+24h`; insert `now−6h`/`now+18h` → unchanged.
- **Login**: wrong user / disabled account (update `activo=false`) / wrong password → `success: false` with the exact error strings; success → token.
- **Cookies**: mock `Cookies` — `setSessionCookie` sets `'equip-lab-session'` with `httpOnly: true`; `getSessionToken` reads; `clearSessionCookie` deletes.
- **Guards**: `requireAuth({ user: null })` throws 303 `/login`; `requireRole({ user: tecnico }, 'admin')` throws 303 `/`.

### validators.db (TC-7)

`isLastActiveAdmin`: 1 active admin → true; seed 2nd admin → false; non-admin → false; inactive admin → false. `isUsernameTaken`/`isEmailTaken` true for owner; `excludeUserId = owner.id` → false. `isEquipmentTypeNameTaken` + `userExists`.

### equipos (TC-8)

Create missing `modelo` → 400; valid create → row exists + `{ success: true }`; update `operativo → en_reparacion` as admin → row updated + exactly one `equipment_status_history` row (`estado_anterior='operativo'`, `estado_nuevo='en_reparacion'`, `cambiado_por=adminId`); update `dado_de_baja → operativo` → 400 transition error; tecnico updating to `dado_de_baja` → 403; delete with ticket ref → 400, with PM-plan ref → 400, unreferenced → success. Consultor create → 403 (top-of-action block).

### usuarios (TC-9)

Create with empty username/email + short password → 400 with **all** errors joined (`errors.join('. ')`); duplicate username → 400; duplicate email → 400; update to another user's email → 400, keep own email → success (`excludeUserId`); last-admin deactivate / role-change / delete → 400 last-admin error (single seeded admin); self-delete → 400; delete user referenced by ticket → 400, by pm_execution → 400 (insert plan+task+execution inline), unreferenced → success. Non-admin locals → throws 303 `/` (requireRole).

### tickets (TC-10)

Create empty title → 400; create referencing `dado_de_baja` equipment → 400; two creates → `TKT-<date>-001` / `-002` (assert regex, serial only); update `abierto → resuelto` → 400 (invalid transition); tecnico update `abierto → cerrado` → 403 (role map: `cerrado` needs admin/consultor); `add_comment` valid → row created, empty → 400, missing ticket → 404.

> **TC-10 spec-vs-code conflict (resolved)**: the spec says "a consultor creates the ticket, then a tecnico deletes it → 403". But the handler blocks ALL consultor actions at the top (`fail(403, 'Los consultores no pueden modificar tickets')`, line 112). Resolution: seed the "created by consultor" state with a direct `db.insert(tickets)` (`usuario_reporta = consultorId`) — this is a legitimate historical state — then assert the delete guard: tecnico (not creator, not admin) → 403; creator (consultor) → success; admin on another ticket → success. The action-level consultor block is asserted separately via a create attempt → 403.

## Reliability rules (TC-11)

- No `it.concurrent` anywhere in `tickets/+page.server.test.ts` (shared in-memory DB per file, sequential numbering).
- No sleeps / fake timers — explicit timestamp inserts (see architecture D6).
- `beforeAll(initTestDb)` in every DB file; bcrypt only via `getTestPasswordHash()`.
- Prettier: tabs, single quotes, no trailing commas, printWidth 100 — run `npm run format` before commit.
