// Test database helpers: programmatically push the schema and seed a minimal
// dataset onto the per-file in-memory SQLite DB.
//
// The env is set by test-setup.ts (vitest setupFiles) BEFORE this module's
// import graph loads, so `db` from ./index always binds to ':memory:'. Re-assert
// here as belt-and-braces (spec TC-2).
process.env.DATABASE_URL = 'file::memory:?cache=shared';

import * as schema from './schema';
import { db } from './index';
import {
	users,
	equipment_types,
	equipment,
	proveedores,
	inventory_items,
	inventory_movements,
	preventive_maintenance_plans,
	pm_tasks,
	pm_executions,
	pm_execution_parts
} from './schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const TEST_PASSWORD = 'test-password-123';

const SALT_ROUNDS = 10;

// bcrypt hash computed ONCE per worker (cached module-level promise) — never
// per test (bcrypt ≈100ms per hash, spec TC-11).
let passwordHashPromise: Promise<string> | null = null;

export function getTestPasswordHash(): Promise<string> {
	passwordHashPromise ??= bcrypt.hash(TEST_PASSWORD, SALT_ROUNDS);
	return passwordHashPromise;
}

export interface SeedIds {
	adminId: string;
	tecnicoId: string;
	consultorId: string;
	tipoPcId: string;
	tipoNotebookId: string;
	eqOperativoId: string;
	eqReparacionId: string;
	eqPrestadoId: string;
	eqBajaId: string;
	proveedorId: string;
}

/**
 * Push the schema programmatically. Primary path uses `pushSQLiteSchema` from
 * drizzle-kit/api (dynamic import so a missing export cannot break module load);
 * fallback: generate a temp migration (generateSQLiteDrizzleJson +
 * generateMigration) and execute the DDL directly — same net effect, zero
 * migration files on disk.
 *
 * NOTE: the schema must be passed as the module's export namespace itself (like
 * the CLI's `require(file)` does), NOT wrapped as `{ schema }` — drizzle-kit's
 * prepareFromExports runs `Object.values(imports)` and classifies each value.
 */
async function pushSchema(): Promise<void> {
	try {
		const { pushSQLiteSchema } = await import('drizzle-kit/api');
		const { apply } = await pushSQLiteSchema(schema, db);
		await apply();
		return;
	} catch {
		// Fallback path — documented in the design (components/test-helpers.md)
		const { generateSQLiteDrizzleJson, generateMigration } = await import('drizzle-kit/api');
		const { sql } = await import('drizzle-orm');
		const prev = await generateSQLiteDrizzleJson({});
		const cur = await generateSQLiteDrizzleJson(schema);
		const statements = await generateMigration(prev, cur);
		for (const stmt of statements) {
			await db.run(sql.raw(stmt));
		}
	}
}

export async function seedTestData(): Promise<SeedIds> {
	const passwordHash = await getTestPasswordHash();

	const userRows = await db
		.insert(users)
		.values([
			{
				username: 'admin',
				email: 'admin@overhaul.test',
				password_hash: passwordHash,
				nombre: 'Admin',
				apellido: 'Sistema',
				rol: 'admin',
				activo: true
			},
			{
				username: 'tecnico1',
				email: 'tecnico@overhaul.test',
				password_hash: passwordHash,
				nombre: 'Carlos',
				apellido: 'Méndez',
				rol: 'tecnico',
				activo: true
			},
			{
				username: 'consultor1',
				email: 'consultor@overhaul.test',
				password_hash: passwordHash,
				nombre: 'Laura',
				apellido: 'Rivas',
				rol: 'consultor',
				activo: true
			}
		])
		.returning({ id: users.id, username: users.username });

	const idByUsername = new Map(userRows.map((r) => [r.username, r.id]));

	const typeRows = await db
		.insert(equipment_types)
		.values([
			{ nombre: 'PC', descripcion: 'Computadora de escritorio', icono: 'PC' },
			{ nombre: 'Notebook', descripcion: 'Computadora portátil', icono: 'NB' }
		])
		.returning({ id: equipment_types.id, nombre: equipment_types.nombre });

	const tipoIds = new Map(typeRows.map((t) => [t.nombre, t.id]));

	const [proveedorRow] = await db
		.insert(proveedores)
		.values({ nombre: 'Proveedor Test', contacto: 'Test', email: 'test@proveedor.com' })
		.returning({ id: proveedores.id });

	// 4 equipos covering all equipment states (fixtures for transition/role-guard tests)
	const [eqOperativo, eqReparacion, eqPrestado, eqBaja] = await db
		.insert(equipment)
		.values([
			{
				tipo_id: tipoIds.get('PC')!,
				numero_serie: 'SN-TEST-001',
				modelo: 'OptiPlex Test',
				marca: 'Dell',
				estado: 'operativo',
				ubicacion: 'Oficina 101',
				proveedor_id: proveedorRow.id
			},
			{
				tipo_id: tipoIds.get('Notebook')!,
				numero_serie: 'SN-TEST-002',
				modelo: 'ThinkPad Test',
				marca: 'Lenovo',
				estado: 'en_reparacion',
				ubicacion: 'Taller'
			},
			{
				tipo_id: tipoIds.get('Notebook')!,
				numero_serie: 'SN-TEST-003',
				modelo: 'IdeaPad Test',
				marca: 'Lenovo',
				estado: 'prestado',
				ubicacion: 'Oficina 102'
			},
			{
				tipo_id: tipoIds.get('PC')!,
				numero_serie: 'SN-TEST-004',
				modelo: 'OptiPlex Baja',
				marca: 'Dell',
				estado: 'dado_de_baja',
				ubicacion: 'Depósito'
			}
		])
		.returning({ id: equipment.id });

	return {
		adminId: idByUsername.get('admin')!,
		tecnicoId: idByUsername.get('tecnico1')!,
		consultorId: idByUsername.get('consultor1')!,
		tipoPcId: tipoIds.get('PC')!,
		tipoNotebookId: tipoIds.get('Notebook')!,
		eqOperativoId: eqOperativo.id,
		eqReparacionId: eqReparacion.id,
		eqPrestadoId: eqPrestado.id,
		eqBajaId: eqBaja.id,
		proveedorId: proveedorRow.id
	};
}

// ─── Inventory Flow Seed ─────────────────────────────────────────────────────
// Full lifecycle: items → movements → PM plans/tasks → executions with parts.
// Extends SeedIds with inventory-related IDs for test assertions.

export interface InventorySeedIds extends SeedIds {
	pasteId: string;
	fanId: string;
	ssdId: string;
	planPCId: string;
	planServerId: string;
	taskPasteId: string;
	taskFanId: string;
	taskSSDId: string;
	execPasteId: string;
	execFanId: string;
	execSSDId: string;
}

export async function seedInventoryTestData(): Promise<InventorySeedIds> {
	const base = await initTestDb();
	const adminId = base.adminId;
	const tecnicoId = base.tecnicoId;

	// ── Inventory items ──
	const itemRows = await db
		.insert(inventory_items)
		.values([
			{
				nombre: 'Pasta Térmica MX-4',
				descripcion: 'Pasta térmica Arctic MX-4 4g',
				codigo_parte: 'PASTA-MX4-TEST',
				categoria: 'Refrigeración',
				stock_actual: 15,
				stock_minimo: 3,
				ubicacion: 'Almacén Principal'
			},
			{
				nombre: 'Ventilador 120mm PWM',
				descripcion: 'Ventilador Noctua NF-S12A',
				codigo_parte: 'FAN-120PWM-TEST',
				categoria: 'Refrigeración',
				tipo_equipo_id: base.tipoPcId,
				stock_actual: 6,
				stock_minimo: 4,
				ubicacion: 'Almacén Principal'
			},
			{
				nombre: 'SSD NVMe 1TB',
				descripcion: 'Samsung 980 PRO NVMe',
				codigo_parte: 'SSD-NVMe-TEST',
				categoria: 'Almacenamiento',
				tipo_equipo_id: base.tipoPcId,
				stock_actual: 3,
				stock_minimo: 2,
				ubicacion: 'Almacén Servidores'
			},
			{
				nombre: 'Filtro HEPA',
				descripcion: 'Filtro HEPA reemplazable para rack',
				codigo_parte: 'FILTER-HEPA-TEST',
				categoria: 'Refrigeración',
				stock_actual: 10,
				stock_minimo: 5,
				ubicacion: 'Almacén Principal'
			},
			{
				nombre: 'Tóner HP 305A',
				descripcion: 'Cartucho tóner negro HP 305A',
				codigo_parte: 'TONER-HP305A-TEST',
				categoria: 'Tintas',
				stock_actual: 4,
				stock_minimo: 3,
				ubicacion: 'Almacén Secundario'
			}
		])
		.returning({
			id: inventory_items.id,
			nombre: inventory_items.nombre,
			stock_actual: inventory_items.stock_actual
		});

	const itemByName = new Map(itemRows.map((r) => [r.nombre, r.id]));
	const pasteId = itemByName.get('Pasta Térmica MX-4')!;
	const fanId = itemByName.get('Ventilador 120mm PWM')!;
	const ssdId = itemByName.get('SSD NVMe 1TB')!;
	const hepaId = itemByName.get('Filtro HEPA')!;
	const toId = itemByName.get('Tóner HP 305A')!;

	// ── Stock movements ──
	await db.insert(inventory_movements).values([
		{
			inventory_item_id: pasteId,
			tipo: 'entrada',
			cantidad: 5,
			motivo: 'Compra de reposición',
			usuario_id: adminId
		},
		{
			inventory_item_id: pasteId,
			tipo: 'salida',
			cantidad: 2,
			motivo: 'Uso en mantenimiento servidor',
			usuario_id: tecnicoId
		},
		{
			inventory_item_id: fanId,
			tipo: 'ajuste',
			cantidad: 6,
			motivo: 'Ajuste por inventario físico',
			usuario_id: adminId
		},
		{
			inventory_item_id: fanId,
			tipo: 'salida',
			cantidad: 5,
			motivo: 'Reemplazo en 5 PCs',
			usuario_id: tecnicoId
		}
	]);
	// Stock after movements: paste=13 (15+5-2 via direct update below), fan=1 (6-5)
	await db
		.update(inventory_items)
		.set({ stock_actual: 13 })
		.where(sql`${inventory_items.id} = ${pasteId}`);
	await db
		.update(inventory_items)
		.set({ stock_actual: 1 })
		.where(sql`${inventory_items.id} = ${fanId}`);

	// ── PM Plan: PC Maintenance (tasks linked to inventory) ──
	const [planPC] = await db
		.insert(preventive_maintenance_plans)
		.values({
			nombre: 'Mantenimiento Preventivo PCs Test',
			descripcion: 'Repaste y verificación de componentes',
			tipo_equipo_id: base.tipoPcId,
			frecuencia_dias: 30
		})
		.returning({ id: preventive_maintenance_plans.id });

	const pcTasks = await db
		.insert(pm_tasks)
		.values([
			{
				plan_id: planPC.id,
				nombre: 'Reaplicar pasta térmica',
				descripcion: 'Retirar disipador, limpiar, aplicar MX-4',
				orden: 1,
				inventory_item_id: pasteId
			},
			{
				plan_id: planPC.id,
				nombre: 'Verificar ventiladores',
				descripcion: 'Chequear RPM y temperatura',
				orden: 2,
				inventory_item_id: fanId
			},
			{
				plan_id: planPC.id,
				nombre: 'Limpiar filtros',
				descripcion: 'Aspirar polvo de gabinete',
				orden: 3
			}
		])
		.returning({ id: pm_tasks.id, nombre: pm_tasks.nombre });

	const taskByName = new Map(pcTasks.map((t) => [t.nombre, t.id]));
	const taskPasteId = taskByName.get('Reaplicar pasta térmica')!;
	const taskFanId = taskByName.get('Verificar ventiladores')!;

	// ── PM Plan: Server Maintenance (SSD linked) ──
	const [planServer] = await db
		.insert(preventive_maintenance_plans)
		.values({
			nombre: 'Mantenimiento Servidores Test',
			descripcion: 'Revisión profunda de hardware',
			equipo_id: base.eqOperativoId,
			frecuencia_dias: 90
		})
		.returning({ id: preventive_maintenance_plans.id });

	const serverTasks = await db
		.insert(pm_tasks)
		.values([
			{
				plan_id: planServer.id,
				nombre: 'Verificar SSD',
				descripcion: 'Leer SMART',
				orden: 1,
				inventory_item_id: ssdId
			}
		])
		.returning({ id: pm_tasks.id, nombre: pm_tasks.nombre });

	const taskSSDId = serverTasks[0].id;

	// ── PM Executions: schedule then complete with parts ──
	const pcExecs = await db
		.insert(pm_executions)
		.values(
			pcTasks.map((t) => ({
				plan_id: planPC.id,
				tarea_id: t.id,
				ejecutado_por: tecnicoId,
				fecha_programada: '2026-08-20',
				resultado: 'pendiente' as const
			}))
		)
		.returning({ id: pm_executions.id, tarea_id: pm_executions.tarea_id });

	const execPasteId = pcExecs.find((e) => e.tarea_id === taskPasteId)!.id;
	const execFanId = pcExecs.find((e) => e.tarea_id === taskFanId)!.id;

	// Complete paste execution with part → stock 13 → 12
	await db.transaction(async (tx) => {
		await tx
			.update(pm_executions)
			.set({
				fecha_ejecucion: '2026-08-20T10:30:00.000Z',
				resultado: 'completado',
				observaciones: 'Repaste exitoso. Temp: 38°C → 32°C.'
			})
			.where(sql`${pm_executions.id} = ${execPasteId}`);

		await tx.insert(pm_execution_parts).values({
			pm_execution_id: execPasteId,
			inventory_item_id: pasteId,
			accion: 'instalado',
			cantidad: 1,
			observaciones: 'Aplicación de pasta MX-4 en CPU'
		});

		await tx
			.update(inventory_items)
			.set({ stock_actual: 12 })
			.where(sql`${inventory_items.id} = ${pasteId}`);

		await tx.insert(inventory_movements).values({
			inventory_item_id: pasteId,
			tipo: 'salida',
			cantidad: 1,
			motivo: 'PM ejecución: instalado — pasta térmica',
			usuario_id: tecnicoId,
			referencia_tipo: 'pm_execution',
			referencia_id: execPasteId
		});
	});

	// Complete fan execution without parts (no stock impact)
	await db
		.update(pm_executions)
		.set({
			fecha_ejecucion: '2026-08-20T11:00:00.000Z',
			resultado: 'completado',
			observaciones: 'Ventiladores OK. Sin reemplazo necesario.'
		})
		.where(sql`${pm_executions.id} = ${execFanId}`);

	// ── PM Executions: Server plan ──
	const serverExecs = await db
		.insert(pm_executions)
		.values(
			serverTasks.map((t) => ({
				plan_id: planServer.id,
				tarea_id: t.id,
				ejecutado_por: tecnicoId,
				fecha_programada: '2026-08-22',
				resultado: 'pendiente' as const
			}))
		)
		.returning({ id: pm_executions.id, tarea_id: pm_executions.tarea_id });

	const execSSDId = serverExecs[0].id;

	// Complete SSD execution with reemplazado → stock 3 → 2
	await db.transaction(async (tx) => {
		await tx
			.update(pm_executions)
			.set({
				fecha_ejecucion: '2026-08-22T09:00:00.000Z',
				resultado: 'completado',
				observaciones: 'SSD con 15% usage. Reemplazo preventivo.'
			})
			.where(sql`${pm_executions.id} = ${execSSDId}`);

		await tx.insert(pm_execution_parts).values({
			pm_execution_id: execSSDId,
			inventory_item_id: ssdId,
			accion: 'reemplazado',
			cantidad: 1,
			observaciones: 'Reemplazo preventivo SSD NVMe'
		});

		await tx
			.update(inventory_items)
			.set({ stock_actual: 2 })
			.where(sql`${inventory_items.id} = ${ssdId}`);

		await tx.insert(inventory_movements).values({
			inventory_item_id: ssdId,
			tipo: 'salida',
			cantidad: 1,
			motivo: 'PM ejecución: reemplazado — SSD',
			usuario_id: tecnicoId,
			referencia_tipo: 'pm_execution',
			referencia_id: execSSDId
		});
	});

	return {
		...base,
		pasteId,
		fanId,
		ssdId,
		planPCId: planPC.id,
		planServerId: planServer.id,
		taskPasteId,
		taskFanId,
		taskSSDId,
		execPasteId,
		execFanId,
		execSSDId
	};
}

let initialized = false;
let seedIds: SeedIds | null = null;

/**
 * Idempotent per file: pushes schema + seeds and returns the stable seed ids.
 * Call in beforeAll of every DB-backed test file. The seed ids are cached so
 * repeated calls never re-seed (re-inserting would hit unique constraints).
 */
export async function initTestDb(): Promise<SeedIds> {
	if (!seedIds) {
		if (!initialized) {
			await pushSchema();
			initialized = true;
		}
		seedIds = await seedTestData();
	}
	return seedIds;
}
