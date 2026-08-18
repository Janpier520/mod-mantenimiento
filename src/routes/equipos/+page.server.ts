import { db } from '$lib/server/db';
import { equipment } from '$lib/server/db/schema';
import { eq, like, or, and, count } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { escapeLike } from '$lib/server/validators';
import type { EquipmentState } from '$lib/server/state-machines';
import { createEquipo, updateEquipo, deleteEquipo } from '$lib/server/services/equipos';
import type { Actor } from '$lib/server/services/types';

const PAGE_SIZE = 10;

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) {
		return {
			equipment: [],
			tipos: [],
			proveedores: [],
			total: 0,
			page: 1,
			totalPages: 1,
			search: '',
			filterEstado: '',
			filterTipo: ''
		};
	}

	const search = url.searchParams.get('search') ?? '';
	const filterEstado = url.searchParams.get('estado') ?? '';
	const filterTipo = url.searchParams.get('tipo') ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));

	const conditions = [];
	if (search) {
		const safeSearch = escapeLike(search);
		conditions.push(
			or(
				like(equipment.modelo, `%${safeSearch}%`),
				like(equipment.marca, `%${safeSearch}%`),
				like(equipment.numero_serie, `%${safeSearch}%`)
			)
		);
	}
	if (filterEstado) conditions.push(eq(equipment.estado, filterEstado as EquipmentState));
	if (filterTipo) conditions.push(eq(equipment.tipo_id, filterTipo));

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [countResult] = await db.select({ total: count() }).from(equipment).where(where);

	const total = countResult.total;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const offset = (currentPage - 1) * PAGE_SIZE;

	const items = await db.query.equipment.findMany({
		where,
		with: {
			tipo: true,
			proveedor: true,
			historial: {
				with: { cambiado_por_user: { columns: { id: true, nombre: true, apellido: true } } },
				orderBy: (history, { desc }) => [desc(history.created_at)]
			}
		},
		orderBy: (equipment, { asc }) => [asc(equipment.modelo)],
		limit: PAGE_SIZE,
		offset
	});

	const allTipos = await db.query.equipment_types.findMany({
		orderBy: (et, { asc }) => [asc(et.nombre)]
	});

	const allProveedores = await db.query.proveedores.findMany({
		orderBy: (p, { asc }) => [asc(p.nombre)]
	});

	return {
		equipment: items.map((eq) => ({
			id: eq.id,
			tipo_id: eq.tipo_id,
			numero_serie: eq.numero_serie,
			modelo: eq.modelo,
			marca: eq.marca,
			estado: eq.estado,
			ubicacion: eq.ubicacion,
			fecha_adquisicion: eq.fecha_adquisicion ?? '',
			proveedor_id: eq.proveedor_id ?? '',
			notas: eq.notas,
			created_at: eq.created_at,
			updated_at: eq.updated_at,
			tipo_nombre: eq.tipo?.nombre ?? '',
			proveedor_nombre: eq.proveedor?.nombre ?? '',
			historial: (eq.historial ?? []).map((h) => ({
				id: h.id,
				estado_anterior: h.estado_anterior,
				estado_nuevo: h.estado_nuevo,
				created_at: h.created_at,
				cambiado_por: h.cambiado_por_user
					? {
							id: h.cambiado_por_user.id,
							nombre: h.cambiado_por_user.nombre,
							apellido: h.cambiado_por_user.apellido
						}
					: null
			}))
		})),
		tipos: allTipos,
		proveedores: allProveedores,
		total,
		page: currentPage,
		totalPages,
		search,
		filterEstado,
		filterTipo
	};
};

export const actions: Actions = {
	crud: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/login');
		if (locals.user.rol === 'consultor') {
			return fail(403, { error: 'Los consultores no pueden modificar equipos', _action: '' });
		}

		const form = await request.formData();
		const _action = form.get('_action') as string;
		const id = (form.get('id') as string) ?? '';
		const tipo_id = (form.get('tipo_id') as string) ?? '';
		const modelo = (form.get('modelo') as string) ?? '';
		const marca = (form.get('marca') as string) ?? '';
		const numero_serie = (form.get('numero_serie') as string) ?? '';
		const estado = ((form.get('estado') as string) ?? 'operativo') as EquipmentState;
		const ubicacion = (form.get('ubicacion') as string) ?? '';
		const fecha_adquisicion = (form.get('fecha_adquisicion') as string) ?? '';
		const proveedor_id = (form.get('proveedor_id') as string) ?? '';
		const notas = (form.get('notas') as string) ?? '';
		const actor: Actor = { id: locals.user.id, rol: locals.user.rol };

		if (_action === 'create') {
			const res = await createEquipo({
				tipo_id,
				modelo,
				marca,
				numero_serie,
				estado,
				ubicacion,
				fecha_adquisicion,
				proveedor_id,
				notas
			});
			if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action });
			return { success: true, _action };
		}

		if (_action === 'update') {
			const res = await updateEquipo(
				{
					id,
					tipo_id,
					modelo,
					marca,
					numero_serie,
					estado,
					ubicacion,
					fecha_adquisicion,
					proveedor_id,
					notas
				},
				actor
			);
			if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action });
			return { success: true, _action };
		}

		if (_action === 'delete') {
			const res = await deleteEquipo({ id });
			if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action });
			return { success: true, _action };
		}

		return fail(400, { error: 'Acción no válida', _action });
	}
};
