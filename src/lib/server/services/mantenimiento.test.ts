import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '$lib/server/db';
import { initTestDb, type SeedIds } from '$lib/server/db/test-helpers';
import { preventive_maintenance_plans, pm_tasks, pm_executions } from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';
import { addDaysToDate } from '$lib/server/dates';
import {
	createPlan,
	updatePlan,
	deletePlan,
	addTask,
	updateTask,
	deleteTask,
	scheduleExecution,
	completeExecution
} from './mantenimiento';
import type { Actor } from './types';

let ids: SeedIds;

function adminActor(): Actor {
	return { id: ids.adminId, rol: 'admin' };
}
function consultorActor(): Actor {
	return { id: ids.consultorId, rol: 'consultor' };
}

function planInput() {
	return {
		nombre: 'Plan SVC',
		descripcion: 'Mantenimiento de prueba',
		frecuencia_dias: 30,
		equipo_id: ids.eqOperativoId,
		tipo_equipo_id: ids.tipoPcId
	};
}

async function insertPlan(nombre = 'Plan Directo') {
	const [row] = await db
		.insert(preventive_maintenance_plans)
		.values({ nombre })
		.returning({ id: preventive_maintenance_plans.id });
	return row.id;
}

async function insertTask(planId: string, nombre = 'Tarea Directa') {
	const [row] = await db
		.insert(pm_tasks)
		.values({ plan_id: planId, nombre })
		.returning({ id: pm_tasks.id });
	return row.id;
}

async function insertExecution(
	planId: string,
	taskId: string,
	resultado: 'pendiente' | 'completado',
	fecha = '2026-08-01'
) {
	const [row] = await db
		.insert(pm_executions)
		.values({
			plan_id: planId,
			tarea_id: taskId,
			ejecutado_por: ids.tecnicoId,
			fecha_programada: fecha,
			resultado
		})
		.returning({ id: pm_executions.id });
	return row.id;
}

describe('mantenimiento service', () => {
	beforeAll(async () => {
		ids = await initTestDb();
	});

	it('rejects every operation for consultors with 403 and writes nothing', async () => {
		const before = await db.select({ cnt: count() }).from(preventive_maintenance_plans);

		const guardResults = [
			await createPlan(planInput(), consultorActor()),
			await updatePlan({ ...planInput(), id: 'x' }, consultorActor()),
			await deletePlan({ id: 'x' }, consultorActor()),
			await addTask({ plan_id: 'x', nombre: 'T', descripcion: '' }, consultorActor()),
			await updateTask({ id: 'x', nombre: 'T', descripcion: '' }, consultorActor()),
			await deleteTask({ id: 'x' }, consultorActor()),
			await scheduleExecution(
				{ plan_id: 'x', ejecutado_por: 'y', fecha_programada: '2026-08-01' },
				consultorActor()
			),
			await completeExecution(
				{ id: 'x', resultado: 'completado', observaciones: '' },
				consultorActor()
			)
		];

		for (const res of guardResults) {
			expect(res).toEqual({
				ok: false,
				error: 'Los consultores no pueden modificar mantenimiento',
				status: 403
			});
		}

		const after = await db.select({ cnt: count() }).from(preventive_maintenance_plans);
		expect(after[0].cnt).toBe(before[0].cnt);
	});

	it('creates a plan trimming values and validating nombre/frecuencia/equipo/tipo', async () => {
		const res = await createPlan(
			{ ...planInput(), nombre: '  Plan SVC  ', descripcion: '  desc  ' },
			adminActor()
		);
		expect(res.ok).toBe(true);
		const row = await db.query.preventive_maintenance_plans.findFirst({
			where: eq(preventive_maintenance_plans.id, res.ok ? res.data.id : '')
		});
		expect(row?.nombre).toBe('Plan SVC');
		expect(row?.descripcion).toBe('desc');
		expect(row?.frecuencia_dias).toBe(30);
		expect(row?.equipo_id).toBe(ids.eqOperativoId);
		expect(row?.tipo_equipo_id).toBe(ids.tipoPcId);

		expect(await createPlan({ ...planInput(), nombre: '' }, adminActor())).toEqual({
			ok: false,
			error: 'El nombre del plan es obligatorio',
			status: 400
		});
		expect(await createPlan({ ...planInput(), frecuencia_dias: 0 }, adminActor())).toEqual({
			ok: false,
			error: 'La frecuencia debe ser mayor a 0 días',
			status: 400
		});
		expect(await createPlan({ ...planInput(), equipo_id: 'no-existe' }, adminActor())).toEqual({
			ok: false,
			error: 'Equipo no encontrado',
			status: 400
		});
		expect(await createPlan({ ...planInput(), tipo_equipo_id: 'no-existe' }, adminActor())).toEqual(
			{
				ok: false,
				error: 'Tipo de equipo no encontrado',
				status: 400
			}
		);
	});

	it('updates a plan trimming values with id/existence/equipo validations', async () => {
		const planId = await insertPlan();

		expect(await updatePlan({ ...planInput(), id: '' }, adminActor())).toEqual({
			ok: false,
			error: 'ID de plan no proporcionado',
			status: 400
		});

		expect(await updatePlan({ ...planInput(), id: 'no-existe' }, adminActor())).toEqual({
			ok: false,
			error: 'Plan no encontrado',
			status: 404
		});

		expect(
			await updatePlan({ ...planInput(), id: planId, equipo_id: 'no-existe' }, adminActor())
		).toEqual({ ok: false, error: 'Equipo no encontrado', status: 400 });

		const res = await updatePlan(
			{ ...planInput(), id: planId, nombre: '  Renombrado  ', descripcion: '  nueva  ' },
			adminActor()
		);
		expect(res.ok).toBe(true);
		const row = await db.query.preventive_maintenance_plans.findFirst({
			where: eq(preventive_maintenance_plans.id, planId)
		});
		expect(row?.nombre).toBe('Renombrado');
		expect(row?.descripcion).toBe('nueva');
	});

	it('deletes a plan only when it has no executions', async () => {
		expect(await deletePlan({ id: 'no-existe' }, adminActor())).toEqual({
			ok: false,
			error: 'Plan no encontrado',
			status: 404
		});

		const busyPlanId = await insertPlan('Plan con ejecuciones');
		const taskId = await insertTask(busyPlanId);
		await insertExecution(busyPlanId, taskId, 'pendiente');
		const blocked = await deletePlan({ id: busyPlanId }, adminActor());
		expect(blocked.ok).toBe(false);
		if (blocked.ok) return;
		expect(blocked.status).toBe(400);
		expect(blocked.error).toBe(
			'El plan tiene 1 ejecuciones registradas. Eliminalas primero o reagendalas.'
		);

		const cleanPlanId = await insertPlan('Plan limpio');
		const res = await deletePlan({ id: cleanPlanId }, adminActor());
		expect(res).toEqual({ ok: true, data: { id: cleanPlanId } });
		const row = await db.query.preventive_maintenance_plans.findFirst({
			where: eq(preventive_maintenance_plans.id, cleanPlanId)
		});
		expect(row).toBeUndefined();
	});

	it('adds tasks with per-plan orden sequencing independent across plans', async () => {
		expect(
			await addTask({ plan_id: 'no-existe', nombre: 'T', descripcion: '' }, adminActor())
		).toEqual({ ok: false, error: 'Plan no encontrado', status: 404 });

		const planId = await insertPlan('Plan orden');
		expect(await addTask({ plan_id: planId, nombre: '', descripcion: '' }, adminActor())).toEqual({
			ok: false,
			error: 'El nombre de la tarea es obligatorio',
			status: 400
		});

		const t1 = await addTask({ plan_id: planId, nombre: 'A', descripcion: '' }, adminActor());
		const t2 = await addTask({ plan_id: planId, nombre: 'B', descripcion: '' }, adminActor());
		expect(t1).toEqual({ ok: true, data: { id: expect.any(String), orden: 1 } });
		expect(t2).toEqual({ ok: true, data: { id: expect.any(String), orden: 2 } });

		const otherPlanId = await insertPlan('Plan B');
		const other = await addTask(
			{ plan_id: otherPlanId, nombre: 'X', descripcion: '' },
			adminActor()
		);
		expect(other).toEqual({ ok: true, data: { id: expect.any(String), orden: 1 } });
	});

	it('updates a task trimming values', async () => {
		const planId = await insertPlan('Plan update task');
		const taskId = await insertTask(planId);

		expect(
			await updateTask({ id: 'no-existe', nombre: 'T', descripcion: '' }, adminActor())
		).toEqual({ ok: false, error: 'Tarea no encontrada', status: 404 });
		expect(await updateTask({ id: taskId, nombre: '', descripcion: '' }, adminActor())).toEqual({
			ok: false,
			error: 'El nombre de la tarea es obligatorio',
			status: 400
		});

		const res = await updateTask(
			{ id: taskId, nombre: '  Nueva  ', descripcion: '  detalle  ' },
			adminActor()
		);
		expect(res.ok).toBe(true);
		const row = await db.query.pm_tasks.findFirst({ where: eq(pm_tasks.id, taskId) });
		expect(row?.nombre).toBe('Nueva');
		expect(row?.descripcion).toBe('detalle');
	});

	it('deletes a task only when it has no executions', async () => {
		expect(await deleteTask({ id: 'no-existe' }, adminActor())).toEqual({
			ok: false,
			error: 'Tarea no encontrada',
			status: 404
		});

		const planId = await insertPlan('Plan delete task');
		const busyTaskId = await insertTask(planId, 'Tarea ocupada');
		await insertExecution(planId, busyTaskId, 'pendiente');
		const blocked = await deleteTask({ id: busyTaskId }, adminActor());
		expect(blocked.ok).toBe(false);
		if (blocked.ok) return;
		expect(blocked.status).toBe(400);
		expect(blocked.error).toBe('La tarea tiene 1 ejecuciones registradas. Eliminalas primero.');

		const cleanTaskId = await insertTask(planId, 'Tarea limpia');
		const res = await deleteTask({ id: cleanTaskId }, adminActor());
		expect(res.ok).toBe(true);
		const row = await db.query.pm_tasks.findFirst({ where: eq(pm_tasks.id, cleanTaskId) });
		expect(row).toBeUndefined();
	});

	it('schedules one execution per task with pendiente state', async () => {
		const planId = await insertPlan('Plan schedule');

		expect(
			await scheduleExecution(
				{ plan_id: '', ejecutado_por: ids.tecnicoId, fecha_programada: '2026-08-15' },
				adminActor()
			)
		).toEqual({ ok: false, error: 'ID de plan no proporcionado', status: 400 });

		expect(
			await scheduleExecution(
				{ plan_id: planId, ejecutado_por: '', fecha_programada: '2026-08-15' },
				adminActor()
			)
		).toEqual({ ok: false, error: 'Selecciona un técnico', status: 400 });

		expect(
			await scheduleExecution(
				{ plan_id: planId, ejecutado_por: ids.tecnicoId, fecha_programada: '' },
				adminActor()
			)
		).toEqual({ ok: false, error: 'Selecciona una fecha programada', status: 400 });

		expect(
			await scheduleExecution(
				{ plan_id: 'no-existe', ejecutado_por: ids.tecnicoId, fecha_programada: '2026-08-15' },
				adminActor()
			)
		).toEqual({ ok: false, error: 'Plan no encontrado', status: 404 });

		expect(
			await scheduleExecution(
				{ plan_id: planId, ejecutado_por: 'no-existe', fecha_programada: '2026-08-15' },
				adminActor()
			)
		).toEqual({ ok: false, error: 'Técnico no encontrado', status: 400 });

		expect(
			await scheduleExecution(
				{ plan_id: planId, ejecutado_por: ids.consultorId, fecha_programada: '2026-08-15' },
				adminActor()
			)
		).toEqual({
			ok: false,
			error: 'El usuario seleccionado no es técnico ni administrador',
			status: 400
		});

		expect(
			await scheduleExecution(
				{ plan_id: planId, ejecutado_por: ids.tecnicoId, fecha_programada: '15/08/2026' },
				adminActor()
			)
		).toEqual({
			ok: false,
			error: 'Formato de fecha no válido (usa YYYY-MM-DD)',
			status: 400
		});

		expect(
			await scheduleExecution(
				{ plan_id: planId, ejecutado_por: ids.tecnicoId, fecha_programada: '2026-08-15' },
				adminActor()
			)
		).toEqual({
			ok: false,
			error: 'El plan no tiene tareas. Agrega tareas primero.',
			status: 400
		});

		await insertTask(planId, 'Tarea 1');
		await insertTask(planId, 'Tarea 2');

		const res = await scheduleExecution(
			{ plan_id: planId, ejecutado_por: ids.tecnicoId, fecha_programada: '2026-08-15' },
			adminActor()
		);
		expect(res).toEqual({ ok: true, data: { scheduled: 2 } });

		const execs = await db.query.pm_executions.findMany({
			where: eq(pm_executions.plan_id, planId)
		});
		expect(execs).toHaveLength(2);
		for (const exec of execs) {
			expect(exec.resultado).toBe('pendiente');
			expect(exec.ejecutado_por).toBe(ids.tecnicoId);
			expect(exec.fecha_programada).toBe('2026-08-15');
		}
	});

	it('completes a pending execution validating estado and resultado', async () => {
		const planId = await insertPlan('Plan complete');
		const taskId = await insertTask(planId);
		const execId = await insertExecution(planId, taskId, 'pendiente');

		expect(
			await completeExecution(
				{ id: 'no-existe', resultado: 'completado', observaciones: '' },
				adminActor()
			)
		).toEqual({ ok: false, error: 'Ejecución no encontrada', status: 404 });

		expect(
			await completeExecution(
				{ id: execId, resultado: 'pendiente', observaciones: '' },
				adminActor()
			)
		).toEqual({ ok: false, error: 'Resultado no válido', status: 400 });

		expect(
			await completeExecution({ id: execId, resultado: 'raro', observaciones: '' }, adminActor())
		).toEqual({ ok: false, error: 'Resultado no válido', status: 400 });

		const res = await completeExecution(
			{ id: execId, resultado: 'completado', observaciones: '  ok  ' },
			adminActor()
		);
		expect(res).toEqual({ ok: true, data: { id: execId } });

		const row = await db.query.pm_executions.findFirst({ where: eq(pm_executions.id, execId) });
		expect(row?.resultado).toBe('completado');
		expect(row?.observaciones).toBe('ok');
		expect(row?.fecha_ejecucion).toBeTruthy();

		expect(
			await completeExecution({ id: execId, resultado: 'fallido', observaciones: '' }, adminActor())
		).toEqual({ ok: false, error: 'Esta ejecución ya fue procesada', status: 400 });
	});

	it('auto-creates the next pendiente execution on completion (fecha + frecuencia_dias)', async () => {
		const planId = await insertPlan('Plan auto');
		const taskId = await insertTask(planId);
		const execId = await insertExecution(planId, taskId, 'pendiente', '2026-08-01');

		const res = await completeExecution(
			{ id: execId, resultado: 'completado', observaciones: '' },
			adminActor()
		);
		expect(res).toEqual({ ok: true, data: { id: execId } });

		const execs = await db.query.pm_executions.findMany({
			where: eq(pm_executions.plan_id, planId),
			orderBy: (e, { asc }) => [asc(e.fecha_programada)]
		});
		expect(execs).toHaveLength(2);
		const next = execs.find((e) => e.resultado === 'pendiente');
		expect(next?.tarea_id).toBe(taskId);
		expect(next?.plan_id).toBe(planId);
		expect(next?.fecha_programada).toBe(addDaysToDate('2026-08-01', 30));
		expect(next?.ejecutado_por).toBe(ids.tecnicoId);
	});

	it('does not duplicate the next execution when one already exists for that date', async () => {
		const planId = await insertPlan('Plan no dup');
		const taskId = await insertTask(planId);
		const execId = await insertExecution(planId, taskId, 'pendiente', '2026-08-01');
		await insertExecution(planId, taskId, 'pendiente', addDaysToDate('2026-08-01', 30));

		const res = await completeExecution(
			{ id: execId, resultado: 'completado', observaciones: '' },
			adminActor()
		);
		expect(res).toEqual({ ok: true, data: { id: execId } });

		const [cnt] = await db
			.select({ cnt: count() })
			.from(pm_executions)
			.where(eq(pm_executions.plan_id, planId));
		expect(cnt.cnt).toBe(2);
	});

	it('auto-creates the next pendiente execution when the result is fallido', async () => {
		const planId = await insertPlan('Plan fallido auto');
		const taskId = await insertTask(planId);
		const execId = await insertExecution(planId, taskId, 'pendiente', '2026-08-01');

		const res = await completeExecution(
			{ id: execId, resultado: 'fallido', observaciones: 'sin repuesto' },
			adminActor()
		);
		expect(res).toEqual({ ok: true, data: { id: execId } });

		const execs = await db.query.pm_executions.findMany({
			where: eq(pm_executions.plan_id, planId)
		});
		expect(execs).toHaveLength(2);
		const next = execs.find((e) => e.resultado === 'pendiente');
		expect(next?.tarea_id).toBe(taskId);
		expect(next?.fecha_programada).toBe(addDaysToDate('2026-08-01', 30));
		expect(next?.ejecutado_por).toBe(ids.tecnicoId);
	});

	it('auto-creates the next pendiente execution when the result is omitido', async () => {
		const planId = await insertPlan('Plan omitido auto');
		const taskId = await insertTask(planId);
		const execId = await insertExecution(planId, taskId, 'pendiente', '2026-08-01');

		const res = await completeExecution(
			{ id: execId, resultado: 'omitido', observaciones: 'sin acceso al equipo' },
			adminActor()
		);
		expect(res).toEqual({ ok: true, data: { id: execId } });

		const execs = await db.query.pm_executions.findMany({
			where: eq(pm_executions.plan_id, planId)
		});
		expect(execs).toHaveLength(2);
		const next = execs.find((e) => e.resultado === 'pendiente');
		expect(next?.fecha_programada).toBe(addDaysToDate('2026-08-01', 30));
	});

	it('does not duplicate the next execution on fallido when a pendiente already exists', async () => {
		const planId = await insertPlan('Plan fallido no dup');
		const taskId = await insertTask(planId);
		const execId = await insertExecution(planId, taskId, 'pendiente', '2026-08-01');
		await insertExecution(planId, taskId, 'pendiente', addDaysToDate('2026-08-01', 30));

		const res = await completeExecution(
			{ id: execId, resultado: 'fallido', observaciones: '' },
			adminActor()
		);
		expect(res).toEqual({ ok: true, data: { id: execId } });

		const [cnt] = await db
			.select({ cnt: count() })
			.from(pm_executions)
			.where(eq(pm_executions.plan_id, planId));
		expect(cnt.cnt).toBe(2);
	});
});
