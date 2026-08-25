/**
 * Integration test: Complete Inventory Flow
 *
 * Exercises the entire inventory lifecycle:
 *   1. CRUD items → movements → PM-linked tasks → executions with parts → stock verification
 *
 * This is the "thesis demo" test — it proves all pieces work together atomically.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { initTestDb, type SeedIds } from '$lib/server/db/test-helpers';
import { db } from '$lib/server/db';
import {
	createInventoryItem,
	updateInventoryItem,
	getInventoryItem,
	createMovement,
	listMovements,
	getLowStockCount
} from './inventory';
import {
	createPlan,
	addTask,
	scheduleExecution,
	completeExecution,
	type ExecutionPartInput
} from './mantenimiento';

let ids: SeedIds;
let pasteThermalId: string;
let fanId: string;
let ssdId: string;
let planId: string;
let taskIdPaste: string;
let taskIdFan: string;
let execIdPaste: string;
let execIdFan: string;

describe('inventory flow — end-to-end', () => {
	beforeAll(async () => {
		ids = await initTestDb();
	});

	// ═══════════════════════════════════════════════════════════════════════
	// PHASE 1: Inventory CRUD
	// ═══════════════════════════════════════════════════════════════════════

	describe('Phase 1 — CRUD inventory items', () => {
		it('creates a thermal paste item (stock 10)', async () => {
			const result = await createInventoryItem({
				nombre: 'Pasta Térmica MX-4',
				descripcion: 'Pasta térmica Arctic MX-4 4g',
				codigo_parte: 'PASTA-MX4-TEST',
				categoria: 'Refrigeración',
				tipo_equipo_id: null,
				stock_actual: 10,
				stock_minimo: 3,
				ubicacion: 'Almacén Principal'
			});
			expect(result.ok).toBe(true);
			if (result.ok) pasteThermalId = result.data.id;
		});

		it('creates a fan item (stock 8)', async () => {
			const result = await createInventoryItem({
				nombre: 'Ventilador 120mm PWM',
				descripcion: 'Ventilador Noctua NF-S12A',
				codigo_parte: 'FAN-120PWM-TEST',
				categoria: 'Refrigeración',
				tipo_equipo_id: ids.tipoPcId,
				stock_actual: 8,
				stock_minimo: 4,
				ubicacion: 'Almacén Principal'
			});
			expect(result.ok).toBe(true);
			if (result.ok) fanId = result.data.id;
		});

		it('creates an SSD item (stock 3)', async () => {
			const result = await createInventoryItem({
				nombre: 'SSD NVMe 1TB',
				descripcion: 'Samsung 980 PRO NVMe',
				codigo_parte: 'SSD-NVMe-TEST',
				categoria: 'Almacenamiento',
				tipo_equipo_id: ids.tipoPcId,
				stock_actual: 3,
				stock_minimo: 2,
				ubicacion: 'Almacén Servidores'
			});
			expect(result.ok).toBe(true);
			if (result.ok) ssdId = result.data.id;
		});

		it('updates paste item stock to 15', async () => {
			const result = await updateInventoryItem({
				id: pasteThermalId,
				nombre: 'Pasta Térmica MX-4',
				descripcion: 'Pasta térmica Arctic MX-4 4g',
				codigo_parte: 'PASTA-MX4-TEST',
				categoria: 'Refrigeración',
				tipo_equipo_id: null,
				stock_actual: 15,
				stock_minimo: 3,
				ubicacion: 'Almacén Principal'
			});
			expect(result.ok).toBe(true);
		});

		it('verifies updated stock', async () => {
			const item = await getInventoryItem(pasteThermalId);
			expect(item).toBeDefined();
			expect(item!.stock_actual).toBe(15);
		});
	});

	// ═══════════════════════════════════════════════════════════════════════
	// PHASE 2: Stock movements
	// ═══════════════════════════════════════════════════════════════════════

	describe('Phase 2 — Stock movements', () => {
		it('entrada: +5 paste (15 → 20)', async () => {
			const result = await createMovement({
				inventory_item_id: pasteThermalId,
				tipo: 'entrada',
				cantidad: 5,
				motivo: 'Compra de reposición',
				usuario_id: ids.adminId,
				referencia_tipo: null,
				referencia_id: null
			});
			expect(result.ok).toBe(true);
		});

		it('verifies stock after entrada', async () => {
			const item = await getInventoryItem(pasteThermalId);
			expect(item!.stock_actual).toBe(20);
		});

		it('salida: -2 paste (20 → 18)', async () => {
			const result = await createMovement({
				inventory_item_id: pasteThermalId,
				tipo: 'salida',
				cantidad: 2,
				motivo: 'Uso en mantenimiento servidor',
				usuario_id: ids.tecnicoId,
				referencia_tipo: 'ticket',
				referencia_id: null
			});
			expect(result.ok).toBe(true);
		});

		it('verifies stock after salida', async () => {
			const item = await getInventoryItem(pasteThermalId);
			expect(item!.stock_actual).toBe(18);
		});

		it('ajuste: set fan to 6', async () => {
			const result = await createMovement({
				inventory_item_id: fanId,
				tipo: 'ajuste',
				cantidad: 6,
				motivo: 'Ajuste por inventario físico',
				usuario_id: ids.adminId,
				referencia_tipo: null,
				referencia_id: null
			});
			expect(result.ok).toBe(true);
		});

		it('verifies adjusted stock', async () => {
			const item = await getInventoryItem(fanId);
			expect(item!.stock_actual).toBe(6);
		});

		it('salida: -5 fan (6 → 1) → triggers low stock', async () => {
			const result = await createMovement({
				inventory_item_id: fanId,
				tipo: 'salida',
				cantidad: 5,
				motivo: 'Reemplazo en 5 PCs',
				usuario_id: ids.tecnicoId,
				referencia_tipo: 'ticket',
				referencia_id: null
			});
			expect(result.ok).toBe(true);
		});

		it('verifies low stock detection after movement', async () => {
			const item = await getInventoryItem(fanId);
			expect(item!.stock_actual).toBe(1);
			expect(item!.stock_actual).toBeLessThan(item!.stock_minimo);
		});

		it('rejects salida that exceeds stock', async () => {
			const result = await createMovement({
				inventory_item_id: fanId,
				tipo: 'salida',
				cantidad: 10,
				motivo: 'Should fail',
				usuario_id: ids.tecnicoId,
				referencia_tipo: null,
				referencia_id: null
			});
			expect(result.ok).toBe(false);
		});

		it('lists movements for the paste item', async () => {
			const result = await listMovements({ inventory_item_id: pasteThermalId });
			expect(result.movements.length).toBeGreaterThanOrEqual(2);
			expect(result.total).toBeGreaterThanOrEqual(2);
		});
	});

	// ═══════════════════════════════════════════════════════════════════════
	// PHASE 3: PM plan with inventory-linked tasks
	// ═══════════════════════════════════════════════════════════════════════

	describe('Phase 3 — PM plan with inventory-linked tasks', () => {
		it('creates a PC maintenance plan', async () => {
			const result = await createPlan(
				{
					nombre: 'Mantenimiento Preventivo PCs Test',
					descripcion: 'Repaste y verificación de componentes',
					frecuencia_dias: 30,
					equipo_id: '',
					tipo_equipo_id: ids.tipoPcId
				},
				{ id: ids.adminId, rol: 'admin' }
			);
			expect(result.ok).toBe(true);
			if (result.ok) planId = result.data.id;
		});

		it('adds task linked to paste thermal', async () => {
			const result = await addTask(
				{
					plan_id: planId,
					nombre: 'Reaplicar pasta térmica',
					descripcion: 'Retirar disipador, limpiar, aplicar MX-4',
					inventory_item_id: pasteThermalId
				},
				{ id: ids.adminId, rol: 'admin' }
			);
			expect(result.ok).toBe(true);
			if (result.ok) taskIdPaste = result.data.id;
		});

		it('adds task linked to fan', async () => {
			const result = await addTask(
				{
					plan_id: planId,
					nombre: 'Verificar ventiladores',
					descripcion: 'Chequear RPM y temperatura',
					inventory_item_id: fanId
				},
				{ id: ids.adminId, rol: 'admin' }
			);
			expect(result.ok).toBe(true);
			if (result.ok) taskIdFan = result.data.id;
		});

		it('verifies task has inventory_item_id', async () => {
			const task = await db.query.pm_tasks.findFirst({
				where: (t, { eq }) => eq(t.id, taskIdPaste)
			});
			expect(task).toBeDefined();
			expect(task!.inventory_item_id).toBe(pasteThermalId);
		});
	});

	// ═══════════════════════════════════════════════════════════════════════
	// PHASE 4: Schedule and complete executions with parts
	// ═══════════════════════════════════════════════════════════════════════

	describe('Phase 4 — Execution with parts (atomic stock deduction)', () => {
		it('schedules executions for the plan', async () => {
			const result = await scheduleExecution(
				{
					plan_id: planId,
					ejecutado_por: ids.tecnicoId,
					fecha_programada: '2026-09-01'
				},
				{ id: ids.adminId, rol: 'admin' }
			);
			expect(result.ok).toBe(true);
			if (result.ok) expect(result.data.scheduled).toBe(2);
		});

		it('finds the paste execution', async () => {
			const exec = await db.query.pm_executions.findFirst({
				where: (e, { and, eq }) => and(eq(e.plan_id, planId), eq(e.tarea_id, taskIdPaste))
			});
			expect(exec).toBeDefined();
			expect(exec!.resultado).toBe('pendiente');
			execIdPaste = exec!.id;
		});

		it('finds the fan execution', async () => {
			const exec = await db.query.pm_executions.findFirst({
				where: (e, { and, eq }) => and(eq(e.plan_id, planId), eq(e.tarea_id, taskIdFan))
			});
			expect(exec).toBeDefined();
			execIdFan = exec!.id;
		});

		it('completes paste execution with part (stock: 18 → 17)', async () => {
			const before = await getInventoryItem(pasteThermalId);
			const stockBefore = before!.stock_actual;

			const parts: ExecutionPartInput[] = [
				{
					inventory_item_id: pasteThermalId,
					accion: 'instalado',
					cantidad: 1,
					observaciones: 'Aplicación de pasta MX-4 en CPU'
				}
			];

			const result = await completeExecution(
				{
					id: execIdPaste,
					resultado: 'completado',
					observaciones: 'Repaste exitoso. Temp: 38°C → 32°C.',
					parts
				},
				{ id: ids.tecnicoId, rol: 'tecnico' }
			);
			expect(result.ok).toBe(true);

			const after = await getInventoryItem(pasteThermalId);
			expect(after!.stock_actual).toBe(stockBefore - 1);
		});

		it('verifies pm_execution_parts record was created', async () => {
			const part = await db.query.pm_execution_parts.findFirst({
				where: (p, { eq }) => eq(p.pm_execution_id, execIdPaste)
			});
			expect(part).toBeDefined();
			expect(part!.inventory_item_id).toBe(pasteThermalId);
			expect(part!.accion).toBe('instalado');
			expect(part!.cantidad).toBe(1);
		});

		it('verifies movement record was created for PM execution', async () => {
			const movement = await db.query.inventory_movements.findFirst({
				where: (m, { and, eq }) =>
					and(
						eq(m.inventory_item_id, pasteThermalId),
						eq(m.referencia_tipo, 'pm_execution'),
						eq(m.referencia_id, execIdPaste)
					)
			});
			expect(movement).toBeDefined();
			expect(movement!.tipo).toBe('salida');
			expect(movement!.cantidad).toBe(1);
		});

		it('completes fan execution without parts (no stock impact)', async () => {
			const before = await getInventoryItem(fanId);
			const stockBefore = before!.stock_actual;

			const result = await completeExecution(
				{
					id: execIdFan,
					resultado: 'completado',
					observaciones: 'Ventiladores OK. Sin reemplazo necesario.',
					parts: []
				},
				{ id: ids.tecnicoId, rol: 'tecnico' }
			);
			expect(result.ok).toBe(true);

			const after = await getInventoryItem(fanId);
			expect(after!.stock_actual).toBe(stockBefore);
		});

		it('completes SSD execution with reemplazado (stock: 3 → 2)', async () => {
			// Create a separate plan+task+exec for SSD
			const planResult = await createPlan(
				{
					nombre: 'SSD Test Plan',
					descripcion: 'Test plan for SSD',
					frecuencia_dias: 90,
					equipo_id: '',
					tipo_equipo_id: ''
				},
				{ id: ids.adminId, rol: 'admin' }
			);
			expect(planResult.ok).toBe(true);
			const ssdPlanId = (planResult as { ok: true; data: { id: string } }).data.id;

			const taskResult = await addTask(
				{
					plan_id: ssdPlanId,
					nombre: 'Verificar SSD',
					descripcion: 'Leer SMART',
					inventory_item_id: ssdId
				},
				{ id: ids.adminId, rol: 'admin' }
			);
			expect(taskResult.ok).toBe(true);
			const ssdTaskId = (taskResult as { ok: true; data: { id: string } }).data.id;

			const schedResult = await scheduleExecution(
				{
					plan_id: ssdPlanId,
					ejecutado_por: ids.tecnicoId,
					fecha_programada: '2026-09-05'
				},
				{ id: ids.adminId, rol: 'admin' }
			);
			expect(schedResult.ok).toBe(true);

			const exec = await db.query.pm_executions.findFirst({
				where: (e, { and, eq }) => and(eq(e.plan_id, ssdPlanId), eq(e.tarea_id, ssdTaskId))
			});
			expect(exec).toBeDefined();

			const before = await getInventoryItem(ssdId);
			const stockBefore = before!.stock_actual;

			const parts: ExecutionPartInput[] = [
				{
					inventory_item_id: ssdId,
					accion: 'reemplazado',
					cantidad: 1,
					observaciones: 'SSD reemplazado preventivamente'
				}
			];

			const result = await completeExecution(
				{
					id: exec!.id,
					resultado: 'completado',
					observaciones: 'SSD con 15% usage. Reemplazo preventivo.',
					parts
				},
				{ id: ids.tecnicoId, rol: 'tecnico' }
			);
			expect(result.ok).toBe(true);

			const after = await getInventoryItem(ssdId);
			expect(after!.stock_actual).toBe(stockBefore - 1);
		});
	});

	// ═══════════════════════════════════════════════════════════════════════
	// PHASE 5: Verification
	// ═══════════════════════════════════════════════════════════════════════

	describe('Phase 5 — Final verification', () => {
		it('paste item final stock is correct (18 - 1 = 17)', async () => {
			const item = await getInventoryItem(pasteThermalId);
			expect(item!.stock_actual).toBe(17);
		});

		it('fan item final stock is unchanged (1)', async () => {
			const item = await getInventoryItem(fanId);
			expect(item!.stock_actual).toBe(1);
		});

		it('SSD item final stock is correct (3 - 1 = 2)', async () => {
			const item = await getInventoryItem(ssdId);
			expect(item!.stock_actual).toBe(2);
		});

		it('low stock count includes fan (stock 1 < min 4)', async () => {
			const count = await getLowStockCount();
			expect(count).toBeGreaterThanOrEqual(1);
		});

		it('total movements include PM execution movements', async () => {
			const allMovements = await listMovements({});
			expect(allMovements.total).toBeGreaterThanOrEqual(5);
		});

		it('execution history shows parts count', async () => {
			const execWithParts = await db.query.pm_executions.findFirst({
				where: (e, { eq }) => eq(e.id, execIdPaste),
				with: { parts: true }
			});
			expect(execWithParts).toBeDefined();
			expect(execWithParts!.parts.length).toBe(1);
			expect(execWithParts!.parts[0].accion).toBe('instalado');
		});

		it('cannot complete an already-completed execution', async () => {
			const result = await completeExecution(
				{
					id: execIdPaste,
					resultado: 'completado',
					observaciones: 'Should fail'
				},
				{ id: ids.tecnicoId, rol: 'tecnico' }
			);
			expect(result.ok).toBe(false);
		});

		it('consultor cannot complete executions', async () => {
			const result = await completeExecution(
				{
					id: execIdFan,
					resultado: 'completado',
					observaciones: 'Should fail'
				},
				{ id: ids.consultorId, rol: 'consultor' }
			);
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.status).toBe(403);
		});
	});
});
