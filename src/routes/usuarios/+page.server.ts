import { db } from '$lib/server/db';
import { users, tickets, pm_executions } from '$lib/server/db/schema';
import { hashPassword, requireRole } from '$lib/server/auth';
import {
	validateEmail,
	validatePasswordStrength,
	isUsernameTaken,
	isEmailTaken,
	isLastActiveAdmin
} from '$lib/server/validators';
import { eq, or, count, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) return { usuarios: [], filterRol: '', filterActivo: '' };

	const filterRol = url.searchParams.get('rol') ?? '';
	const filterActivo = url.searchParams.get('activo') ?? '';

	const conditions: ReturnType<typeof and>[] = [];
	if (filterRol) conditions.push(eq(users.rol, filterRol as 'admin' | 'tecnico' | 'consultor'));
	if (filterActivo === 'si') conditions.push(eq(users.activo, true));
	if (filterActivo === 'no') conditions.push(eq(users.activo, false));

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const items = await db.query.users.findMany({
		columns: {
			id: true,
			username: true,
			email: true,
			nombre: true,
			apellido: true,
			rol: true,
			activo: true,
			created_at: true,
			updated_at: true
		},
		where,
		orderBy: (users, { asc }) => [asc(users.nombre)]
	});

	return { usuarios: items, filterRol, filterActivo };
};

export const actions: Actions = {
	crud: async ({ request, locals }) => {
		requireRole(locals, 'admin');

		const form = await request.formData();
		const _action = form.get('_action') as string;
		const id = (form.get('id') as string) ?? '';

		// ─── Create ───────────────────────────────────────────────────────────
		if (_action === 'create') {
			const username = (form.get('username') as string) ?? '';
			const email = (form.get('email') as string) ?? '';
			const nombre = (form.get('nombre') as string) ?? '';
			const apellido = (form.get('apellido') as string) ?? '';
			const password = (form.get('password') as string) ?? '';
			const rol = (form.get('rol') as string) ?? 'tecnico';
			const activo = form.get('activo') === 'on';

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
			if (errors.length > 0) {
				return fail(400, { error: errors.join('. '), _action });
			}

			if (await isUsernameTaken(username.trim())) {
				return fail(400, { error: 'Ya existe un usuario con ese nombre de usuario', _action });
			}
			if (await isEmailTaken(email.trim())) {
				return fail(400, { error: 'Ya existe un usuario con ese email', _action });
			}

			await db.insert(users).values({
				username: username.trim(),
				email: email.trim(),
				nombre: nombre.trim(),
				apellido: apellido.trim(),
				password_hash: await hashPassword(password),
				rol: rol as 'admin' | 'tecnico' | 'consultor',
				activo
			});

			return { success: true, _action };
		}

		// ─── Update ───────────────────────────────────────────────────────────
		if (_action === 'update') {
			if (!id) return fail(400, { error: 'ID de usuario no proporcionado', _action });

			const existingUser = await db.query.users.findFirst({ where: eq(users.id, id) });
			if (!existingUser) return fail(404, { error: 'Usuario no encontrado', _action });

			const nombre = (form.get('nombre') as string) ?? '';
			const apellido = (form.get('apellido') as string) ?? '';
			const email = (form.get('email') as string) ?? '';
			const password = (form.get('password') as string) ?? '';
			const rol = (form.get('rol') as string) ?? 'tecnico';
			const activo = form.get('activo') === 'on';

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
			if (errors.length > 0) {
				return fail(400, { error: errors.join('. '), _action });
			}

			if (existingUser.rol === 'admin' && existingUser.activo) {
				if (!activo || rol !== 'admin') {
					if (await isLastActiveAdmin(id)) {
						return fail(400, {
							error: 'No podés desactivar o cambiar el rol del último administrador',
							_action
						});
					}
				}
			}

			if (email.trim() !== existingUser.email) {
				if (await isEmailTaken(email.trim(), id)) {
					return fail(400, { error: 'Ya existe otro usuario con ese email', _action });
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

			await db.update(users).set(updateData).where(eq(users.id, id));

			return { success: true, _action };
		}

		// ─── Delete ───────────────────────────────────────────────────────────
		if (_action === 'delete') {
			if (!id) return fail(400, { error: 'ID de usuario no proporcionado', _action });

			const existingUser = await db.query.users.findFirst({ where: eq(users.id, id) });
			if (!existingUser) return fail(404, { error: 'Usuario no encontrado', _action });

			if (!locals.user || locals.user.id === id) {
				return fail(400, { error: 'No podés eliminar tu propio usuario', _action });
			}

			if (existingUser.rol === 'admin' && existingUser.activo) {
				if (await isLastActiveAdmin(id)) {
					return fail(400, { error: 'No podés eliminar el último administrador', _action });
				}
			}

			const ticketRefs = await db
				.select({ count: count() })
				.from(tickets)
				.where(or(eq(tickets.usuario_reporta, id), eq(tickets.tecnico_asignado, id)))
				.then((r) => r[0].count);

			if (ticketRefs > 0) {
				return fail(400, {
					error: `No se puede eliminar: el usuario tiene ${ticketRefs} ticket(s) asociado(s)`,
					_action
				});
			}

			const pmRefs = await db
				.select({ count: count() })
				.from(pm_executions)
				.where(eq(pm_executions.ejecutado_por, id))
				.then((r) => r[0].count);

			if (pmRefs > 0) {
				return fail(400, {
					error: `No se puede eliminar: el usuario tiene ${pmRefs} ejecución(es) de mantenimiento asociada(s)`,
					_action
				});
			}

			await db.delete(users).where(eq(users.id, id));
			return { success: true, _action };
		}

		return fail(400, { error: 'Acción no válida', _action });
	}
};
