# Design: `services/equipos.ts` + equipos adapter

Source of truth: `src/routes/equipos/+page.server.ts` (old lines 110–244). Verbatim extraction.

## Exported signatures

```ts
import type { ServiceResult, Actor } from './types';
import type { EquipmentState } from '$lib/server/state-machines';

export interface EquipoInput {
  tipo_id: string;            // form tipo_id ?? ''
  modelo: string;             // form modelo ?? ''
  marca: string;              // form marca ?? ''
  numero_serie: string;       // form numero_serie ?? ''
  estado: EquipmentState;     // form estado ?? 'operativo' (cast)
  ubicacion: string;          // form ubicacion ?? ''
  fecha_adquisicion: string;  // form fecha_adquisicion ?? ''
  proveedor_id: string;       // form proveedor_id ?? ''
  notas: string;              // form notas ?? ''
}
export interface UpdateEquipoInput extends EquipoInput { id: string; }
export interface DeleteEquipoInput { id: string; }

export type EquipoResult = ServiceResult<{ id: string }>;

export function createEquipo(input: EquipoInput): Promise<EquipoResult>;
export function updateEquipo(input: UpdateEquipoInput, actor: Actor): Promise<EquipoResult>;
export function deleteEquipo(input: DeleteEquipoInput): Promise<EquipoResult>;
```

- Module-private `validateEquipoInputs(input: EquipoInput): string | null` — the shared `create || update` field block (old lines 130–143): modelo → `'El modelo es obligatorio'`, marca → `'La marca es obligatoria'`, tipo_id → `'El tipo de equipo es obligatorio'`, estado ∉ `VALID_EQUIPMENT_STATES` → `'Estado no válido'`. Returned as first-error. **Both `createEquipo` and `updateEquipo` call it FIRST** (preserves old ordering: field validation precedes the update id/existence checks).
- `createEquipo` inserts `{ tipo_id, modelo.trim(), marca.trim(), numero_serie.trim(), estado, ubicacion.trim(), fecha_adquisicion || null, proveedor_id || null, notas.trim() }` via `.returning({ id })`.
- `updateEquipo` (order): validate → id empty 400 → existence 400 → `isValidTransition(existing.estado, estado, 'equipment')` 400 → `canTransition(..., actor.rol, 'equipment')` 403 → if state changed insert `equipment_status_history { equipo_id: id, estado_anterior: existing.estado, estado_nuevo: estado, cambiado_por: actor.id }` → update row (incl. `updated_at`).
- `deleteEquipo` (order): id empty 400 → tickets ref (`tickets.equipo_id = id`) 400 → PM plans ref (`preventive_maintenance_plans.equipo_id = id`) 400 → delete.
- No actor on `createEquipo`/`deleteEquipo` (no authz inside those paths — matches old code).
- Imports: `db`, tables `{ equipment, equipment_status_history, tickets, preventive_maintenance_plans }`, `eq` from drizzle, `{ isValidTransition, canTransition, VALID_EQUIPMENT_STATES, type EquipmentState }` from state-machines. (`equipment_types`/`proveedores` imports move out with the load function.)

## Adapter mapping (crud action)

Guard block FIRST (literal trap — verbatim, INCLUDING the inline redirect, do not convert to `requireAuth`):

```ts
if (!locals.user) throw redirect(303, '/login');
if (locals.user.rol === 'consultor') {
  return fail(403, { error: 'Los consultores no pueden modificar equipos', _action: '' });
}
```

Parse the 9 fields once (before switch, as today), then switch on `_action`:

| `_action` | input | service | success | failure |
|---|---|---|---|---|
| `create` | full `EquipoInput` | `createEquipo(input)` | `{ success: true, _action }` | `fail(res.status ?? 400, { error, _action })` |
| `update` | `{ ...EquipoInput, id }` | `updateEquipo(input, actor)` | same | same |
| `delete` | `{ id }` | `deleteEquipo(input)` | same | same |
| anything else | — | — | — | `fail(400, { error: 'Acción no válida', _action })` |

`actor = { id: locals.user.id, rol: locals.user.rol }` (after the redirect guard).

### Service error contract (verbatim)

| # | Guard (in order) | status | error string |
|---|---|---|---|
| 1 | create/update: modelo empty | 400 | `El modelo es obligatorio` |
| 2 | create/update: marca empty | 400 | `La marca es obligatoria` |
| 3 | create/update: tipo_id empty | 400 | `El tipo de equipo es obligatorio` |
| 4 | create/update: estado invalid | 400 | `Estado no válido` |
| 5 | update: id empty | 400 | `ID de equipo no proporcionado` |
| 6 | update: equipo not found | **400** | `Equipo no encontrado` |
| 7 | update: invalid transition | 400 | `Transición de estado no permitida: ${from} → ${to}` |
| 8 | update: `canTransition` denied | 403 | `roleCheck.error` (real `_action` echoed) |
| 9 | delete: id empty | 400 | `ID de equipo no proporcionado` |
| 10 | delete: ticket refs exist | 400 | `No se puede eliminar: hay tickets que referencian este equipo` |
| 11 | delete: PM plan refs exist | 400 | `No se puede eliminar: hay planes de mantenimiento que referencian este equipo` |

Asymmetry: #6 → 400 (equipos update not-found is 400, unlike tickets 404). 403 only from #8 (canTransition) — consultor never reaches the service.

## Service tests (`services/equipos.test.ts`)

`initTestDb()` in `beforeAll`. Seeded fixtures: `eqOperativoId` (operativo), `eqReparacionId` (en_reparacion), `eqPrestadoId` (prestado), `eqBajaId` (dado_de_baja).

1. `createEquipo` valid → `{ ok: true, data.id }`; row exists with trimmed values, `estado: 'operativo'`.
2. `createEquipo` missing modelo/marca/tipo_id → 400 with each exact error; invalid estado (`'volando'`) → 400 `Estado no válido`.
3. `updateEquipo` `eqOperativoId → en_reparacion` by admin → ok; `equipment_status_history` has EXACTLY 1 row with `estado_anterior: 'operativo'`, `estado_nuevo: 'en_reparacion'`, `cambiado_por: actor.id`.
4. `updateEquipo` `eqBajaId → operativo` → 400 `Transición de estado no permitida: dado_de_baja → operativo`.
5. `updateEquipo` `eqOperativoId → dado_de_baja` by tecnico actor → 403 `Solo los administradores pueden dar de baja equipos`; **no history row written**.
6. `updateEquipo` unknown id → 400 (asymmetry).
7. `deleteEquipo` on `eqOperativoId` after inserting a referencing ticket → 400 tickets error; on `eqPrestadoId` after inserting a referencing PM plan → 400 PM error; on `eqReparacionId` (unreferenced) → ok and row gone.
8. Same-state update (no transition) writes NO history row and returns ok.

## Route test coverage already exists (stay untouched)

`src/routes/equipos/crud.test.ts` (14 tests): consultor 403 `''` trap, required fields, valid create, status-history single row, transition 400, role 403, delete refs ×2, unreferenced delete, unknown action, 303 unauth.
