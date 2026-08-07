# Design: `services/tickets.ts` + tickets adapter

Source of truth for extraction: `src/routes/tickets/+page.server.ts` (old lines 110–282). Every error string, status, and validation order below is copied verbatim.

## Exported signatures

```ts
// types.ts
import type { ServiceResult, Actor } from './types';

export interface CreateTicketInput {
  titulo: string;          // form titulo ?? ''
  descripcion: string;     // form descripcion ?? ''
  prioridad: string;       // form prioridad ?? 'media'
  equipo_id: string;       // form equipo_id ?? ''  ('' = none)
}
export interface UpdateTicketInput {
  id: string;
  titulo: string;
  descripcion: string;
  prioridad: string;       // form ?? 'media'
  estado: string;          // form ?? 'abierto'
  tecnico_asignado: string;// form ?? ''  ('' = none)
  equipo_id: string;       // form ?? ''  ('' = none)
}
export interface DeleteTicketInput { id: string; }
export interface AddCommentInput { ticket_id: string; contenido: string; }

export type CreateTicketResult = ServiceResult<{ id: string; numero_ticket: string }>;
export type UpdateTicketResult = ServiceResult<{ id: string }>;
export type DeleteTicketResult = ServiceResult<{ id: string }>;
export type AddCommentResult = ServiceResult<{ commentId: string }>;

export function generateTicketNumber(): Promise<string>;
export function createTicket(input: CreateTicketInput, actor: Actor): Promise<CreateTicketResult>;
export function updateTicket(input: UpdateTicketInput, actor: Actor): Promise<UpdateTicketResult>;
export function deleteTicket(input: DeleteTicketInput, actor: Actor): Promise<DeleteTicketResult>;
export function addComment(input: AddCommentInput, actor: Actor): Promise<AddCommentResult>;
```

- `generateTicketNumber` = old helper verbatim (lines 17–26): `TKT-${YYYYMMDD}-${count+1}` padded 3, counting `tickets.numero_ticket LIKE 'TKT-${datePart}-%'`. `createTicket` calls it after equipment validation (numbering must NOT run on failed validation — preserve order: title → priority → equipo → number → insert).
- `createTicket` inserts with `.returning({ id, numero_ticket })`; `usuario_reporta = actor.id`; `equipo_id: equipo_id || null`.
- `updateTicket` writes `updated_at = new Date().toISOString()`; `tecnico_asignado/equipo_id` → `|| null`.
- `deleteTicket` guard: `if (ticket.usuario_reporta !== actor.id && actor.rol !== 'admin')` → 403.
- `addComment` inserts `{ ticket_id, usuario_id: actor.id, contenido: contenido.trim() }` via `.returning({ id })` → `commentId`.
- Imports: `db`, tables `{ tickets, users, equipment, ticket_comments }`, drizzle `{ eq, like, count }`, `{ isValidTransition, canTransition, VALID_TICKET_STATES, VALID_TICKET_PRIORITIES }` from state-machines.

## Adapter mapping (crud action)

Guard block FIRST (before formData — literal trap):

```ts
requireAuth(locals);
if (locals.user.rol === 'consultor') {
  return fail(403, { error: 'Los consultores no pueden modificar tickets', _action: '' });
}
```

Then `_action = form.get('_action')`, `id = form.get('id') ?? ''`, switch on `_action`:

| `_action` | FormData → input | service | success | failure |
|---|---|---|---|---|
| `create` | `{ titulo, descripcion, prioridad ?? 'media', equipo_id ?? '' }` | `createTicket(input, actor)` | `{ success: true, _action }` | `fail(res.status ?? 400, { error, _action })` |
| `update` | `{ id, titulo, descripcion, prioridad ?? 'media', estado ?? 'abierto', tecnico_asignado ?? '', equipo_id ?? '' }` | `updateTicket(input, actor)` | same | same |
| `delete` | `{ id }` | `deleteTicket(input, actor)` | same | same |
| `add_comment` | `{ ticket_id: form.get('ticket_id') ?? '', contenido: form.get('contenido') ?? '' }` | `addComment(input, actor)` | same | same |
| anything else | — | — | — | `fail(400, { error: 'Acción no válida', _action })` |

`actor = { id: locals.user.id, rol: locals.user.rol }` (after `requireAuth`, `locals.user` is non-null).

### Service error contract (verbatim)

| # | Guard (in order) | status | error string |
|---|---|---|---|
| 1 | create: title empty | 400 | `El título del ticket es obligatorio` |
| 2 | create: priority ∉ VALID_TICKET_PRIORITIES | 400 | `Prioridad no válida` |
| 3 | create: equipo_id set & not found | 400 | `Equipo no encontrado` |
| 4 | create: equipo `dado_de_baja` | 400 | `No se puede crear un ticket para un equipo dado de baja` |
| 5 | update: id empty | 400 | `ID de ticket no proporcionado` |
| 6 | update: ticket not found | **404** | `Ticket no encontrado` |
| 7 | update: title empty | 400 | `El título del ticket es obligatorio` |
| 8 | update: priority invalid | 400 | `Prioridad no válida` |
| 9 | update: state invalid | 400 | `Estado no válido` |
| 10 | update: invalid transition | 400 | `Transición de estado no permitida: ${from} → ${to}` |
| 11 | update: `canTransition` denied | 403 | `roleCheck.error` (real `_action` echoed) |
| 12 | update: tecnico not found | 400 | `Técnico no encontrado` |
| 13 | update: tecnico role not tecnico/admin | 400 | `El usuario asignado no es técnico ni administrador` |
| 14 | update: equipo not found | 400 | `Equipo no encontrado` |
| 15 | update: equipo `dado_de_baja` | 400 | `No se puede asignar un equipo dado de baja` |
| 16 | delete: id empty | 400 | `ID de ticket no proporcionado` |
| 17 | delete: not found | **400** | `Ticket no encontrado` |
| 18 | delete: not creator & not admin | 403 | `No tenés permiso para eliminar este ticket` |
| 19 | add_comment: ticket_id empty | 400 | `ID de ticket no proporcionado` |
| 20 | add_comment: ticket not found | **404** | `Ticket no encontrado` |
| 21 | add_comment: content empty | 400 | `El comentario no puede estar vacío` |

Asymmetry to watch: #6/#20 → 404, but #17 → 400.

## Service tests (`services/tickets.test.ts`)

`initTestDb()` in `beforeAll`; NO `it.concurrent` (sequential numbering, mirrors `crud.test.ts` note). Direct DB via `db.query.tickets` / `db.query.ticket_comments`.

1. `generateTicketNumber` returns `TKT-\d{8}-NNN`; two consecutive creates yield 001 then 002 with identical date part.
2. `createTicket` happy path → `{ ok: true, data.numero_ticket }` matches `TKT-\d{8}-\d{3}`; row exists with `usuario_reporta = actor.id`.
3. `createTicket` with `equipo_id = ids.eqBajaId` → `{ ok: false, status: 400, error: 'No se puede crear un ticket para un equipo dado de baja' }`.
4. `createTicket` with `equipo_id: 'no-existe'` → 400 `Equipo no encontrado`.
5. `updateTicket` `abierto → resuelto` → 400 transition error; `abierto → cerrado` by tecnico → 403 (real actor rol) — assert `status: 403`.
6. `updateTicket` unknown id → 404; `deleteTicket` unknown id → **400** (asymmetry test).
7. `deleteTicket` by non-creator non-admin → 403 `No tenés permiso para eliminar este ticket`; by creator → ok; by admin on consultor-created ticket → ok.
8. `addComment` valid → `ok: true`, `commentId` set, row `usuario_id = actor.id`; missing ticket → 404; empty content → 400.
9. Title-empty create → 400 (guard order: validation before numbering — assert no row created).

## Route test coverage already exists (stay untouched)

`src/routes/tickets/crud.test.ts` (17 tests): consultor 403 `''` trap, numbering 001/002, decommissioned equipo, transition 400, role 403, delete creator-or-admin, add_comment 400/404, unknown action 400, 303 unauth.
