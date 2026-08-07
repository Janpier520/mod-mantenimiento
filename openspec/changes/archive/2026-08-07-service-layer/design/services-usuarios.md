# Design: `services/usuarios.ts` + usuarios adapter

Source of truth: `src/routes/usuarios/+page.server.ts` (old lines 46–211). Verbatim extraction.

## Exported signatures

```ts
import type { ServiceResult, Actor } from './types';

export interface CreateUserInput {
  username: string;    // form username ?? ''
  email: string;       // form email ?? ''
  nombre: string;      // form nombre ?? ''
  apellido: string;    // form apellido ?? ''
  password: string;    // form password ?? ''
  rol: string;         // form rol ?? 'tecnico'
  activo: boolean;     // form.get('activo') === 'on'
}
export interface UpdateUserInput {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  password: string;    // '' = no password change
  rol: string;
  activo: boolean;
}
export interface DeleteUserInput { id: string; }

export type UserResult = ServiceResult<{ id: string }>;

export function createUser(input: CreateUserInput): Promise<UserResult>;
export function updateUser(input: UpdateUserInput): Promise<UserResult>;
export function deleteUser(input: DeleteUserInput, actor: Actor): Promise<UserResult>;
```

- `createUser`: aggregated validation (errors pushed in fixed order, joined `'. '` — order: username, email, nombre, apellido, `validatePasswordStrength`, `validateEmail`, rol valid) → 400; then `isUsernameTaken(username.trim())` → 400 `'Ya existe un usuario con ese nombre de usuario'`; then `isEmailTaken(email.trim())` → 400 `'Ya existe un usuario con ese email'`; insert `{ username/email/nombre/apellido: .trim(), password_hash: await hashPassword(password), rol, activo }` via `.returning({ id })`.
- `updateUser`: validate → id empty 400 → existence 404 → aggregated (nombre/apellido/email required, `validateEmail`, rol valid, `validatePasswordStrength` ONLY if `password` non-empty) → last-admin guard → email dup with `excludeUserId = id` → update (incl. `password_hash` only if `password`).
- `deleteUser(input, actor)`: id empty 400 → existence 404 → **self-guard `actor.id === id` → 400 `'No podés eliminar tu propio usuario'`** (the unreachable `!locals.user ||` prefix is dropped — see architecture Decision: dead branch removal) → last-admin guard → ticket refs count (`usuario_reporta OR tecnico_asignado`) 400 `'No se puede eliminar: el usuario tiene ${n} ticket(s) asociado(s)'` → PM refs count (`ejecutado_por`) 400 `'No se puede eliminar: el usuario tiene ${n} ejecución(es) de mantenimiento asociada(s)'` → delete.
- **No 403 paths anywhere** — `requireRole(locals, 'admin')` throws 303 before the adapter parses; service never checks `actor.rol`.
- Last-admin guard (shared private helper used by update + delete): `existingUser.rol === 'admin' && existingUser.activo && (target becomes non-admin-inactive || delete) && isLastActiveAdmin(id)` → 400 `'No podés desactivar o cambiar el rol del último administrador'` (update) / `'No podés eliminar el último administrador'` (delete).
- Imports: `db`, `{ users, tickets, pm_executions }`, `eq, or, count` from drizzle, `{ validateEmail, validatePasswordStrength, isUsernameTaken, isEmailTaken, isLastActiveAdmin }` from validators, **`hashPassword` from `$lib/server/auth`** (the one allowed auth import).

## Adapter mapping (crud action)

```ts
requireRole(locals, 'admin');   // throws 303 → '/' for non-admin — STAYS in route
```

Parse `_action`, `id`, then switch:

| `_action` | FormData → input | service | success | failure |
|---|---|---|---|---|
| `create` | `{ username, email, nombre, apellido, password, rol ?? 'tecnico', activo: form.get('activo') === 'on' }` | `createUser(input)` | `{ success: true, _action }` | `fail(res.status ?? 400, { error, _action })` |
| `update` | `{ id, nombre, apellido, email, password, rol ?? 'tecnico', activo: form.get('activo') === 'on' }` | `updateUser(input)` | same | same |
| `delete` | `{ id }` | `deleteUser(input, actor)` | same | same |
| anything else | — | — | — | `fail(400, { error: 'Acción no válida', _action })` |

`actor = { id: locals.user.id, rol: locals.user.rol }` — needed only by `deleteUser`.

### Service error contract (verbatim)

| # | Guard (in order) | status | error string |
|---|---|---|---|
| 1 | create: any aggregate error | 400 | `errors.join('. ')` (e.g. `El nombre de usuario es obligatorio. El email es obligatorio. …`) |
| 2 | create: username taken | 400 | `Ya existe un usuario con ese nombre de usuario` |
| 3 | create: email taken | 400 | `Ya existe un usuario con ese email` |
| 4 | update: id empty | 400 | `ID de usuario no proporcionado` |
| 5 | update: user not found | **404** | `Usuario no encontrado` |
| 6 | update: aggregate errors | 400 | `errors.join('. ')` |
| 7 | update: last active admin (deactivate or role change) | 400 | `No podés desactivar o cambiar el rol del último administrador` |
| 8 | update: email taken by ANOTHER user (`excludeUserId = id`) | 400 | `Ya existe otro usuario con ese email` |
| 9 | delete: id empty | 400 | `ID de usuario no proporcionado` |
| 10 | delete: user not found | **404** | `Usuario no encontrado` |
| 11 | delete: self-delete | 400 | `No podés eliminar tu propio usuario` |
| 12 | delete: last active admin | 400 | `No podés eliminar el último administrador` |
| 13 | delete: ticket refs | 400 | `No se puede eliminar: el usuario tiene ${n} ticket(s) asociado(s)` |
| 14 | delete: PM execution refs | 400 | `No se puede eliminar: el usuario tiene ${n} ejecución(es) de mantenimiento asociada(s)` |

## Service tests (`services/usuarios.test.ts`)

`initTestDb()` in `beforeAll`. Seed gives exactly ONE active admin (`adminId`) — perfect last-admin fixture.

1. `createUser` valid → ok; row with trimmed values; `password_hash` verifies via bcrypt `compare`.
2. `createUser` all-blank + weak password → 400 with joined message containing username/email/nombre/apellido/password errors (assert `.toContain` per message).
3. `createUser` duplicate username → 400 exact; duplicate email → 400 exact.
4. `updateUser` own-email success (`tecnicoId` keeps `tecnico@equiplab.test`) → ok (excludeUserId path).
5. `updateUser` assigns `admin@equiplab.test` to `tecnicoId` → 400 `Ya existe otro usuario con ese email`.
6. `updateUser` deactivates `adminId` (no `activo`) → 400 last-admin; role-change `adminId → tecnico` → 400 last-admin; both assert exact error.
7. `deleteUser` on `adminId` by an inactive-admin actor → 400 `No podés eliminar el último administrador` (mirrors route test — insert a second inactive admin row to act).
8. `deleteUser` self (`actor.id === id`) → 400 `No podés eliminar tu propio usuario`.
9. `deleteUser` with ticket refs → 400 `ticket(s) asociado(s)`; with PM execution refs → 400 `ejecución(es) de mantenimiento asociada(s)`; unreferenced temp user → ok.
10. `updateUser` password change path: with non-empty password, `password_hash` differs after update (optional, requires bcrypt compare).

## Route test coverage already exists (stay untouched)

`src/routes/usuarios/crud.test.ts` (14 tests): requireRole 303 → `/`, aggregated errors, dup username/email, excludeUserId, last-admin ×3, self-delete, ticket/PM refs, unreferenced delete.
