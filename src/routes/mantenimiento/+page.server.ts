import { db } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireAuth } from '$lib/server/auth';
import {
	createPlan,
	updatePlan,
	deletePlan,
	addTask,
	updateTask,
	deleteTask,
	scheduleExecution,
	completeExecution
} from '$lib/server/services/mantenimiento';

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
		orderBy: (users, { asc }) => [asc(users.nombre)],
		columns: { id: true, nombre: true, apellido: true, email: true, rol: true }
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

	update_plan: async ({ request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const res = await updatePlan(
			{
				id: (form.get('id') as string) ?? '',
				nombre: (form.get('nombre') as string) ?? '',
				descripcion: (form.get('descripcion') as string) ?? '',
				frecuencia_dias: Number(form.get('frecuencia_dias')),
				equipo_id: (form.get('equipo_id') as string) ?? '',
				tipo_equipo_id: (form.get('tipo_equipo_id') as string) ?? ''
			},
			{ id: locals.user.id, rol: locals.user.rol }
		);
		if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action: 'update_plan' });
		return { success: true, _action: 'update_plan' };
	},

	delete_plan: async ({ request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const res = await deletePlan(
			{ id: (form.get('id') as string) ?? '' },
			{ id: locals.user.id, rol: locals.user.rol }
		);
		if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action: 'delete_plan' });
		return { success: true, _action: 'delete_plan' };
	},

	add_task: async ({ request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const res = await addTask(
			{
				plan_id: (form.get('plan_id') as string) ?? '',
				nombre: (form.get('nombre') as string) ?? '',
				descripcion: (form.get('descripcion') as string) ?? ''
			},
			{ id: locals.user.id, rol: locals.user.rol }
		);
		if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action: 'add_task' });
		return { success: true, _action: 'add_task' };
	},

	update_task: async ({ request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const res = await updateTask(
			{
				id: (form.get('id') as string) ?? '',
				nombre: (form.get('nombre') as string) ?? '',
				descripcion: (form.get('descripcion') as string) ?? ''
			},
			{ id: locals.user.id, rol: locals.user.rol }
		);
		if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action: 'update_task' });
		return { success: true, _action: 'update_task' };
	},

	delete_task: async ({ request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const res = await deleteTask(
			{ id: (form.get('id') as string) ?? '' },
			{ id: locals.user.id, rol: locals.user.rol }
		);
		if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action: 'delete_task' });
		return { success: true, _action: 'delete_task' };
	},

	schedule_execution: async ({ request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const res = await scheduleExecution(
			{
				plan_id: (form.get('plan_id') as string) ?? '',
				ejecutado_por: (form.get('ejecutado_por') as string) ?? '',
				fecha_programada: (form.get('fecha_programada') as string) ?? ''
			},
			{ id: locals.user.id, rol: locals.user.rol }
		);
		if (!res.ok)
			return fail(res.status ?? 400, { error: res.error, _action: 'schedule_execution' });
		return { success: true, _action: 'schedule_execution' };
	},

	complete_execution: async ({ request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const res = await completeExecution(
			{
				id: (form.get('id') as string) ?? '',
				resultado: (form.get('resultado') as string) ?? '',
				observaciones: (form.get('observaciones') as string) ?? ''
			},
			{ id: locals.user.id, rol: locals.user.rol }
		);
		if (!res.ok)
			return fail(res.status ?? 400, { error: res.error, _action: 'complete_execution' });
		return { success: true, _action: 'complete_execution' };
	}
};
