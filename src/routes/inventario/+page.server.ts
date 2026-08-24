import { db } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import {
	listInventoryItems,
	createInventoryItem,
	updateInventoryItem,
	deleteInventoryItem,
	createMovement,
	getCategorias,
	getLowStockCount
} from '$lib/server/services/inventory';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) {
		return {
			items: [],
			categorias: [],
			tipos: [],
			lowStockCount: 0,
			total: 0,
			page: 1,
			totalPages: 1,
			search: '',
			filterCategoria: '',
			filterTipoEquipo: '',
			filterStockBajo: ''
		};
	}

	const search = url.searchParams.get('search') ?? '';
	const filterCategoria = url.searchParams.get('categoria') ?? '';
	const filterTipoEquipo = url.searchParams.get('tipo_equipo') ?? '';
	const filterStockBajo = url.searchParams.get('stock_bajo') ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));

	const result = await listInventoryItems({
		search: search || undefined,
		categoria: filterCategoria || undefined,
		tipo_equipo_id: filterTipoEquipo || undefined,
		stock_bajo: filterStockBajo === '1' || undefined,
		page,
		pageSize: 10
	});

	const categorias = await getCategorias();
	const lowStockCount = await getLowStockCount();

	const tipos = await db.query.equipment_types.findMany({
		orderBy: (et, { asc }) => [asc(et.nombre)]
	});

	const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
	const currentPage = Math.min(result.page, totalPages);

	return {
		items: result.items,
		categorias,
		tipos,
		lowStockCount,
		total: result.total,
		page: currentPage,
		totalPages,
		search,
		filterCategoria,
		filterTipoEquipo,
		filterStockBajo
	};
};

export const actions: Actions = {
	crud: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/login');
		if (locals.user.rol === 'consultor') {
			return fail(403, { error: 'Los consultores no pueden modificar el inventario', _action: '' });
		}

		const form = await request.formData();
		const _action = form.get('_action') as string;

		if (_action === 'create') {
			const res = await createInventoryItem({
				nombre: (form.get('nombre') as string) ?? '',
				descripcion: (form.get('descripcion') as string) ?? '',
				codigo_parte: (form.get('codigo_parte') as string) ?? '',
				categoria: (form.get('categoria') as string) ?? '',
				tipo_equipo_id: (form.get('tipo_equipo_id') as string) || null,
				stock_actual: Number(form.get('stock_actual') ?? 0),
				stock_minimo: Number(form.get('stock_minimo') ?? 0),
				ubicacion: (form.get('ubicacion') as string) ?? ''
			});
			if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action });
			return { success: true, _action };
		}

		if (_action === 'update') {
			const id = (form.get('id') as string) ?? '';
			if (!id) return fail(400, { error: 'ID de ítem no proporcionado', _action });

			const res = await updateInventoryItem({
				id,
				nombre: (form.get('nombre') as string) ?? '',
				descripcion: (form.get('descripcion') as string) ?? '',
				codigo_parte: (form.get('codigo_parte') as string) ?? '',
				categoria: (form.get('categoria') as string) ?? '',
				tipo_equipo_id: (form.get('tipo_equipo_id') as string) || null,
				stock_actual: Number(form.get('stock_actual') ?? 0),
				stock_minimo: Number(form.get('stock_minimo') ?? 0),
				ubicacion: (form.get('ubicacion') as string) ?? ''
			});
			if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action });
			return { success: true, _action };
		}

		if (_action === 'delete') {
			const id = (form.get('id') as string) ?? '';
			if (!id) return fail(400, { error: 'ID de ítem no proporcionado', _action });

			const res = await deleteInventoryItem({ id });
			if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action });
			return { success: true, _action };
		}

		if (_action === 'movimiento') {
			const res = await createMovement({
				inventory_item_id: (form.get('inventory_item_id') as string) ?? '',
				tipo: (form.get('tipo') as 'entrada' | 'salida' | 'ajuste') ?? 'entrada',
				cantidad: Number(form.get('cantidad') ?? 0),
				motivo: (form.get('motivo') as string) ?? '',
				usuario_id: locals.user.id,
				referencia_tipo: null,
				referencia_id: null
			});
			if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action });
			return { success: true, _action };
		}

		return fail(400, { error: 'Acción no válida', _action });
	}
};
