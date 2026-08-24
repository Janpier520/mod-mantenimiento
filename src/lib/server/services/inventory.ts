import { db } from '$lib/server/db';
import { inventory_items, inventory_movements } from '$lib/server/db/schema';
import { eq, and, asc, desc, sql, lt } from 'drizzle-orm';
import type { ServiceResult } from './types';

// ─── Input types ──────────────────────────────────────────────────────────────

export interface InventoryItemInput {
	nombre: string;
	descripcion: string;
	codigo_parte: string;
	categoria: string;
	tipo_equipo_id: string | null;
	stock_actual: number;
	stock_minimo: number;
	ubicacion: string;
}

export interface UpdateInventoryItemInput extends InventoryItemInput {
	id: string;
}

export interface DeleteInventoryItemInput {
	id: string;
}

export interface MovementInput {
	inventory_item_id: string;
	tipo: 'entrada' | 'salida' | 'ajuste';
	cantidad: number;
	motivo: string;
	usuario_id: string | null;
	referencia_tipo: string | null;
	referencia_id: string | null;
}

export type InventoryResult = ServiceResult<{ id: string }>;
export type MovementResult = ServiceResult<{ id: string }>;

// ─── Validation ───────────────────────────────────────────────────────────────

function validateItemInputs(input: InventoryItemInput): string | null {
	if (!input.nombre || input.nombre.trim().length === 0) return 'El nombre es obligatorio';
	if (!input.categoria || input.categoria.trim().length === 0) return 'La categoría es obligatoria';
	if (input.stock_actual < 0) return 'El stock actual no puede ser negativo';
	if (input.stock_minimo < 0) return 'El stock mínimo no puede ser negativo';
	return null;
}

function validateMovementInputs(input: MovementInput): string | null {
	if (!input.inventory_item_id) return 'El ítem es obligatorio';
	if (!['entrada', 'salida', 'ajuste'].includes(input.tipo)) return 'Tipo de movimiento no válido';
	if (input.cantidad <= 0) return 'La cantidad debe ser mayor a 0';
	if (!input.motivo || input.motivo.trim().length === 0) return 'El motivo es obligatorio';
	return null;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createInventoryItem(input: InventoryItemInput): Promise<InventoryResult> {
	const validationError = validateItemInputs(input);
	if (validationError) return { ok: false, error: validationError };

	const [row] = await db
		.insert(inventory_items)
		.values({
			nombre: input.nombre.trim(),
			descripcion: input.descripcion?.trim() || '',
			codigo_parte: input.codigo_parte?.trim() || null,
			categoria: input.categoria.trim(),
			tipo_equipo_id: input.tipo_equipo_id || null,
			stock_actual: input.stock_actual,
			stock_minimo: input.stock_minimo,
			ubicacion: input.ubicacion?.trim() || 'Almacén Principal'
		})
		.returning({ id: inventory_items.id });

	return { ok: true, data: { id: row.id } };
}

export async function updateInventoryItem(
	input: UpdateInventoryItemInput
): Promise<InventoryResult> {
	const validationError = validateItemInputs(input);
	if (validationError) return { ok: false, error: validationError };

	const existing = await db.query.inventory_items.findFirst({
		where: eq(inventory_items.id, input.id)
	});
	if (!existing) return { ok: false, error: 'Ítem no encontrado', status: 404 };

	await db
		.update(inventory_items)
		.set({
			nombre: input.nombre.trim(),
			descripcion: input.descripcion?.trim() || '',
			codigo_parte: input.codigo_parte?.trim() || null,
			categoria: input.categoria.trim(),
			tipo_equipo_id: input.tipo_equipo_id || null,
			stock_actual: input.stock_actual,
			stock_minimo: input.stock_minimo,
			ubicacion: input.ubicacion?.trim() || 'Almacén Principal'
		})
		.where(eq(inventory_items.id, input.id));

	return { ok: true, data: { id: input.id } };
}

export async function deleteInventoryItem(
	input: DeleteInventoryItemInput
): Promise<InventoryResult> {
	const existing = await db.query.inventory_items.findFirst({
		where: eq(inventory_items.id, input.id)
	});
	if (!existing) return { ok: false, error: 'Ítem no encontrado', status: 404 };

	// Check if item has any movements
	const movement = await db.query.inventory_movements.findFirst({
		where: eq(inventory_movements.inventory_item_id, input.id)
	});
	if (movement) {
		return { ok: false, error: 'No se puede eliminar un ítem con movimientos registrados' };
	}

	await db.delete(inventory_items).where(eq(inventory_items.id, input.id));
	return { ok: true, data: { id: input.id } };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export interface InventoryFilters {
	search?: string;
	categoria?: string;
	tipo_equipo_id?: string;
	stock_bajo?: boolean;
	page?: number;
	pageSize?: number;
}

const PAGE_SIZE = 10;

export async function listInventoryItems(filters: InventoryFilters = {}) {
	const conditions = [];

	if (filters.search) {
		const term = `%${filters.search}%`;
		conditions.push(
			sql`(${inventory_items.nombre} LIKE ${term} OR ${inventory_items.codigo_parte} LIKE ${term} OR ${inventory_items.descripcion} LIKE ${term})`
		);
	}
	if (filters.categoria) {
		conditions.push(eq(inventory_items.categoria, filters.categoria));
	}
	if (filters.tipo_equipo_id) {
		conditions.push(eq(inventory_items.tipo_equipo_id, filters.tipo_equipo_id));
	}
	if (filters.stock_bajo) {
		conditions.push(lt(inventory_items.stock_actual, inventory_items.stock_minimo));
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined;
	const page = filters.page || 1;
	const pageSize = filters.pageSize || PAGE_SIZE;

	const [countResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(inventory_items)
		.where(where);

	const items = await db
		.select()
		.from(inventory_items)
		.where(where)
		.orderBy(asc(inventory_items.nombre))
		.limit(pageSize)
		.offset((page - 1) * pageSize);

	return {
		items,
		total: Number(countResult.count),
		page,
		pageSize,
		totalPages: Math.ceil(Number(countResult.count) / pageSize)
	};
}

export async function getInventoryItem(id: string) {
	return db.query.inventory_items.findFirst({
		where: eq(inventory_items.id, id)
	});
}

export async function getCategorias() {
	const result = await db
		.selectDistinct({ categoria: inventory_items.categoria })
		.from(inventory_items)
		.orderBy(asc(inventory_items.categoria));
	return result.map((r) => r.categoria);
}

export async function getLowStockItems() {
	return db
		.select()
		.from(inventory_items)
		.where(lt(inventory_items.stock_actual, inventory_items.stock_minimo))
		.orderBy(asc(inventory_items.nombre));
}

export async function getLowStockCount() {
	const [result] = await db
		.select({ count: sql<number>`count(*)` })
		.from(inventory_items)
		.where(lt(inventory_items.stock_actual, inventory_items.stock_minimo));
	return Number(result.count);
}

// ─── Movements ────────────────────────────────────────────────────────────────

export async function createMovement(input: MovementInput): Promise<MovementResult> {
	const validationError = validateMovementInputs(input);
	if (validationError) return { ok: false, error: validationError };

	const item = await db.query.inventory_items.findFirst({
		where: eq(inventory_items.id, input.inventory_item_id)
	});
	if (!item) return { ok: false, error: 'Ítem no encontrado', status: 404 };

	// Calculate new stock
	let newStock = item.stock_actual;
	if (input.tipo === 'entrada') {
		newStock += input.cantidad;
	} else if (input.tipo === 'salida') {
		newStock -= input.cantidad;
		if (newStock < 0) {
			return {
				ok: false,
				error: `Stock insuficiente. Disponible: ${item.stock_actual}, solicitado: ${input.cantidad}`
			};
		}
	} else if (input.tipo === 'ajuste') {
		newStock = input.cantidad; // Direct assignment
	}

	// Atomic: create movement + update stock
	await db.transaction(async (tx) => {
		await tx.insert(inventory_movements).values({
			inventory_item_id: input.inventory_item_id,
			tipo: input.tipo,
			cantidad: input.cantidad,
			motivo: input.motivo.trim(),
			usuario_id: input.usuario_id,
			referencia_tipo: input.referencia_tipo,
			referencia_id: input.referencia_id
		});

		await tx
			.update(inventory_items)
			.set({ stock_actual: newStock })
			.where(eq(inventory_items.id, input.inventory_item_id));
	});

	return { ok: true, data: { id: input.inventory_item_id } };
}

export interface MovementFilters {
	inventory_item_id?: string;
	tipo?: 'entrada' | 'salida' | 'ajuste';
	page?: number;
	pageSize?: number;
}

export async function listMovements(filters: MovementFilters = {}) {
	const conditions = [];

	if (filters.inventory_item_id) {
		conditions.push(eq(inventory_movements.inventory_item_id, filters.inventory_item_id));
	}
	if (filters.tipo) {
		conditions.push(eq(inventory_movements.tipo, filters.tipo));
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined;
	const page = filters.page || 1;
	const pageSize = filters.pageSize || PAGE_SIZE;

	const [countResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(inventory_movements)
		.where(where);

	const movements = await db
		.select()
		.from(inventory_movements)
		.where(where)
		.orderBy(desc(inventory_movements.created_at))
		.limit(pageSize)
		.offset((page - 1) * pageSize);

	return {
		movements,
		total: Number(countResult.count),
		page,
		pageSize,
		totalPages: Math.ceil(Number(countResult.count) / pageSize)
	};
}
