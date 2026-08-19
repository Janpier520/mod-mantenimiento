import { db } from '$lib/server/db';
import {
	users,
	tickets,
	pm_executions,
	ticket_comments,
	ticket_attachments,
	equipment_status_history,
	activity_log
} from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';
import {
	validateEmail,
	validatePasswordStrength,
	isUsernameTaken,
	isEmailTaken,
	isLastActiveAdmin
} from '$lib/server/validators';
import { eq, or, count } from 'drizzle-orm';
import type { ServiceResult, Actor } from './types';

export interface CreateUserInput {
	username: string;
	email: string;
	nombre: string;
	apellido: string;
	password: string;
	rol: string;
	activo: boolean;
	security_question_1: string;
	security_answer_1: string;
	security_question_2: string;
	security_answer_2: string;
}
export interface UpdateUserInput {
	id: string;
	nombre: string;
	apellido: string;
	email: string;
	password: string;
	rol: string;
	activo: boolean;
	security_question_1?: string;
	security_answer_1?: string;
	security_question_2?: string;
	security_answer_2?: string;
}
export interface DeleteUserInput {
	id: string;
}

export type UserResult = ServiceResult<{ id: string }>;

export async function createUser(input: CreateUserInput): Promise<UserResult> {
	const {
		username,
		email,
		nombre,
		apellido,
		password,
		rol,
		activo,
		security_question_1,
		security_answer_1,
		security_question_2,
		security_answer_2
	} = input;

	const errors: string[] = [];
	if (!username.trim()) errors.push('El nombre de usuario es obligatorio');
	if (!email.trim()) errors.push('El email es obligatorio');
	if (!nombre.trim()) errors.push('El nombre es obligatorio');
	if (!apellido.trim()) errors.push('El apellido es obligatorio');
	const pwError = validatePasswordStrength(password);
	if (pwError) errors.push(pwError);
	const emailError = validateEmail(email.trim());
	if (emailError) errors.push(emailError);
	const rolValid = ['admin', 'tecnico', 'consultor'].includes(rol);
	if (!rolValid) errors.push('Rol no válido');
	const q1 = security_question_1.trim();
	const a1 = security_answer_1.trim();
	const q2 = security_question_2.trim();
	const a2 = security_answer_2.trim();
	if (!q1) errors.push('La pregunta de seguridad 1 es obligatoria');
	if (!a1) errors.push('La respuesta de seguridad 1 es obligatoria');
	if (!q2) errors.push('La pregunta de seguridad 2 es obligatoria');
	if (!a2) errors.push('La respuesta de seguridad 2 es obligatoria');
	if (errors.length > 0) {
		return { ok: false, error: errors.join('. '), status: 400 };
	}

	if (await isUsernameTaken(username.trim())) {
		return { ok: false, error: 'Ya existe un usuario con ese nombre de usuario', status: 400 };
	}
	if (await isEmailTaken(email.trim())) {
		return { ok: false, error: 'Ya existe un usuario con ese email', status: 400 };
	}

	const [row] = await db
		.insert(users)
		.values({
			username: username.trim(),
			email: email.trim(),
			nombre: nombre.trim(),
			apellido: apellido.trim(),
			password_hash: await hashPassword(password),
			rol: rol as 'admin' | 'tecnico' | 'consultor',
			activo,
			security_question_1: q1,
			security_answer_hash_1: await hashPassword(a1),
			security_question_2: q2,
			security_answer_hash_2: await hashPassword(a2)
		})
		.returning({ id: users.id });

	return { ok: true, data: { id: row.id } };
}

export async function updateUser(input: UpdateUserInput): Promise<UserResult> {
	const {
		id,
		nombre,
		apellido,
		email,
		password,
		rol,
		activo,
		security_question_1,
		security_answer_1,
		security_question_2,
		security_answer_2
	} = input;

	if (!id) return { ok: false, error: 'ID de usuario no proporcionado', status: 400 };

	const existingUser = await db.query.users.findFirst({ where: eq(users.id, id) });
	if (!existingUser) return { ok: false, error: 'Usuario no encontrado', status: 404 };

	const errors: string[] = [];
	if (!nombre.trim()) errors.push('El nombre es obligatorio');
	if (!apellido.trim()) errors.push('El apellido es obligatorio');
	if (!email.trim()) errors.push('El email es obligatorio');
	const emailError = validateEmail(email.trim());
	if (emailError) errors.push(emailError);
	const rolValid = ['admin', 'tecnico', 'consultor'].includes(rol);
	if (!rolValid) errors.push('Rol no válido');
	if (password) {
		const pwError = validatePasswordStrength(password);
		if (pwError) errors.push(pwError);
	}
	const secAnswer1 = (security_answer_1 ?? '').trim();
	const secAnswer2 = (security_answer_2 ?? '').trim();
	if (secAnswer1 && !(security_question_1 ?? '').trim())
		errors.push('Debes seleccionar la pregunta de seguridad 1');
	if (secAnswer2 && !(security_question_2 ?? '').trim())
		errors.push('Debes seleccionar la pregunta de seguridad 2');
	if (errors.length > 0) {
		return { ok: false, error: errors.join('. '), status: 400 };
	}

	if (existingUser.rol === 'admin' && existingUser.activo) {
		if (!activo || rol !== 'admin') {
			if (await isLastActiveAdmin(id)) {
				return {
					ok: false,
					error: 'No podés desactivar o cambiar el rol del último administrador',
					status: 400
				};
			}
		}
	}

	if (email.trim() !== existingUser.email) {
		if (await isEmailTaken(email.trim(), id)) {
			return { ok: false, error: 'Ya existe otro usuario con ese email', status: 400 };
		}
	}

	const updateData: Record<string, unknown> = {
		nombre: nombre.trim(),
		apellido: apellido.trim(),
		email: email.trim(),
		rol: rol as 'admin' | 'tecnico' | 'consultor',
		activo
	};

	if (password) {
		updateData.password_hash = await hashPassword(password);
	}

	// Empty answer keeps the current security question/answer unchanged
	if (secAnswer1) {
		updateData.security_question_1 = (security_question_1 ?? '').trim();
		updateData.security_answer_hash_1 = await hashPassword(secAnswer1);
	}
	if (secAnswer2) {
		updateData.security_question_2 = (security_question_2 ?? '').trim();
		updateData.security_answer_hash_2 = await hashPassword(secAnswer2);
	}

	await db.update(users).set(updateData).where(eq(users.id, id));

	return { ok: true, data: { id } };
}

export async function deleteUser(input: DeleteUserInput, actor: Actor): Promise<UserResult> {
	const { id } = input;

	if (!id) return { ok: false, error: 'ID de usuario no proporcionado', status: 400 };

	const existingUser = await db.query.users.findFirst({ where: eq(users.id, id) });
	if (!existingUser) return { ok: false, error: 'Usuario no encontrado', status: 404 };

	if (actor.id === id) {
		return { ok: false, error: 'No podés eliminar tu propio usuario', status: 400 };
	}

	if (existingUser.rol === 'admin' && existingUser.activo) {
		if (await isLastActiveAdmin(id)) {
			return { ok: false, error: 'No podés eliminar el último administrador', status: 400 };
		}
	}

	const [ticketRefs] = await db
		.select({ count: count() })
		.from(tickets)
		.where(or(eq(tickets.usuario_reporta, id), eq(tickets.tecnico_asignado, id)));

	if (ticketRefs.count > 0) {
		return {
			ok: false,
			error: `No se puede eliminar: el usuario tiene ${ticketRefs.count} ticket(s) asociado(s)`,
			status: 400
		};
	}

	const [pmRefs] = await db
		.select({ count: count() })
		.from(pm_executions)
		.where(eq(pm_executions.ejecutado_por, id));

	if (pmRefs.count > 0) {
		return {
			ok: false,
			error: `No se puede eliminar: el usuario tiene ${pmRefs.count} ejecución(es) de mantenimiento asociada(s)`,
			status: 400
		};
	}

	// PRAGMA foreign_keys=ON would raise an unhandled FK error on delete unless
	// every referencing table is checked first.
	const otherRefs = await Promise.all([
		db.select({ count: count() }).from(ticket_comments).where(eq(ticket_comments.usuario_id, id)),
		db
			.select({ count: count() })
			.from(ticket_attachments)
			.where(eq(ticket_attachments.uploaded_by, id)),
		db
			.select({ count: count() })
			.from(equipment_status_history)
			.where(eq(equipment_status_history.cambiado_por, id)),
		db.select({ count: count() }).from(activity_log).where(eq(activity_log.usuario_id, id))
	]);
	const totalRefs = otherRefs.reduce((sum, [r]) => sum + r.count, 0);

	if (totalRefs > 0) {
		return {
			ok: false,
			error: 'No se puede eliminar: el usuario tiene actividad registrada en el sistema',
			status: 400
		};
	}

	await db.delete(users).where(eq(users.id, id));
	return { ok: true, data: { id } };
}
