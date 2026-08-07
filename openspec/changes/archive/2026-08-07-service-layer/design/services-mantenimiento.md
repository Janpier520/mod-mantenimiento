# Design: `services/mantenimiento.ts` + mantenimiento adapter

Source of truth: `src/routes/mantenimiento/+page.server.ts` (old lines 56–406). Verbatim extraction. This module has NO existing route tests — the new `services/mantenimiento.test.ts` is its safety net, and the consultor guard moves INTO the service (SC-5).

## Exported signatures

```ts
import type { ServiceResult, Actor } from './types';

export interface PlanInput {
  nombre: string;          // form nombre ?? ''
  descripcion: string;     // form descripcion ?? ''
  frecuencia_dias: number; // Number(form.get('frecuencia_dias'))
  equipo_id: string;       // form equipo_id ?? ''
  tipo_equipo_id: string;  // form tipo_equipo_id ?? ''
}
export interface TaskInput { nombre: string; descripcion: string; }
export interface ScheduleExecutionInput {
  plan_id: string;
  ejecutado_por: string;
  fecha_programada: string;   // must match /^\d{4}-\d{2}-\d{2}$/
}
export interface CompleteExecutionInput {
  id: string;
  resultado: string;          // literal check ['completado','fallido','omitido']
  observaciones: string;
}

export type PlanResult = ServiceResult<{ id: string }>;
export type TaskResult = ServiceResult<{ id: string; orden: number }>;   // addTask
export type ScheduleResult = ServiceResult<{ scheduled: number }>;       // bulk rows inserted

export function createPlan(input: PlanInput, actor: Actor): Promise<PlanResult>;
export function updatePlan(input: PlanInput & { id: string }, actor: Actor): Promise<PlanResult>;
export function deletePlan(input: { id: string }, actor: Actor): Promise<PlanResult>;
export function addTask(input: TaskInput & { plan_id: string }, actor: Actor): Promise<TaskResult>;
export function updateTask(input: TaskInput & { id: string }, actor: Actor): Promise<TaskResult>;
export function deleteTask(input: { id: string }, actor: Actor): Promise<TaskResult>;
export function scheduleExecution(input: ScheduleExecutionInput, actor: Actor): Promise<ScheduleResult>;
export function completeExecution(input: CompleteExecutionInput, actor: Actor): Promise<ServiceResult<{ id: string }>>;
```

- **Every function starts with the consultor guard** (module-private, DRY):
  ```ts
  const CONSULTOR_ERROR: ServiceResult<never> = {
    ok: false,
    error: 'Los consultores no pueden modificar mantenimiento',
    status: 403
  };
  // each fn: if (actor.rol === 'consultor') return CONSULTOR_ERROR;
  ```
- `createPlan` (order): guard → nombre 400 → frecuencia 400 → equipo existence 400 → tipo existence 400 → insert `{ nombre.trim(), descripcion.trim(), frecuencia_dias, equipo_id || null, tipo_equipo_id || null }` `.returning({ id })`.
- `updatePlan`: guard → id 400 → nombre 400 → frecuencia 400 → plan existence **404** → equipo 400 → tipo 400 → update (incl. `updated_at`).
- `deletePlan`: guard → id 400 → plan existence **404** → `pm_executions.plan_id` count → 400 `El plan tiene ${n} ejecuciones registradas. Eliminalas primero o reagendalas.` → delete.
- `addTask`: guard → plan_id 400 → plan existence **404** → nombre 400 → `sql<number>`COALESCE(MAX(pm_tasks.orden),0)`` per plan → insert `{ plan_id, nombre.trim(), descripcion.trim(), orden: max + 1 }` `.returning({ id, orden })`.
- `updateTask`: guard → id 400 → task existence **404** → nombre 400 → update `{ nombre.trim(), descripcion.trim() }` (NO `updated_at` — tasks table has no such column; keep verbatim).
- `deleteTask`: guard → id 400 → task existence **404** → `pm_executions.tarea_id` count → 400 `La tarea tiene ${n} ejecuciones registradas. Eliminalas primero.` → delete.
- `scheduleExecution` (order — preserve): guard → plan_id 400 → ejecutado_por 400 `Selecciona un técnico` → fecha_programada 400 `Selecciona una fecha programada` → plan existence **404** → tech existence 400 `Técnico no encontrado` → tech role 400 `El usuario seleccionado no es técnico ni administrador` → date regex 400 `Formato de fecha no válido (usa YYYY-MM-DD)` → tasks of plan (empty → 400 `El plan no tiene tareas. Agrega tareas primero.`) → bulk insert `tasks.map(t => ({ plan_id, tarea_id: t.id, ejecutado_por, fecha_programada, resultado: 'pendiente' as const }))` `.returning({ id })` → `data: { scheduled: rows.length }`.
- `completeExecution` (order): guard → id 400 → execution existence **404** → `resultado !== 'pendiente'` 400 `Esta ejecución ya fue procesada` → resultado ∉ `['completado','fallido','omitido']` 400 `Resultado no válido` → update `{ fecha_ejecucion: new Date().toISOString(), resultado, observaciones: observaciones.trim() }`.
- Imports: `db`, `{ preventive_maintenance_plans, pm_tasks, pm_executions, equipment, equipment_types, users }`, `eq, count, sql` from drizzle. **`VALID_PM_RESULTS` is NOT used by the extracted logic** (route imported it but the action checks the literal array) — do not import it in the service; drop the unused import from the adapter.

## Adapter mapping (8 named actions — no `_action` in the form)

Each action keeps `requireAuth(locals)` then the same shape (example `create_plan`):

```ts
create_plan: async ({ request, locals }) => {
  requireAuth(locals);
  const form = await request.formData();
  const res = await createPlan(
    {
      nombre: (form.get('nombre') as string) ?? '',
      descripcion: (form.get('descripcion') as string) ?? '',
      frecuencia_dias: Number(form.get('frecuencia_dias')),
      equipo_id: (form.get('equipo_id') as string) ?? '',
      tipo_equipo_id: (form.get('tipo_equipo_id') as string) ?? ''
    },
    { id: locals.user.id, rol: locals.user.rol }
  );
  if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action: 'create_plan' });
  return { success: true, _action: 'create_plan' };
},
```

| Action | Input fields parsed | service | literal `_action` |
|---|---|---|---|
| `create_plan` | nombre, descripcion, frecuencia_dias(Number), equipo_id, tipo_equipo_id | `createPlan` | `'create_plan'` |
| `update_plan` | + id | `updatePlan` | `'update_plan'` |
| `delete_plan` | id | `deletePlan` | `'delete_plan'` |
| `add_task` | plan_id, nombre, descripcion | `addTask` | `'add_task'` |
| `update_task` | id, nombre, descripcion | `updateTask` | `'update_task'` |
| `delete_task` | id | `deleteTask` | `'delete_task'` |
| `schedule_execution` | plan_id, ejecutado_por, fecha_programada | `scheduleExecution` | `'schedule_execution'` |
| `complete_execution` | id, resultado, observaciones | `completeExecution` | `'complete_execution'` |

Failure mapping is uniform: `fail(res.status ?? 400, { error: res.error, _action: <literal> })` — the 403 consultor result therefore carries its literal per-action `_action`. Success: `{ success: true, _action: <literal> }`.

### Service error contract (verbatim)

| # | Guard | status | error string |
|---|---|---|---|
| 1 | all ops: consultor | 403 | `Los consultores no pueden modificar mantenimiento` |
| 2 | create/update_plan: nombre | 400 | `El nombre del plan es obligatorio` |
| 3 | create/update_plan: frecuencia | 400 | `La frecuencia debe ser mayor a 0 días` |
| 4 | create/update_plan: equipo | 400 | `Equipo no encontrado` |
| 5 | create/update_plan: tipo | 400 | `Tipo de equipo no encontrado` |
| 6 | update/delete_plan: id | 400 | `ID de plan no proporcionado` |
| 7 | update/delete_plan: not found | **404** | `Plan no encontrado` |
| 8 | delete_plan: executions | 400 | `El plan tiene ${n} ejecuciones registradas. Eliminalas primero o reagendalas.` |
| 9 | add_task: plan_id | 400 | `ID de plan no proporcionado` |
| 10 | add_task: plan not found | **404** | `Plan no encontrado` |
| 11 | add/update_task: nombre | 400 | `El nombre de la tarea es obligatorio` |
| 12 | update/delete_task: id | 400 | `ID de tarea no proporcionado` |
| 13 | update/delete_task: not found | **404** | `Tarea no encontrada` |
| 14 | delete_task: executions | 400 | `La tarea tiene ${n} ejecuciones registradas. Eliminalas primero.` |
| 15 | schedule: plan_id | 400 | `ID de plan no proporcionado` |
| 16 | schedule: técnico missing | 400 | `Selecciona un técnico` |
| 17 | schedule: fecha missing | 400 | `Selecciona una fecha programada` |
| 18 | schedule: plan not found | **404** | `Plan no encontrado` |
| 19 | schedule: tech not found | 400 | `Técnico no encontrado` |
| 20 | schedule: tech role | 400 | `El usuario seleccionado no es técnico ni administrador` |
| 21 | schedule: date format | 400 | `Formato de fecha no válido (usa YYYY-MM-DD)` |
| 22 | schedule: no tasks | 400 | `El plan no tiene tareas. Agrega tareas primero.` |
| 23 | complete: id | 400 | `ID de ejecución no proporcionado` |
| 24 | complete: not found | **404** | `Ejecución no encontrada` |
| 25 | complete: already processed | 400 | `Esta ejecución ya fue procesada` |
| 26 | complete: resultado invalid | 400 | `Resultado no válido` |

## Service tests (`services/mantenimiento.test.ts`)

`initTestDb()` in `beforeAll` (admin/tecnico/consultor actors, equipment fixtures). Seed rows via direct `db.insert` for plans/tasks/executions.

1. **Consultor guard ×8**: every op with `actor.rol === 'consultor'` → `{ ok: false, status: 403, error: 'Los consultores no pueden modificar mantenimiento' }` and no row written.
2. `createPlan` valid → ok; row trimmed; `createPlan` missing nombre → 400; `frecuencia_dias: 0` → 400; bad equipo_id → 400; bad tipo_equipo_id → 400.
3. `updatePlan` → 400 id; **404** unknown plan; 400 bad equipo; success updates trimmed values.
4. `deletePlan` → **404** unknown; 400 when executions exist (seed plan+task+execution); success when clean.
5. `addTask` → **404** unknown plan; 400 empty nombre; `orden` sequencing: add two tasks → orden 1 then 2 (`max-orden` per plan); **independent ordering across plans** (task in plan B gets orden 1 even if plan A has 2).
6. `updateTask` → **404** unknown; 400 empty nombre; success trims.
7. `deleteTask` → **404** unknown; 400 when executions exist; success when clean.
8. `scheduleExecution` → 400 missing plan_id/técnico/fecha (exact strings); **404** unknown plan; 400 unknown tech; 400 consultor-role tech; 400 bad date format; 400 plan with zero tasks; success with N tasks → `data.scheduled === N` and N `pm_executions` rows all `resultado: 'pendiente'`, correct `ejecutado_por`/`fecha_programada`.
9. `completeExecution` → **404** unknown; 400 `pendiente`? NO — `pendiente` completes fine; 400 `Esta ejecución ya fue procesada` when `resultado` already `'completado'` (seed); 400 `Resultado no válido` for `'pendiente'`/garbage input; success sets `fecha_ejecucion`, `resultado`, trimmed `observaciones`.

## Route test coverage

None exists for mantenimiento — `src/routes/mantenimiento/` has no `crud.test.ts` (this is the highest-risk work unit; its new service tests + the full 139-suite gate are the safety net).
