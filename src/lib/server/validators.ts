import { eq, and, ne } from 'drizzle-orm';
import { db } from './db/index';
import { users, equipment_types } from './db/schema';

// ─── Enum validators ──────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]+$/;

export function validateEmail(email: string): string | null {
	if (!email) return null;
	if (!EMAIL_REGEX.test(email)) return 'El formato del email no es válido';
	return null;
}

export function validateUsername(username: string): string | null {
	if (!username || username.trim().length === 0) return 'El nombre de usuario es obligatorio';
	if (username.length < 3) return 'El nombre de usuario debe tener al menos 3 caracteres';
	if (username.length > 50) return 'El nombre de usuario no puede tener más de 50 caracteres';
	if (!USERNAME_REGEX.test(username))
		return 'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos';
	return null;
}

export function validatePasswordStrength(password: string): string | null {
	if (!password) return 'La contraseña es obligatoria';
	if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
	if (password.length > 128) return 'La contraseña no puede tener más de 128 caracteres';
	return null;
}

export function validateRequired(
	value: string | null | undefined,
	fieldName: string
): string | null {
	if (!value || value.trim().length === 0) return `El campo ${fieldName} es obligatorio`;
	return null;
}

// ─── Duplicate checkers ──────────────────────────────────────────────────────

export async function isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
	const conditions = [eq(users.username, username)];
	if (excludeUserId) conditions.push(ne(users.id, excludeUserId));
	const existing = await db.query.users.findFirst({ where: and(...conditions) });
	return !!existing;
}

export async function isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
	if (!email) return false;
	const conditions = [eq(users.email, email)];
	if (excludeUserId) conditions.push(ne(users.id, excludeUserId));
	const existing = await db.query.users.findFirst({ where: and(...conditions) });
	return !!existing;
}

export async function isEquipmentTypeNameTaken(
	nombre: string,
	excludeId?: string
): Promise<boolean> {
	const conditions = [eq(equipment_types.nombre, nombre)];
	if (excludeId) conditions.push(ne(equipment_types.id, excludeId));
	const existing = await db.query.equipment_types.findFirst({ where: and(...conditions) });
	return !!existing;
}

// ─── Entity existence checkers ───────────────────────────────────────────────

export async function userExists(userId: string): Promise<boolean> {
	const existing = await db.query.users.findFirst({ where: eq(users.id, userId) });
	return !!existing;
}

export async function isLastActiveAdmin(userId: string): Promise<boolean> {
	const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
	if (!user || user.rol !== 'admin' || !user.activo) return false;

	const activeAdmins = await db.query.users.findMany({
		where: and(eq(users.rol, 'admin'), eq(users.activo, true))
	});
	return activeAdmins.length <= 1;
}

// ─── SQL wildcard escape ─────────────────────────────────────────────────────

export function escapeLike(input: string): string {
	return input.replace(/%/g, '\\%').replace(/_/g, '\\_');
}
