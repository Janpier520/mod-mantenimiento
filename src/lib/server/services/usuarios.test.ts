import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { db } from '$lib/server/db';
import { initTestDb, type SeedIds } from '$lib/server/db/test-helpers';
import {
	users,
	tickets,
	ticket_comments,
	preventive_maintenance_plans,
	pm_tasks,
	pm_executions
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createUser, updateUser, deleteUser } from './usuarios';
import type { Actor } from './types';

let ids: SeedIds;

function adminActor(): Actor {
	return { id: ids.adminId, rol: 'admin' };
}

function createInput() {
	return {
		username: 'svc_user',
		email: 'svc@equiplab.test',
		nombre: 'Servicio',
		apellido: 'User',
		password: 'secret123',
		rol: 'tecnico',
		activo: true,
		security_question_1: '¿Cuál es tu color favorito?',
		security_answer_1: 'azul',
		security_question_2: '¿En qué ciudad naciste?',
		security_answer_2: 'Rosario'
	};
}

describe('usuarios service', () => {
	beforeAll(async () => {
		ids = await initTestDb();
	});

	it('creates a user with trimmed values and a verifiable password hash', async () => {
		const res = await createUser({
			...createInput(),
			username: '  svc_user  ',
			email: '  svc@equiplab.test  ',
			nombre: '  Servicio  ',
			apellido: '  User  '
		});
		expect(res.ok).toBe(true);
		const createdId = res.ok ? res.data.id : null;
		expect(createdId).toBeTruthy();
		const row = await db.query.users.findFirst({ where: eq(users.id, createdId ?? '') });
		expect(row?.username).toBe('svc_user');
		expect(row?.email).toBe('svc@equiplab.test');
		expect(await bcrypt.compare('secret123', row!.password_hash)).toBe(true);
	});

	it('aggregates all validation errors into one joined message', async () => {
		const res = await createUser({
			username: '',
			email: '',
			nombre: '',
			apellido: '',
			password: 'abc',
			rol: 'tecnico',
			activo: true,
			security_question_1: '',
			security_answer_1: '',
			security_question_2: '',
			security_answer_2: ''
		});
		expect(res.ok).toBe(false);
		if (res.ok) return;
		expect(res.status).toBe(400);
		expect(res.error).toContain('El nombre de usuario es obligatorio');
		expect(res.error).toContain('El email es obligatorio');
		expect(res.error).toContain('El nombre es obligatorio');
		expect(res.error).toContain('El apellido es obligatorio');
		expect(res.error).toContain('La contraseña debe tener al menos 6 caracteres');
		expect(res.error).toContain('La pregunta de seguridad 1 es obligatoria');
		expect(res.error).toContain('La respuesta de seguridad 1 es obligatoria');
		expect(res.error).toContain('La pregunta de seguridad 2 es obligatoria');
		expect(res.error).toContain('La respuesta de seguridad 2 es obligatoria');
	});

	it('rejects a duplicate username and a duplicate email with exact errors', async () => {
		const dupUsername = await createUser({
			...createInput(),
			username: 'tecnico1',
			email: 'otro@equiplab.test'
		});
		expect(dupUsername).toEqual({
			ok: false,
			error: 'Ya existe un usuario con ese nombre de usuario',
			status: 400
		});

		const dupEmail = await createUser({
			...createInput(),
			username: 'otro_user',
			email: 'tecnico@equiplab.test'
		});
		expect(dupEmail).toEqual({
			ok: false,
			error: 'Ya existe un usuario con ese email',
			status: 400
		});
	});

	it('allows updating a user keeping their own email (excludeUserId)', async () => {
		const res = await updateUser({
			id: ids.tecnicoId,
			nombre: 'Carlos',
			apellido: 'Méndez',
			email: 'tecnico@equiplab.test',
			password: '',
			rol: 'tecnico',
			activo: true
		});
		expect(res).toEqual({ ok: true, data: { id: ids.tecnicoId } });
	});

	it('rejects updating a user to another user email', async () => {
		const res = await updateUser({
			id: ids.tecnicoId,
			nombre: 'Carlos',
			apellido: 'Méndez',
			email: 'admin@equiplab.test',
			password: '',
			rol: 'tecnico',
			activo: true
		});
		expect(res).toEqual({ ok: false, error: 'Ya existe otro usuario con ese email', status: 400 });
	});

	it('blocks deactivating or role-changing the last active admin', async () => {
		const deactivate = await updateUser({
			id: ids.adminId,
			nombre: 'Admin',
			apellido: 'Sistema',
			email: 'admin@equiplab.test',
			password: '',
			rol: 'admin',
			activo: false
		});
		expect(deactivate).toEqual({
			ok: false,
			error: 'No podés desactivar o cambiar el rol del último administrador',
			status: 400
		});

		const roleChange = await updateUser({
			id: ids.adminId,
			nombre: 'Admin',
			apellido: 'Sistema',
			email: 'admin@equiplab.test',
			password: '',
			rol: 'tecnico',
			activo: true
		});
		expect(roleChange).toEqual({
			ok: false,
			error: 'No podés desactivar o cambiar el rol del último administrador',
			status: 400
		});
	});

	it('blocks deleting the last active admin', async () => {
		const [inactiveAdmin] = await db
			.insert(users)
			.values({
				username: 'admin-inactivo-svc',
				email: 'actor-inactivo-svc@equiplab.test',
				password_hash: 'hash',
				nombre: 'Actor',
				apellido: 'Inactivo',
				rol: 'admin',
				activo: false
			})
			.returning({ id: users.id });

		const res = await deleteUser({ id: ids.adminId }, { id: inactiveAdmin.id, rol: 'admin' });
		expect(res).toEqual({
			ok: false,
			error: 'No podés eliminar el último administrador',
			status: 400
		});
	});

	it('blocks deleting your own account', async () => {
		const res = await deleteUser({ id: ids.adminId }, adminActor());
		expect(res).toEqual({ ok: false, error: 'No podés eliminar tu propio usuario', status: 400 });
	});

	it('blocks deleting a user referenced by tickets', async () => {
		await db.insert(tickets).values({
			numero_ticket: 'TKT-SVC-REF-USER-001',
			titulo: 'Ticket del técnico',
			usuario_reporta: ids.tecnicoId
		});
		const res = await deleteUser({ id: ids.tecnicoId }, adminActor());
		expect(res.ok).toBe(false);
		if (res.ok) return;
		expect(res.status).toBe(400);
		expect(res.error).toContain('ticket(s) asociado(s)');
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

		const res = await deleteUser({ id: ids.consultorId }, adminActor());
		expect(res.ok).toBe(false);
		if (res.ok) return;
		expect(res.error).toContain('ejecución(es) de mantenimiento asociada(s)');
	});

	it('deletes an unreferenced user successfully', async () => {
		const [temp] = await db
			.insert(users)
			.values({
				username: 'temp-svc',
				email: 'temp-svc@equiplab.test',
				password_hash: 'hash',
				nombre: 'Temp',
				apellido: 'User',
				rol: 'tecnico'
			})
			.returning({ id: users.id });

		const res = await deleteUser({ id: temp.id }, adminActor());
		expect(res).toEqual({ ok: true, data: { id: temp.id } });
		const row = await db.query.users.findFirst({ where: eq(users.id, temp.id) });
		expect(row).toBeUndefined();
	});

	it('updates the password hash when a new password is provided', async () => {
		const before = await db.query.users.findFirst({ where: eq(users.id, ids.tecnicoId) });

		const res = await updateUser({
			id: ids.tecnicoId,
			nombre: 'Carlos',
			apellido: 'Méndez',
			email: 'tecnico@equiplab.test',
			password: 'nueva-clave-456',
			rol: 'tecnico',
			activo: true
		});
		expect(res.ok).toBe(true);

		const after = await db.query.users.findFirst({ where: eq(users.id, ids.tecnicoId) });
		expect(after?.password_hash).not.toBe(before?.password_hash);
		expect(await bcrypt.compare('nueva-clave-456', after!.password_hash)).toBe(true);
	});

	it('stores security questions and hashed answers on create', async () => {
		const res = await createUser({
			...createInput(),
			username: 'seguridad_user',
			email: 'seguridad@equiplab.test',
			security_question_1: '¿Cuál es tu color favorito?',
			security_answer_1: 'azul',
			security_question_2: '¿En qué ciudad naciste?',
			security_answer_2: 'Rosario'
		});
		expect(res.ok).toBe(true);
		const createdId = res.ok ? res.data.id : '';
		const row = await db.query.users.findFirst({ where: eq(users.id, createdId) });
		expect(row?.security_question_1).toBe('¿Cuál es tu color favorito?');
		expect(await bcrypt.compare('azul', row!.security_answer_hash_1)).toBe(true);
		expect(row?.security_question_2).toBe('¿En qué ciudad naciste?');
		expect(await bcrypt.compare('Rosario', row!.security_answer_hash_2)).toBe(true);
	});

	it('rejects create when security questions or answers are missing', async () => {
		const res = await createUser({
			...createInput(),
			username: 'sin_seguridad',
			email: 'sinseguridad@equiplab.test',
			security_question_1: '',
			security_answer_1: '',
			security_question_2: '',
			security_answer_2: ''
		});
		expect(res.ok).toBe(false);
		if (res.ok) return;
		expect(res.status).toBe(400);
		expect(res.error).toContain('La pregunta de seguridad 1 es obligatoria');
		expect(res.error).toContain('La respuesta de seguridad 1 es obligatoria');
		expect(res.error).toContain('La pregunta de seguridad 2 es obligatoria');
		expect(res.error).toContain('La respuesta de seguridad 2 es obligatoria');
	});

	it('updates security answers when provided and keeps the other pair', async () => {
		const created = await createUser({
			...createInput(),
			username: 'edit_seguridad',
			email: 'editseguridad@equiplab.test',
			security_question_1: '¿Cuál es tu color favorito?',
			security_answer_1: 'verde',
			security_question_2: '¿Cuál es tu comida favorita?',
			security_answer_2: 'pizza'
		});
		expect(created.ok).toBe(true);
		const createdId = created.ok ? created.data.id : '';

		const res = await updateUser({
			id: createdId,
			nombre: 'Servicio',
			apellido: 'User',
			email: 'editseguridad@equiplab.test',
			password: '',
			rol: 'tecnico',
			activo: true,
			security_question_1: '¿Cuál es tu color favorito?',
			security_answer_1: 'rojo',
			security_question_2: '',
			security_answer_2: ''
		});
		expect(res.ok).toBe(true);

		const row = await db.query.users.findFirst({ where: eq(users.id, createdId) });
		expect(await bcrypt.compare('rojo', row!.security_answer_hash_1)).toBe(true);
		expect(await bcrypt.compare('pizza', row!.security_answer_hash_2)).toBe(true);
	});

	it('keeps security answers unchanged when update leaves them empty', async () => {
		const created = await createUser({
			...createInput(),
			username: 'keep_seguridad',
			email: 'keepseguridad@equiplab.test',
			security_question_1: '¿Cuál es tu comida favorita?',
			security_answer_1: 'asado',
			security_question_2: '¿Cuál es tu apellido materno?',
			security_answer_2: 'González'
		});
		expect(created.ok).toBe(true);
		const createdId = created.ok ? created.data.id : '';

		const res = await updateUser({
			id: createdId,
			nombre: 'Servicio',
			apellido: 'User',
			email: 'keepseguridad@equiplab.test',
			password: '',
			rol: 'tecnico',
			activo: true
		});
		expect(res.ok).toBe(true);

		const row = await db.query.users.findFirst({ where: eq(users.id, createdId) });
		expect(row?.security_question_1).toBe('¿Cuál es tu comida favorita?');
		expect(await bcrypt.compare('asado', row!.security_answer_hash_1)).toBe(true);
		expect(row?.security_question_2).toBe('¿Cuál es tu apellido materno?');
		expect(await bcrypt.compare('González', row!.security_answer_hash_2)).toBe(true);
	});

	it('blocks deleting a user referenced by a ticket comment', async () => {
		const [temp] = await db
			.insert(users)
			.values({
				username: 'commenter-svc',
				email: 'commenter-svc@equiplab.test',
				password_hash: 'hash',
				nombre: 'Comentador',
				apellido: 'User',
				rol: 'tecnico'
			})
			.returning({ id: users.id });

		const [ticket] = await db
			.insert(tickets)
			.values({
				numero_ticket: 'TKT-SVC-COMMENT-001',
				titulo: 'Ticket con comentario',
				usuario_reporta: ids.adminId
			})
			.returning({ id: tickets.id });

		await db.insert(ticket_comments).values({
			ticket_id: ticket.id,
			usuario_id: temp.id,
			contenido: 'Comentario de referencia'
		});

		const res = await deleteUser({ id: temp.id }, adminActor());
		expect(res.ok).toBe(false);
		if (res.ok) return;
		expect(res.status).toBe(400);
		expect(res.error).toBe(
			'No se puede eliminar: el usuario tiene actividad registrada en el sistema'
		);
	});
});
