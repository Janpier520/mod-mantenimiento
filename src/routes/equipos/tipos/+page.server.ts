import { db } from '$lib/server/db';
import { equipment_types, equipment } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { isEquipmentTypeNameTaken } from '$lib/server/validators';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return { tipos: [] };
	if (locals.user.rol !== 'admin') throw redirect(303, '/');

	const items = await db.query.equipment_types.findMany({
		orderBy: (et, { asc }) => [asc(et.nombre)]
	});

	return { tipos: items };
};

export const actions: Actions = {
	crud: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/login');
		if (locals.user.rol !== 'admin') throw redirect(303, '/');

		const form = await request.formData();
		const _action = form.get('_action') as string;
		const id = (form.get('id') as string) ?? '';
		const nombre = (form.get('nombre') as string) ?? '';
		const descripcion = (form.get('descripcion') as string) ?? '';
		const icono = (form.get('icono') as string) ?? '';

		if (_action === 'create' || _action === 'update') {
			if (!nombre || nombre.trim().length === 0) {
				return fail(400, { error: 'El nombre del tipo es obligatorio', _action });
			}
		}

		if (_action === 'create') {
			if (await isEquipmentTypeNameTaken(nombre.trim())) {
				return fail(400, { error: 'Ya existe un tipo con ese nombre', _action });
			}

			await db.insert(equipment_types).values({
				nombre: nombre.trim(),
				descripcion: descripcion.trim(),
				icono: icono.trim()
			});
			return { success: true, _action };
		}

		if (_action === 'update') {
			if (!id) return fail(400, { error: 'ID de tipo no proporcionado', _action });

			const existing = await db.query.equipment_types.findFirst({
				where: eq(equipment_types.id, id)
			});
			if (!existing) return fail(404, { error: 'Tipo no encontrado', _action });

			if (nombre.trim() !== existing.nombre) {
				if (await isEquipmentTypeNameTaken(nombre.trim(), id)) {
					return fail(400, { error: 'Ya existe otro tipo con ese nombre', _action });
				}
			}

			await db
				.update(equipment_types)
				.set({
					nombre: nombre.trim(),
					descripcion: descripcion.trim(),
					icono: icono.trim()
				})
				.where(eq(equipment_types.id, id));
			return { success: true, _action };
		}

		if (_action === 'delete') {
			if (!id) return fail(400, { error: 'ID de tipo no proporcionado', _action });

			const existing = await db.query.equipment_types.findFirst({
				where: eq(equipment_types.id, id)
			});
			if (!existing) return fail(404, { error: 'Tipo no encontrado', _action });

			const ref = await db.query.equipment.findFirst({
				where: eq(equipment.tipo_id, id)
			});

			if (ref) {
				return fail(400, {
					error: 'No se puede eliminar: hay equipos que usan este tipo',
					_action
				});
			}

			await db.delete(equipment_types).where(eq(equipment_types.id, id));
			return { success: true, _action };
		}

		return fail(400, { error: 'Acción no válida', _action });
	}
};
