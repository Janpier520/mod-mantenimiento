import { db } from '$lib/server/db';
import {
	equipment,
	equipment_types,
	equipment_status_history,
	proveedores,
	tickets
} from '$lib/server/db/schema';
import { eq, like, or, and, count } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { EquipmentStatus } from '$lib/types';

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
	const page = Math.max(1, Number(url.searchParams.get('page')) ?? 1);

	const conditions = [];
	if (search) {
		conditions.push(
			or(
				like(equipment.modelo, `%${search}%`),
				like(equipment.marca, `%${search}%`),
				like(equipment.numero_serie, `%${search}%`)
			)
		);
	}
	if (filterEstado) conditions.push(eq(equipment.estado, filterEstado as EquipmentStatus));
	if (filterTipo) conditions.push(eq(equipment.tipo_id, filterTipo));

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [countResult] = await db.select({ total: count() }).from(equipment).where(where);

	const total = countResult.total;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const offset = (currentPage - 1) * PAGE_SIZE;

	const items = await db.query.equipment.findMany({
		where,
		with: { tipo: true, proveedor: true },
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
			proveedor_nombre: eq.proveedor?.nombre ?? ''
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

		const form = await request.formData();
		const _action = form.get('_action') as string;
		const id = (form.get('id') as string) ?? '';
		const tipo_id = (form.get('tipo_id') as string) ?? '';
		const modelo = (form.get('modelo') as string) ?? '';
		const marca = (form.get('marca') as string) ?? '';
		const numero_serie = (form.get('numero_serie') as string) ?? '';
		const estado = (form.get('estado') as EquipmentStatus) ?? 'operativo';
		const ubicacion = (form.get('ubicacion') as string) ?? '';
		const fecha_adquisicion = (form.get('fecha_adquisicion') as string) ?? '';
		const proveedor_id = (form.get('proveedor_id') as string) ?? '';
		const notas = (form.get('notas') as string) ?? '';

		if (_action === 'create' || _action === 'update') {
			if (!modelo || modelo.trim().length === 0) {
				return fail(400, { error: 'El modelo es obligatorio', _action });
			}
			if (!marca || marca.trim().length === 0) {
				return fail(400, { error: 'La marca es obligatoria', _action });
			}
			if (!tipo_id) {
				return fail(400, { error: 'El tipo de equipo es obligatorio', _action });
			}
		}

		if (_action === 'create') {
			await db.insert(equipment).values({
				tipo_id,
				modelo: modelo.trim(),
				marca: marca.trim(),
				numero_serie: numero_serie.trim(),
				estado,
				ubicacion: ubicacion.trim(),
				fecha_adquisicion: fecha_adquisicion || null,
				proveedor_id: proveedor_id || null,
				notas: notas.trim()
			});
			return { success: true, _action };
		}

		if (_action === 'update') {
			if (!id) return fail(400, { error: 'ID de equipo no proporcionado', _action });

			const existing = await db.query.equipment.findFirst({
				where: eq(equipment.id, id)
			});

			if (!existing) return fail(400, { error: 'Equipo no encontrado', _action });

			// If estado changed, record status history
			if (existing.estado !== estado) {
				await db.insert(equipment_status_history).values({
					equipo_id: id,
					estado_anterior: existing.estado,
					estado_nuevo: estado,
					cambiado_por: locals.user.id
				});
			}

			await db
				.update(equipment)
				.set({
					tipo_id,
					modelo: modelo.trim(),
					marca: marca.trim(),
					numero_serie: numero_serie.trim(),
					estado,
					ubicacion: ubicacion.trim(),
					fecha_adquisicion: fecha_adquisicion || null,
					proveedor_id: proveedor_id || null,
					notas: notas.trim(),
					updated_at: new Date().toISOString()
				})
				.where(eq(equipment.id, id));

			return { success: true, _action };
		}

		if (_action === 'delete') {
			if (!id) return fail(400, { error: 'ID de equipo no proporcionado', _action });

			const ref = await db.query.tickets.findFirst({
				where: eq(tickets.equipo_id, id)
			});

			if (ref) {
				return fail(400, {
					error: 'No se puede eliminar: hay tickets que referencian este equipo',
					_action
				});
			}

			await db.delete(equipment).where(eq(equipment.id, id));
			return { success: true, _action };
		}

		return fail(400, { error: 'Acción no válida', _action });
	}
};
