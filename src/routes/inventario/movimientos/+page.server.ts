import { db } from '$lib/server/db';
import { listMovements } from '$lib/server/services/inventory';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) {
		return {
			movements: [],
			items: [],
			total: 0,
			page: 1,
			totalPages: 1,
			filterItemId: '',
			filterTipo: ''
		};
	}

	const filterItemId = url.searchParams.get('item') ?? '';
	const filterTipo = url.searchParams.get('tipo') ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));

	const tipo =
		filterTipo === 'entrada' || filterTipo === 'salida' || filterTipo === 'ajuste'
			? filterTipo
			: undefined;

	const result = await listMovements({
		inventory_item_id: filterItemId || undefined,
		tipo,
		page,
		pageSize: 10
	});

	const items = await db.query.inventory_items.findMany({
		orderBy: (ii, { asc }) => [asc(ii.nombre)]
	});

	const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
	const currentPage = Math.min(result.page, totalPages);

	return {
		movements: result.movements,
		items,
		total: result.total,
		page: currentPage,
		totalPages,
		filterItemId,
		filterTipo
	};
};
