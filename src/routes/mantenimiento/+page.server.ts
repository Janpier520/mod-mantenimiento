import { db } from '$lib/server/db';
import {
	preventive_maintenance_plans,
	pm_tasks,
	pm_executions,
	equipment,
	equipment_types,
	users
} from '$lib/server/db/schema';
import { eq, count, sql, asc } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireAuth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { plans: [], equipment: [], equipmentTypes: [], technicians: [] };
	}

	const plans = await db.query.preventive_maintenance_plans.findMany({
		with: {
			tareas: {
				orderBy: (tasks, { asc }) => [asc(tasks.orden)]
			},
			equipo: true,
			tipo_equipo: true,
			ejecuciones: {
				orderBy: (execs, { desc }) => [desc(execs.fecha_programada)]
			}
		},
		orderBy: (plans, { asc }) => [asc(plans.nombre)]
	});

	const equipmentList = await db.query.equipment.findMany({
		orderBy: (eq, { asc }) => [asc(eq.modelo)]
	});

	const equipmentTypesList = await db.query.equipment_types.findMany({
		orderBy: (et, { asc }) => [asc(et.nombre)]
	});

	const technicians = await db.query.users.findMany({
		where: (users, { or, eq }) => or(eq(users.rol, 'tecnico'), eq(users.rol, 'admin')),
		orderBy: (users, { asc }) => [asc(users.nombre)]
	});

	return {
		plans,
		equipment: equipmentList,
		equipmentTypes: equipmentTypesList,
		technicians
	};
};

export const actions: Actions = {
	create_plan: async ({ request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const nombre = (form.get('nombre') as string) ?? '';
		const descripcion = (form.get('descripcion') as string) ?? '';
		const frecuencia_dias = Number(form.get('frecuencia_dias'));
		const equipo_id = (form.get('equipo_id') as string) ?? '';
		const tipo_equipo_id = (form.get('tipo_equipo_id') as string) ?? '';

		if (!nombre.trim())
			return fail(400, { error: 'El nombre del plan es obligatorio', _action: 'create_plan' });
		if (!frecuencia_dias || frecuencia_dias < 1)
			return fail(400, { error: 'La frecuencia debe ser mayor a 0 días', _action: 'create_plan' });

		await db.insert(preventive_maintenance_plans).values({
			nombre: nombre.trim(),
			descripcion: descripcion.trim(),
			frecuencia_dias,
			equipo_id: equipo_id || null,
			tipo_equipo_id: tipo_equipo_id || null
		});

		return { success: true, _action: 'create_plan' };
	},

	update_plan: async ({ request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const id = (form.get('id') as string) ?? '';
		const nombre = (form.get('nombre') as string) ?? '';
		const descripcion = (form.get('descripcion') as string) ?? '';
		const frecuencia_dias = Number(form.get('frecuencia_dias'));
		const equipo_id = (form.get('equipo_id') as string) ?? '';
		const tipo_equipo_id = (form.get('tipo_equipo_id') as string) ?? '';

		if (!id) return fail(400, { error: 'ID de plan no proporcionado', _action: 'update_plan' });
		if (!nombre.trim())
			return fail(400, { error: 'El nombre del plan es obligatorio', _action: 'update_plan' });
		if (!frecuencia_dias || frecuencia_dias < 1)
			return fail(400, { error: 'La frecuencia debe ser mayor a 0 días', _action: 'update_plan' });

		await db
			.update(preventive_maintenance_plans)
			.set({
				nombre: nombre.trim(),
				descripcion: descripcion.trim(),
				frecuencia_dias,
				equipo_id: equipo_id || null,
				tipo_equipo_id: tipo_equipo_id || null,
				updated_at: new Date().toISOString()
			})
			.where(eq(preventive_maintenance_plans.id, id));

		return { success: true, _action: 'update_plan' };
	},

	delete_plan: async ({ request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const id = (form.get('id') as string) ?? '';

		if (!id) return fail(400, { error: 'ID de plan no proporcionado', _action: 'delete_plan' });

		const [execCount] = await db
			.select({ cnt: count() })
			.from(pm_executions)
			.where(eq(pm_executions.plan_id, id));

		if (execCount.cnt > 0) {
			return fail(400, {
				error: `El plan tiene ${execCount.cnt} ejecuciones registradas. Eliminalas primero o reagendalas.`,
				_action: 'delete_plan'
			});
		}

		await db.delete(preventive_maintenance_plans).where(eq(preventive_maintenance_plans.id, id));
		return { success: true, _action: 'delete_plan' };
	},

	add_task: async ({ request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const plan_id = (form.get('plan_id') as string) ?? '';
		const nombre = (form.get('nombre') as string) ?? '';
		const descripcion = (form.get('descripcion') as string) ?? '';

		if (!plan_id) return fail(400, { error: 'ID de plan no proporcionado', _action: 'add_task' });
		if (!nombre.trim())
			return fail(400, { error: 'El nombre de la tarea es obligatorio', _action: 'add_task' });

		const [maxOrden] = await db
			.select({ max: sql<number>`COALESCE(MAX(${pm_tasks.orden}), 0)` })
			.from(pm_tasks)
			.where(eq(pm_tasks.plan_id, plan_id));

		await db.insert(pm_tasks).values({
			plan_id,
			nombre: nombre.trim(),
			descripcion: descripcion.trim(),
			orden: (maxOrden?.max ?? 0) + 1
		});

		return { success: true, _action: 'add_task' };
	},

	update_task: async ({ request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const id = (form.get('id') as string) ?? '';
		const nombre = (form.get('nombre') as string) ?? '';
		const descripcion = (form.get('descripcion') as string) ?? '';

		if (!id) return fail(400, { error: 'ID de tarea no proporcionado', _action: 'update_task' });
		if (!nombre.trim())
			return fail(400, { error: 'El nombre de la tarea es obligatorio', _action: 'update_task' });

		await db
			.update(pm_tasks)
			.set({ nombre: nombre.trim(), descripcion: descripcion.trim() })
			.where(eq(pm_tasks.id, id));

		return { success: true, _action: 'update_task' };
	},

	delete_task: async ({ request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const id = (form.get('id') as string) ?? '';

		if (!id) return fail(400, { error: 'ID de tarea no proporcionado', _action: 'delete_task' });

		const [execCount] = await db
			.select({ cnt: count() })
			.from(pm_executions)
			.where(eq(pm_executions.tarea_id, id));

		if (execCount.cnt > 0) {
			return fail(400, {
				error: `La tarea tiene ${execCount.cnt} ejecuciones registradas. Eliminalas primero.`,
				_action: 'delete_task'
			});
		}

		await db.delete(pm_tasks).where(eq(pm_tasks.id, id));
		return { success: true, _action: 'delete_task' };
	},

	schedule_execution: async ({ request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const plan_id = (form.get('plan_id') as string) ?? '';
		const ejecutado_por = (form.get('ejecutado_por') as string) ?? '';
		const fecha_programada = (form.get('fecha_programada') as string) ?? '';

		if (!plan_id)
			return fail(400, { error: 'ID de plan no proporcionado', _action: 'schedule_execution' });
		if (!ejecutado_por)
			return fail(400, { error: 'Seleccioná un técnico', _action: 'schedule_execution' });
		if (!fecha_programada)
			return fail(400, { error: 'Seleccioná una fecha programada', _action: 'schedule_execution' });

		const tasks = await db.query.pm_tasks.findMany({
			where: eq(pm_tasks.plan_id, plan_id)
		});

		if (tasks.length === 0) {
			return fail(400, {
				error: 'El plan no tiene tareas. Agregá tareas primero.',
				_action: 'schedule_execution'
			});
		}

		await db.insert(pm_executions).values(
			tasks.map((t) => ({
				plan_id,
				tarea_id: t.id,
				ejecutado_por,
				fecha_programada,
				resultado: 'pendiente' as const
			}))
		);

		return { success: true, _action: 'schedule_execution' };
	},

	complete_execution: async ({ request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const id = (form.get('id') as string) ?? '';
		const resultado = (form.get('resultado') as string) ?? '';
		const observaciones = (form.get('observaciones') as string) ?? '';

		if (!id)
			return fail(400, {
				error: 'ID de ejecución no proporcionado',
				_action: 'complete_execution'
			});
		if (!['completado', 'fallido', 'omitido'].includes(resultado)) {
			return fail(400, { error: 'Resultado no válido', _action: 'complete_execution' });
		}

		await db
			.update(pm_executions)
			.set({
				fecha_ejecucion: new Date().toISOString(),
				resultado: resultado as 'completado' | 'fallido' | 'omitido',
				observaciones: observaciones.trim()
			})
			.where(eq(pm_executions.id, id));

		return { success: true, _action: 'complete_execution' };
	}
};
