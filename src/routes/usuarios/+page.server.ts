import { db } from '$lib/server/db';
import { users, tickets } from '$lib/server/db/schema';
import { hashPassword, requireRole } from '$lib/server/auth';
import { eq, or, count, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';	export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return { usuarios: [] };

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
		orderBy: (users, { asc }) => [asc(users.nombre)]
	});

	return { usuarios: items };
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
			if (!password) errors.push('La contraseña es obligatoria');
			if (errors.length > 0) {
				return fail(400, { error: errors.join('. '), _action });
			}

			const existing = await db
				.select({ count: count() })
				.from(users)
				.where(or(eq(users.username, username.trim()), eq(users.email, email.trim())))
				.then((r) => r[0].count);

			if (existing > 0) {
				return fail(400, { error: 'El nombre de usuario o email ya está en uso', _action });
			}

			await db.insert(users).values({
				username: username.trim(),
				email: email.trim(),
				nombre: nombre.trim(),
				apellido: apellido.trim(),
				password_hash: hashPassword(password),
				rol: rol as 'admin' | 'tecnico' | 'consultor',
				activo
			});

			return { success: true, _action };
		}

		// ─── Update ───────────────────────────────────────────────────────────
		if (_action === 'update') {
			if (!id) return fail(400, { error: 'ID de usuario no proporcionado', _action });

			const nombre = (form.get('nombre') as string) ?? '';
			const apellido = (form.get('apellido') as string) ?? '';
			const email = (form.get('email') as string) ?? '';
			const password = (form.get('password') as string) ?? '';
			const rol = (form.get('rol') as string) ?? 'tecnico';
			const activo = form.get('activo') === 'on';

			const updateData: Record<string, unknown> = {
				nombre: nombre.trim(),
				apellido: apellido.trim(),
				email: email.trim(),
				rol: rol as 'admin' | 'tecnico' | 'consultor',
				activo
			};

			if (password) {
				updateData.password_hash = hashPassword(password);
			}

			await db.update(users).set(updateData).where(eq(users.id, id));

			return { success: true, _action };
		}

		// ─── Delete ───────────────────────────────────────────────────────────
		if (_action === 'delete') {
			if (!id) return fail(400, { error: 'ID de usuario no proporcionado', _action });

			// Prevent deleting self
			if (!locals.user || locals.user.id === id) {
				return fail(400, { error: 'No podés eliminar tu propio usuario', _action });
			}

			// Prevent deleting last admin
			const userToDelete = await db.query.users.findFirst({
				columns: { rol: true },
				where: eq(users.id, id)
			});

			if (userToDelete?.rol === 'admin') {
				const adminCount = await db
					.select({ count: count() })
					.from(users)
					.where(and(eq(users.rol, 'admin'), eq(users.activo, true)))
					.then((r) => r[0].count);

				if (adminCount <= 1) {
					return fail(400, { error: 'No podés eliminar el último administrador', _action });
				}
			}

			// Check references
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

			// ponytail: equipment references are via status_history and pm_executions, skip those
			// references for now — add when cascade logic is needed

			await db.delete(users).where(eq(users.id, id));
			return { success: true, _action };
		}

		return fail(400, { error: 'Acción no válida', _action });
	}
};
