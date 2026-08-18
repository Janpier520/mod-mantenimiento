import { db } from '$lib/server/db';
import { proveedores, equipment } from '$lib/server/db/schema';
import { eq, like, or, count } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { validateEmail, escapeLike } from '$lib/server/validators';
import type { PageServerLoad, Actions } from './$types';

const PAGE_SIZE = 10;

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) return { proveedores: [], total: 0, page: 1, totalPages: 1, search: '' };

	const search = url.searchParams.get('search') ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));

	const conditions = search
		? [
				like(proveedores.nombre, `%${escapeLike(search)}%`),
				like(proveedores.contacto, `%${escapeLike(search)}%`)
			]
		: [];

	const where = conditions.length > 0 ? or(...conditions) : undefined;

	const [{ total }] = await db.select({ total: count() }).from(proveedores).where(where);

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const offset = (currentPage - 1) * PAGE_SIZE;

	const items = await db.query.proveedores.findMany({
		where,
		orderBy: (proveedores, { asc }) => [asc(proveedores.nombre)],
		limit: PAGE_SIZE,
		offset
	});

	return {
		proveedores: items,
		total,
		page: currentPage,
		totalPages,
		search
	};
};

export const actions: Actions = {
	crud: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/login');
		if (!['admin'].includes(locals.user.rol)) throw redirect(303, '/');

		const form = await request.formData();
		const _action = form.get('_action') as string;
		const id = (form.get('id') as string) ?? '';
		const nombre = (form.get('nombre') as string) ?? '';
		const contacto = (form.get('contacto') as string) ?? '';
		const telefono = (form.get('telefono') as string) ?? '';
		const email = (form.get('email') as string) ?? '';
		const direccion = (form.get('direccion') as string) ?? '';

		if (_action === 'create' || _action === 'update') {
			if (!nombre || nombre.trim().length === 0) {
				return fail(400, { error: 'El nombre del proveedor es obligatorio', _action });
			}
		}

		if (_action === 'create') {
			if (email.trim()) {
				const emailError = validateEmail(email.trim());
				if (emailError) return fail(400, { error: emailError, _action });
			}

			await db.insert(proveedores).values({
				nombre: nombre.trim(),
				contacto: contacto.trim(),
				telefono: telefono.trim(),
				email: email.trim(),
				direccion: direccion.trim()
			});
			return { success: true, _action };
		}

		if (_action === 'update') {
			if (!id) return fail(400, { error: 'ID de proveedor no proporcionado', _action });

			const existing = await db.query.proveedores.findFirst({ where: eq(proveedores.id, id) });
			if (!existing) return fail(404, { error: 'Proveedor no encontrado', _action });

			if (email.trim()) {
				const emailError = validateEmail(email.trim());
				if (emailError) return fail(400, { error: emailError, _action });
			}

			await db
				.update(proveedores)
				.set({
					nombre: nombre.trim(),
					contacto: contacto.trim(),
					telefono: telefono.trim(),
					email: email.trim(),
					direccion: direccion.trim()
				})
				.where(eq(proveedores.id, id));
			return { success: true, _action };
		}

		if (_action === 'delete') {
			if (!id) return fail(400, { error: 'ID de proveedor no proporcionado', _action });

			const existing = await db.query.proveedores.findFirst({ where: eq(proveedores.id, id) });
			if (!existing) return fail(404, { error: 'Proveedor no encontrado', _action });

			const ref = await db.query.equipment.findFirst({
				where: eq(equipment.proveedor_id, id)
			});

			if (ref) {
				return fail(400, {
					error: 'No se puede eliminar: hay equipos que referencian este proveedor',
					_action
				});
			}

			await db.delete(proveedores).where(eq(proveedores.id, id));
			return { success: true, _action };
		}

		return fail(400, { error: 'Acción no válida', _action });
	}
};
