import bcrypt from 'bcryptjs';
import { db } from './db/index';
import { users, sessions } from './db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';

const SALT_ROUNDS = 10;
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const COOKIE_NAME = 'equip-lab-session';

// ─── Password hashing ─────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password: string): string | null {
	if (!password) return 'La contraseña es obligatoria';
	if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
	if (password.length > 128) return 'La contraseña no puede tener más de 128 caracteres';
	return null;
}

// ─── Session management ──────────────────────────────────────────────────────

export async function createSession(userId: string): Promise<string> {
	const token = crypto.randomUUID();
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

	await db.insert(sessions).values({
		user_id: userId,
		token,
		expires_at: expiresAt
	});

	return token;
}

export async function validateSession(token: string | undefined): Promise<App.Locals['user']> {
	if (!token) return null;

	const session = await db.query.sessions.findFirst({
		where: eq(sessions.token, token),
		with: {
			user: true
		}
	});

	if (!session) return null;
	if (new Date(session.expires_at) < new Date()) return null;
	if (!session.user.activo) return null;

	return {
		id: session.user.id,
		username: session.user.username,
		nombre: session.user.nombre,
		apellido: session.user.apellido,
		email: session.user.email,
		rol: session.user.rol as 'admin' | 'tecnico' | 'consultor'
	};
}

export async function deleteSession(token: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.token, token));
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export function setSessionCookie(cookies: Cookies, token: string): void {
	cookies.set(COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: SESSION_DURATION_MS / 1000
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(COOKIE_NAME, { path: '/' });
}

export function getSessionToken(cookies: Cookies): string | undefined {
	return cookies.get(COOKIE_NAME);
}

// ─── Auth handlers ────────────────────────────────────────────────────────────

export async function login(
	username: string,
	password: string
): Promise<{ success: true; token: string } | { success: false; error: string }> {
	const user = await db.query.users.findFirst({
		where: eq(users.username, username)
	});

	if (!user) {
		return { success: false, error: 'Usuario o contraseña incorrectos' };
	}

	if (!user.activo) {
		return { success: false, error: 'Esta cuenta está desactivada. Contactá al administrador.' };
	}

	if (!(await verifyPassword(password, user.password_hash))) {
		return { success: false, error: 'Usuario o contraseña incorrectos' };
	}

	const token = await createSession(user.id);
	return { success: true, token };
}

export async function logoutUser(cookies: Cookies): Promise<void> {
	const token = getSessionToken(cookies);
	if (token) {
		await deleteSession(token);
	}
	clearSessionCookie(cookies);
}

// ─── Guard helpers ────────────────────────────────────────────────────────────

export function requireAuth(
	locals: App.Locals
): asserts locals is { user: NonNullable<App.Locals['user']> } {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
}

export function requireRole(locals: App.Locals, ...roles: string[]): void {
	requireAuth(locals);
	if (!roles.includes(locals.user.rol)) {
		throw redirect(303, '/');
	}
}

// ─── Security questions ──────────────────────────────────────────────────────

export async function getUserSecurityQuestions(username: string) {
	const user = await db.query.users.findFirst({
		where: eq(users.username, username)
	});

	if (!user) return null;

	return {
		question1: user.security_question_1,
		question2: user.security_question_2,
		answerHash1: user.security_answer_hash_1,
		answerHash2: user.security_answer_hash_2,
		userId: user.id
	};
}

export async function resetPassword(userId: string, newPassword: string): Promise<void> {
	const hash = await hashPassword(newPassword);
	await Promise.all([
		db
			.update(users)
			.set({ password_hash: hash, updated_at: new Date().toISOString() })
			.where(eq(users.id, userId)),
		db.delete(sessions).where(eq(sessions.user_id, userId))
	]);
}
