import { describe, it, expect, beforeAll } from 'vitest';
import {
	isLastActiveAdmin,
	isUsernameTaken,
	isEmailTaken,
	isEquipmentTypeNameTaken,
	userExists
} from './validators';
import { db } from './db';
import { initTestDb } from './db/test-helpers';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

// TC-7: DB-backed validators — duplicate checks with excludeUserId and
// last-active-admin semantics against the in-memory DB.

async function seedAdmin(username: string, email: string, activo: boolean) {
	const [row] = await db
		.insert(users)
		.values({
			username,
			email,
			password_hash: 'not-a-real-hash',
			nombre: 'Extra',
			apellido: 'Admin',
			rol: 'admin',
			activo
		})
		.returning({ id: users.id });
	return row.id;
}

describe('isLastActiveAdmin (TC-7)', () => {
	beforeAll(async () => {
		await initTestDb();
	});

	it('returns true when the user is the only active admin', async () => {
		const admin = await db.query.users.findFirst({ where: eq(users.username, 'admin') });
		expect(await isLastActiveAdmin(admin!.id)).toBe(true);
	});

	it('returns false once a second active admin exists', async () => {
		const admin = await db.query.users.findFirst({ where: eq(users.username, 'admin') });
		await seedAdmin('admin-extra-1', 'extra1@equiplab.test', true);
		expect(await isLastActiveAdmin(admin!.id)).toBe(false);
	});

	it('returns false for a non-admin user', async () => {
		const tecnico = await db.query.users.findFirst({ where: eq(users.username, 'tecnico1') });
		expect(await isLastActiveAdmin(tecnico!.id)).toBe(false);
	});

	it('returns false for an inactive admin', async () => {
		const inactiveId = await seedAdmin('admin-inactivo', 'inactive@equiplab.test', false);
		expect(await isLastActiveAdmin(inactiveId)).toBe(false);
	});

	it('returns true again for the original admin when only it is active', async () => {
		const admin = await db.query.users.findFirst({ where: eq(users.username, 'admin') });
		// deactivate the extra active admin from the earlier test
		await db.update(users).set({ activo: false }).where(eq(users.username, 'admin-extra-1'));
		expect(await isLastActiveAdmin(admin!.id)).toBe(true);
	});
});

describe('duplicate checks with exclusion (TC-7)', () => {
	beforeAll(async () => {
		await initTestDb();
	});

	it('isUsernameTaken detects the owner and respects excludeUserId', async () => {
		const admin = await db.query.users.findFirst({ where: eq(users.username, 'admin') });
		expect(await isUsernameTaken('admin')).toBe(true);
		expect(await isUsernameTaken('admin', admin!.id)).toBe(false);
		expect(await isUsernameTaken('nadie')).toBe(false);
	});

	it('isEmailTaken detects the owner and respects excludeUserId', async () => {
		const admin = await db.query.users.findFirst({ where: eq(users.username, 'admin') });
		expect(await isEmailTaken('admin@equiplab.test')).toBe(true);
		expect(await isEmailTaken('admin@equiplab.test', admin!.id)).toBe(false);
		expect(await isEmailTaken('nobody@equiplab.test')).toBe(false);
	});

	it('isEquipmentTypeNameTaken detects the seeded type and respects excludeId', async () => {
		const typeRow = await db.query.equipment_types.findFirst({
			where: (t, { eq }) => eq(t.nombre, 'PC')
		});
		expect(await isEquipmentTypeNameTaken('PC')).toBe(true);
		expect(await isEquipmentTypeNameTaken('PC', typeRow!.id)).toBe(false);
		expect(await isEquipmentTypeNameTaken('Impresora')).toBe(false);
	});

	it('userExists matches seeded users and rejects unknown ids', async () => {
		const admin = await db.query.users.findFirst({ where: eq(users.username, 'admin') });
		expect(await userExists(admin!.id)).toBe(true);
		expect(await userExists('does-not-exist')).toBe(false);
	});
});
