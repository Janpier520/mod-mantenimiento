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
import { VALID_PM_RESULTS } from '$lib/server/state-machines';

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
		if (locals.user.rol === 'consultor') {
			return fail(403, { error: 'Los consultores no pueden modificar mantenimiento', _action: 'create_plan' });
		}
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

		// Validate equipment exists if provided
		if (equipo_id) {
			const equip = await db.query.equipment.findFirst({ where: eq(equipment.id, equipo_id) });
			if (!equip) return fail(400, { error: 'Equipo no encontrado', _action: 'create_plan' });
		}
		if (tipo_equipo_id) {
			const tipo = await db.query.equipment_types.findFirst({
				where: eq(equipment_types.id, tipo_equipo_id)
			});
			if (!tipo)
				return fail(400, { error: 'Tipo de equipo no encontrado', _action: 'create_plan' });
		}

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
		if (locals.user.rol === 'consultor') {
			return fail(403, { error: 'Los consultores no pueden modificar mantenimiento', _action: 'update_plan' });
		}
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

		// Entity existence check
		const existingPlan = await db.query.preventive_maintenance_plans.findFirst({
			where: eq(preventive_maintenance_plans.id, id)
		});
		if (!existingPlan) return fail(404, { error: 'Plan no encontrado', _action: 'update_plan' });

		// Validate equipment exists if provided
		if (equipo_id) {
			const equip = await db.query.equipment.findFirst({ where: eq(equipment.id, equipo_id) });
			if (!equip) return fail(400, { error: 'Equipo no encontrado', _action: 'update_plan' });
		}
		if (tipo_equipo_id) {
			const tipo = await db.query.equipment_types.findFirst({
				where: eq(equipment_types.id, tipo_equipo_id)
			});
			if (!tipo)
				return fail(400, { error: 'Tipo de equipo no encontrado', _action: 'update_plan' });
		}

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
		if (locals.user.rol === 'consultor') {
			return fail(403, { error: 'Los consultores no pueden modificar mantenimiento', _action: 'delete_plan' });
		}
		const form = await request.formData();
		const id = (form.get('id') as string) ?? '';

		if (!id) return fail(400, { error: 'ID de plan no proporcionado', _action: 'delete_plan' });

		const existingPlan = await db.query.preventive_maintenance_plans.findFirst({
			where: eq(preventive_maintenance_plans.id, id)
		});
		if (!existingPlan) return fail(404, { error: 'Plan no encontrado', _action: 'delete_plan' });

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
		if (locals.user.rol === 'consultor') {
			return fail(403, { error: 'Los consultores no pueden modificar mantenimiento', _action: 'add_task' });
		}
		const form = await request.formData();
		const plan_id = (form.get('plan_id') as string) ?? '';
		const nombre = (form.get('nombre') as string) ?? '';
		const descripcion = (form.get('descripcion') as string) ?? '';

		if (!plan_id) return fail(400, { error: 'ID de plan no proporcionado', _action: 'add_task' });

		const planExists = await db.query.preventive_maintenance_plans.findFirst({
			where: eq(preventive_maintenance_plans.id, plan_id)
		});
		if (!planExists) return fail(404, { error: 'Plan no encontrado', _action: 'add_task' });

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
		if (locals.user.rol === 'consultor') {
			return fail(403, { error: 'Los consultores no pueden modificar mantenimiento', _action: 'update_task' });
		}
		const form = await request.formData();
		const id = (form.get('id') as string) ?? '';
		const nombre = (form.get('nombre') as string) ?? '';
		const descripcion = (form.get('descripcion') as string) ?? '';

		if (!id) return fail(400, { error: 'ID de tarea no proporcionado', _action: 'update_task' });

		const existingTask = await db.query.pm_tasks.findFirst({ where: eq(pm_tasks.id, id) });
		if (!existingTask) return fail(404, { error: 'Tarea no encontrada', _action: 'update_task' });

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
		if (locals.user.rol === 'consultor') {
			return fail(403, { error: 'Los consultores no pueden modificar mantenimiento', _action: 'delete_task' });
		}
		const form = await request.formData();
		const id = (form.get('id') as string) ?? '';

		if (!id) return fail(400, { error: 'ID de tarea no proporcionado', _action: 'delete_task' });

		const existingTask = await db.query.pm_tasks.findFirst({ where: eq(pm_tasks.id, id) });
		if (!existingTask) return fail(404, { error: 'Tarea no encontrada', _action: 'delete_task' });

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
		if (locals.user.rol === 'consultor') {
			return fail(403, { error: 'Los consultores no pueden modificar mantenimiento', _action: 'schedule_execution' });
		}
		const form = await request.formData();
		const plan_id = (form.get('plan_id') as string) ?? '';
		const ejecutado_por = (form.get('ejecutado_por') as string) ?? '';
		const fecha_programada = (form.get('fecha_programada') as string) ?? '';

		if (!plan_id)
			return fail(400, { error: 'ID de plan no proporcionado', _action: 'schedule_execution' });
		if (!ejecutado_por)
			return fail(400, { error: 'Selecciona un técnico', _action: 'schedule_execution' });
		if (!fecha_programada)
			return fail(400, { error: 'Selecciona una fecha programada', _action: 'schedule_execution' });

		// Validate plan exists
		const planExists = await db.query.preventive_maintenance_plans.findFirst({
			where: eq(preventive_maintenance_plans.id, plan_id)
		});
		if (!planExists)
			return fail(404, { error: 'Plan no encontrado', _action: 'schedule_execution' });

		// Validate technician exists and has tech/admin role
		const tech = await db.query.users.findFirst({ where: eq(users.id, ejecutado_por) });
		if (!tech) return fail(400, { error: 'Técnico no encontrado', _action: 'schedule_execution' });
		if (tech.rol !== 'tecnico' && tech.rol !== 'admin') {
			return fail(400, {
				error: 'El usuario seleccionado no es técnico ni administrador',
				_action: 'schedule_execution'
			});
		}

		// Validate date format (YYYY-MM-DD)
		if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_programada)) {
			return fail(400, {
				error: 'Formato de fecha no válido (usa YYYY-MM-DD)',
				_action: 'schedule_execution'
			});
		}

		const tasks = await db.query.pm_tasks.findMany({
			where: eq(pm_tasks.plan_id, plan_id)
		});

		if (tasks.length === 0) {
			return fail(400, {
				error: 'El plan no tiene tareas. Agrega tareas primero.',
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
		if (locals.user.rol === 'consultor') {
			return fail(403, { error: 'Los consultores no pueden modificar mantenimiento', _action: 'complete_execution' });
		}
		const form = await request.formData();
		const id = (form.get('id') as string) ?? '';
		const resultado = (form.get('resultado') as string) ?? '';
		const observaciones = (form.get('observaciones') as string) ?? '';

		if (!id)
			return fail(400, {
				error: 'ID de ejecución no proporcionado',
				_action: 'complete_execution'
			});

		// Entity existence check
		const execution = await db.query.pm_executions.findFirst({ where: eq(pm_executions.id, id) });
		if (!execution)
			return fail(404, { error: 'Ejecución no encontrada', _action: 'complete_execution' });

		// Can't complete an already completed execution
		if (execution.resultado !== 'pendiente') {
			return fail(400, {
				error: 'Esta ejecución ya fue procesada',
				_action: 'complete_execution'
			});
		}

		// Validate resultado enum
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
