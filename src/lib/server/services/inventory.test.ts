import { describe, it, expect, beforeAll } from 'vitest';
import { initTestDb, type SeedIds } from '$lib/server/db/test-helpers';
import {
	createInventoryItem,
	updateInventoryItem,
	deleteInventoryItem,
	listInventoryItems,
	getInventoryItem,
	getCategorias,
	getLowStockItems,
	getLowStockCount,
	createMovement,
	listMovements
} from './inventory';

let ids: SeedIds;
let itemId: string;

function baseInput() {
	return {
		nombre: 'RAM DDR4 8GB',
		descripcion: 'Módulo de memoria',
		codigo_parte: 'RAM-TEST-001',
		categoria: 'Memoria',
		tipo_equipo_id: ids.tipoPcId,
		stock_actual: 10,
		stock_minimo: 5,
		ubicacion: 'Almacén'
	};
}

describe('inventory service', () => {
	beforeAll(async () => {
		ids = await initTestDb();
	});

	describe('createInventoryItem', () => {
		it('creates a valid item', async () => {
			const result = await createInventoryItem(baseInput());
			expect(result.ok).toBe(true);
			if (result.ok) itemId = result.data.id;
		});

		it('rejects empty nombre', async () => {
			const result = await createInventoryItem({ ...baseInput(), nombre: '' });
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.error).toContain('nombre');
		});

		it('rejects empty categoria', async () => {
			const result = await createInventoryItem({ ...baseInput(), categoria: '' });
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.error).toContain('categoría');
		});

		it('rejects negative stock', async () => {
			const result = await createInventoryItem({ ...baseInput(), stock_actual: -1 });
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.error).toContain('negativo');
		});
	});

	describe('getInventoryItem', () => {
		it('returns existing item', async () => {
			const item = await getInventoryItem(itemId);
			expect(item).toBeDefined();
			expect(item!.nombre).toBe('RAM DDR4 8GB');
		});

		it('returns undefined for non-existent', async () => {
			const item = await getInventoryItem('non-existent-id');
			expect(item).toBeUndefined();
		});
	});

	describe('updateInventoryItem', () => {
		it('updates an existing item', async () => {
			const result = await updateInventoryItem({
				...baseInput(),
				id: itemId,
				nombre: 'RAM DDR4 8GB (updated)'
			});
			expect(result.ok).toBe(true);
			const item = await getInventoryItem(itemId);
			expect(item!.nombre).toBe('RAM DDR4 8GB (updated)');
		});

		it('rejects non-existent id', async () => {
			const result = await updateInventoryItem({
				...baseInput(),
				id: 'non-existent'
			});
			expect(result.ok).toBe(false);
		});
	});

	describe('listInventoryItems', () => {
		it('returns items with pagination', async () => {
			const result = await listInventoryItems();
			expect(result.items.length).toBeGreaterThan(0);
			expect(result.total).toBeGreaterThan(0);
		});

		it('filters by search term', async () => {
			const result = await listInventoryItems({ search: 'RAM' });
			expect(result.items.length).toBeGreaterThan(0);
		});

		it('filters by categoria', async () => {
			const result = await listInventoryItems({ categoria: 'Memoria' });
			expect(result.items.length).toBeGreaterThan(0);
		});
	});

	describe('getCategorias', () => {
		it('returns distinct categories', async () => {
			const cats = await getCategorias();
			expect(cats.length).toBeGreaterThan(0);
			expect(cats).toContain('Memoria');
		});
	});

	describe('stock movements', () => {
		it('creates entrada movement', async () => {
			const result = await createMovement({
				inventory_item_id: itemId,
				tipo: 'entrada',
				cantidad: 5,
				motivo: 'Compra',
				usuario_id: ids.adminId,
				referencia_tipo: null,
				referencia_id: null
			});
			expect(result.ok).toBe(true);
			const item = await getInventoryItem(itemId);
			expect(item!.stock_actual).toBe(15); // 10 + 5
		});

		it('creates salida movement', async () => {
			const result = await createMovement({
				inventory_item_id: itemId,
				tipo: 'salida',
				cantidad: 3,
				motivo: 'Uso en PM',
				usuario_id: ids.adminId,
				referencia_tipo: null,
				referencia_id: null
			});
			expect(result.ok).toBe(true);
			const item = await getInventoryItem(itemId);
			expect(item!.stock_actual).toBe(12); // 15 - 3
		});

		it('rejects salida when insufficient stock', async () => {
			const result = await createMovement({
				inventory_item_id: itemId,
				tipo: 'salida',
				cantidad: 100,
				motivo: 'Exceso',
				usuario_id: ids.adminId,
				referencia_tipo: null,
				referencia_id: null
			});
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.error).toContain('insuficiente');
		});

		it('creates ajuste movement', async () => {
			const result = await createMovement({
				inventory_item_id: itemId,
				tipo: 'ajuste',
				cantidad: 20,
				motivo: 'Inventario físico',
				usuario_id: ids.adminId,
				referencia_tipo: null,
				referencia_id: null
			});
			expect(result.ok).toBe(true);
			const item = await getInventoryItem(itemId);
			expect(item!.stock_actual).toBe(20); // Direct set
		});

		it('rejects movement for non-existent item', async () => {
			const result = await createMovement({
				inventory_item_id: 'non-existent',
				tipo: 'entrada',
				cantidad: 1,
				motivo: 'Test',
				usuario_id: null,
				referencia_tipo: null,
				referencia_id: null
			});
			expect(result.ok).toBe(false);
		});

		it('rejects movement with cantidad <= 0', async () => {
			const result = await createMovement({
				inventory_item_id: itemId,
				tipo: 'entrada',
				cantidad: 0,
				motivo: 'Test',
				usuario_id: null,
				referencia_tipo: null,
				referencia_id: null
			});
			expect(result.ok).toBe(false);
		});
	});

	describe('listMovements', () => {
		it('returns movements', async () => {
			const result = await listMovements();
			expect(result.movements.length).toBeGreaterThan(0);
		});

		it('filters by item', async () => {
			const result = await listMovements({ inventory_item_id: itemId });
			expect(result.movements.length).toBeGreaterThan(0);
		});

		it('filters by tipo', async () => {
			const result = await listMovements({ tipo: 'entrada' });
			expect(result.movements.length).toBeGreaterThan(0);
		});
	});

	describe('low stock', () => {
		it('detects low stock items', async () => {
			// Create an item with stock below minimum
			const result = await createInventoryItem({
				...baseInput(),
				codigo_parte: 'LOW-STOCK-TEST',
				stock_actual: 1,
				stock_minimo: 10
			});
			expect(result.ok).toBe(true);

			const lowItems = await getLowStockItems();
			expect(lowItems.some((i) => i.codigo_parte === 'LOW-STOCK-TEST')).toBe(true);

			const count = await getLowStockCount();
			expect(count).toBeGreaterThan(0);
		});
	});

	describe('deleteInventoryItem', () => {
		it('deletes item without movements', async () => {
			// Create a fresh item with no movements
			const result = await createInventoryItem({
				...baseInput(),
				codigo_parte: 'DELETE-TEST'
			});
			expect(result.ok).toBe(true);
			if (result.ok) {
				const delResult = await deleteInventoryItem({ id: result.data.id });
				expect(delResult.ok).toBe(true);
				const item = await getInventoryItem(result.data.id);
				expect(item).toBeUndefined();
			}
		});

		it('rejects delete when movements exist', async () => {
			const result = await deleteInventoryItem({ id: itemId });
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.error).toContain('movimientos');
		});
	});
});
