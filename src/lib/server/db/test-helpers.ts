// Test database helpers: programmatically push the schema and seed a minimal
// dataset onto the per-file in-memory SQLite DB.
//
// The env is set by test-setup.ts (vitest setupFiles) BEFORE this module's
// import graph loads, so `db` from ./index always binds to ':memory:'. Re-assert
// here as belt-and-braces (spec TC-2).
process.env.DATABASE_URL = 'file::memory:';

import * as schema from './schema';
import { db } from './index';
import { users, equipment_types, equipment, proveedores } from './schema';
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
