import { describe, it, expect, beforeAll } from 'vitest';
import type { RequestEvent } from './$types';
import { actions } from './+page.server';
import { db } from '$lib/server/db';
import { initTestDb, type SeedIds } from '$lib/server/db/test-helpers';
import {
	users,
	tickets,
	preventive_maintenance_plans,
	pm_tasks,
	pm_executions
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// TC-9: usuarios crud action — validation aggregation, duplicates with
// excludeUserId, last-admin protection, self-delete, referential guards.

let ids: SeedIds;

function buildFormData(fields: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.set(k, v);
	return fd;
}

function userLocals(user: NonNullable<App.Locals['user']>): App.Locals {
	return { user };
}

function adminLocals(): App.Locals {
	return userLocals({
		id: ids.adminId,
		username: 'admin',
		nombre: 'Admin',
		apellido: 'Sistema',
		email: 'admin@overhaul.test',
		rol: 'admin'
	});
}

function tecnicoLocals(): App.Locals {
	return userLocals({
		id: ids.tecnicoId,
		username: 'tecnico1',
		nombre: 'Carlos',
		apellido: 'Méndez',
		email: 'tecnico@overhaul.test',
		rol: 'tecnico'
	});
}

interface CrudOutcome {
	status?: number;
	data?: { error?: string; _action?: string };
	success?: boolean;
}

async function invokeCrud(
	locals: App.Locals,
	fields: Record<string, string>
): Promise<CrudOutcome> {
	const request = new Request('http://localhost/test', {
		method: 'POST',
		body: buildFormData(fields)
	});
	return actions.crud({
		request,
		locals
	} as unknown as RequestEvent) as unknown as Promise<CrudOutcome>;
}

const createFields = {
	_action: 'create',
	username: 'nuevo_user',
	email: 'nuevo@overhaul.test',
	nombre: 'Nuevo',
	apellido: 'Usuario',
	password: 'secret123',
	rol: 'tecnico',
	activo: 'on',
	security_question_1: '¿Cuál es tu color favorito?',
	security_answer_1: 'azul',
	security_question_2: '¿En qué ciudad naciste?',
	security_answer_2: 'Rosario'
};

describe('usuarios crud (TC-9)', () => {
	beforeAll(async () => {
		ids = await initTestDb();
	});

	it('throws a 303 redirect to / for non-admin locals (requireRole)', async () => {
		await expect(invokeCrud(tecnicoLocals(), { _action: 'create' })).rejects.toMatchObject({
			status: 303,
			location: '/'
		});
	});

	it('aggregates all validation errors into one joined message', async () => {
		const res = await invokeCrud(adminLocals(), {
			_action: 'create',
			username: '',
			email: '',
			nombre: '',
			apellido: '',
			password: 'abc',
			rol: 'tecnico'
		});
		expect(res.status).toBe(400);
		expect(res.data?.error).toContain('El nombre de usuario es obligatorio');
		expect(res.data?.error).toContain('El email es obligatorio');
		expect(res.data?.error).toContain('El nombre es obligatorio');
		expect(res.data?.error).toContain('El apellido es obligatorio');
		expect(res.data?.error).toContain('La contraseña debe tener al menos 6 caracteres');
	});

	it('creates a new user on valid input', async () => {
		const res = await invokeCrud(adminLocals(), createFields);
		expect(res).toMatchObject({ success: true, _action: 'create' });
		const row = await db.query.users.findFirst({ where: eq(users.username, 'nuevo_user') });
		expect(row).not.toBeUndefined();
		expect(row!.email).toBe('nuevo@overhaul.test');
	});

	it('rejects a duplicate username', async () => {
		const res = await invokeCrud(adminLocals(), { ...createFields, email: 'otro@overhaul.test' });
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('Ya existe un usuario con ese nombre de usuario');
	});

	it('rejects a duplicate email', async () => {
		const res = await invokeCrud(adminLocals(), { ...createFields, username: 'otro_user' });
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('Ya existe un usuario con ese email');
	});

	it('rejects updating a user to another user email (excludeUserId)', async () => {
		const res = await invokeCrud(adminLocals(), {
			_action: 'update',
			id: ids.tecnicoId,
			nombre: 'Carlos',
			apellido: 'Méndez',
			email: 'admin@overhaul.test',
			password: '',
			rol: 'tecnico',
			activo: 'on'
		});
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('Ya existe otro usuario con ese email');
	});

	it('allows updating a user keeping their own email', async () => {
		const res = await invokeCrud(adminLocals(), {
			_action: 'update',
			id: ids.tecnicoId,
			nombre: 'Carlos',
			apellido: 'Méndez',
			email: 'tecnico@overhaul.test',
			password: '',
			rol: 'tecnico',
			activo: 'on'
		});
		expect(res).toMatchObject({ success: true, _action: 'update' });
	});

	it('blocks deactivating the last active admin', async () => {
		const res = await invokeCrud(adminLocals(), {
			_action: 'update',
			id: ids.adminId,
			nombre: 'Admin',
			apellido: 'Sistema',
			email: 'admin@overhaul.test',
			password: '',
			rol: 'admin'
			// no activo field → activo = false
		});
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('No podés desactivar o cambiar el rol del último administrador');
	});

	it('blocks changing the role of the last active admin', async () => {
		const res = await invokeCrud(adminLocals(), {
			_action: 'update',
			id: ids.adminId,
			nombre: 'Admin',
			apellido: 'Sistema',
			email: 'admin@overhaul.test',
			password: '',
			rol: 'tecnico',
			activo: 'on'
		});
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('No podés desactivar o cambiar el rol del último administrador');
	});

	it('blocks deleting the last active admin', async () => {
		// an inactive admin actor so the target is not a self-delete
		const [inactiveAdmin] = await db
			.insert(users)
			.values({
				username: 'admin-inactivo-actor',
				email: 'actor-inactivo@overhaul.test',
				password_hash: 'hash',
				nombre: 'Actor',
				apellido: 'Inactivo',
				rol: 'admin',
				activo: false
			})
			.returning({ id: users.id });

		const actorLocals = userLocals({
			id: inactiveAdmin.id,
			username: 'admin-inactivo-actor',
			nombre: 'Actor',
			apellido: 'Inactivo',
			email: 'actor-inactivo@overhaul.test',
			rol: 'admin'
		});

		const res = await invokeCrud(actorLocals, { _action: 'delete', id: ids.adminId });
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('No podés eliminar el último administrador');
	});

	it('blocks deleting your own account', async () => {
		const res = await invokeCrud(adminLocals(), { _action: 'delete', id: ids.adminId });
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('No podés eliminar tu propio usuario');
	});

	it('blocks deleting a user referenced by tickets', async () => {
		await db.insert(tickets).values({
			numero_ticket: 'TKT-REF-USER-001',
			titulo: 'Ticket del técnico',
			usuario_reporta: ids.tecnicoId
		});
		const res = await invokeCrud(adminLocals(), { _action: 'delete', id: ids.tecnicoId });
		expect(res.status).toBe(400);
		expect(res.data?.error).toContain('ticket(s) asociado(s)');
	});

	it('blocks deleting a user referenced by pm executions', async () => {
		const [plan] = await db
			.insert(preventive_maintenance_plans)
			.values({ nombre: 'Plan ref usuario' })
			.returning({ id: preventive_maintenance_plans.id });
		const [task] = await db
			.insert(pm_tasks)
			.values({ plan_id: plan.id, nombre: 'Tarea ref usuario' })
			.returning({ id: pm_tasks.id });
		await db.insert(pm_executions).values({
			plan_id: plan.id,
			tarea_id: task.id,
			ejecutado_por: ids.consultorId,
			fecha_programada: '2026-08-01'
		});
		const res = await invokeCrud(adminLocals(), { _action: 'delete', id: ids.consultorId });
		expect(res.status).toBe(400);
		expect(res.data?.error).toContain('ejecución(es) de mantenimiento asociada(s)');
	});

	it('deletes an unreferenced user successfully', async () => {
		const [temp] = await db
			.insert(users)
			.values({
				username: 'temp-user',
				email: 'temp@overhaul.test',
				password_hash: 'hash',
				nombre: 'Temp',
				apellido: 'User',
				rol: 'tecnico'
			})
			.returning({ id: users.id });
		const res = await invokeCrud(adminLocals(), { _action: 'delete', id: temp.id });
		expect(res).toMatchObject({ success: true, _action: 'delete' });
		const row = await db.query.users.findFirst({ where: eq(users.id, temp.id) });
		expect(row).toBeUndefined();
	});
});
