import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { requireRole, requireAuth } from '$lib/server/auth';
import { eq, and, or, like, count } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createUser, updateUser, deleteUser } from '$lib/server/services/usuarios';
import { escapeLike } from '$lib/server/validators';
import type { Actor } from '$lib/server/services/types';

const PAGE_SIZE = 10;

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user)
		return {
			usuarios: [],
			filterRol: '',
			filterActivo: '',
			search: '',
			total: 0,
			page: 1,
			totalPages: 1
		};

	const search = url.searchParams.get('search') ?? '';
	const filterRol = url.searchParams.get('rol') ?? '';
	const filterActivo = url.searchParams.get('activo') ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));

	const conditions = [];
	if (search) {
		const safeSearch = escapeLike(search);
		conditions.push(
			or(
				like(users.nombre, `%${safeSearch}%`),
				like(users.apellido, `%${safeSearch}%`),
				like(users.email, `%${safeSearch}%`),
				like(users.username, `%${safeSearch}%`)
			)
		);
	}
	if (filterRol) conditions.push(eq(users.rol, filterRol as 'admin' | 'tecnico' | 'consultor'));
	if (filterActivo === 'si') conditions.push(eq(users.activo, true));
	if (filterActivo === 'no') conditions.push(eq(users.activo, false));

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [countResult] = await db.select({ total: count() }).from(users).where(where);

	const total = countResult.total;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const offset = (currentPage - 1) * PAGE_SIZE;

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
		orderBy: (users, { asc }) => [asc(users.nombre)],
		limit: PAGE_SIZE,
		offset
	});

	return {
		usuarios: items,
		filterRol,
		filterActivo,
		search,
		total,
		page: currentPage,
		totalPages
	};
};

export const actions: Actions = {
	crud: async ({ request, locals }) => {
		requireAuth(locals);
		requireRole(locals, 'admin');

		const form = await request.formData();
		const _action = form.get('_action') as string;
		const id = (form.get('id') as string) ?? '';
		const actor: Actor = { id: locals.user.id, rol: locals.user.rol };

		if (_action === 'create') {
			const res = await createUser({
				username: (form.get('username') as string) ?? '',
				email: (form.get('email') as string) ?? '',
				nombre: (form.get('nombre') as string) ?? '',
				apellido: (form.get('apellido') as string) ?? '',
				password: (form.get('password') as string) ?? '',
				rol: (form.get('rol') as string) ?? 'tecnico',
				activo: form.get('activo') === 'on'
			});
			if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action });
			return { success: true, _action };
		}

		if (_action === 'update') {
			const res = await updateUser({
				id,
				nombre: (form.get('nombre') as string) ?? '',
				apellido: (form.get('apellido') as string) ?? '',
				email: (form.get('email') as string) ?? '',
				password: (form.get('password') as string) ?? '',
				rol: (form.get('rol') as string) ?? 'tecnico',
				activo: form.get('activo') === 'on'
			});
			if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action });
			return { success: true, _action };
		}

		if (_action === 'delete') {
			const res = await deleteUser({ id }, actor);
			if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action });
			return { success: true, _action };
		}

		return fail(400, { error: 'Acción no válida', _action });
	}
};
