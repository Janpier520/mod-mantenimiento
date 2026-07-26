import bcrypt from 'bcryptjs';
import { db } from './db/index';
import { users, sessions, login_attempts } from './db/schema';
import { eq, and, gte, count } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';

const SALT_ROUNDS = 10;
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const COOKIE_NAME = 'equip-lab-session';

// ─── Password hashing ─────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const MAX_RESET_ATTEMPTS = 3;
const RESET_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// ─── Rate limiting ────────────────────────────────────────────────────────────

async function recordLoginAttempt(username: string, ipAddress: string): Promise<void> {
	await db.insert(login_attempts).values({
		username,
		ip_address: ipAddress
	});
}

async function getRecentAttempts(identifier: string, windowMs: number): Promise<number> {
	const since = new Date(Date.now() - windowMs).toISOString();
	const [result] = await db
		.select({ count: count() })
		.from(login_attempts)
		.where(
			and(eq(login_attempts.username, identifier), gte(login_attempts.created_at, since))
		);
	return result?.count ?? 0;
}

async function clearAttempts(identifier: string): Promise<void> {
	await db.delete(login_attempts).where(eq(login_attempts.username, identifier));
}

export async function checkLoginRateLimit(
	username: string,
	ipAddress: string
): Promise<{ allowed: boolean; error?: string; retryAfterMs?: number }> {
	const attempts = await getRecentAttempts(username, LOGIN_LOCKOUT_MS);

	if (attempts >= MAX_LOGIN_ATTEMPTS) {
		const oldest = await db.query.login_attempts.findFirst({
			where: and(
				eq(login_attempts.username, username),
				gte(
					login_attempts.created_at,
					new Date(Date.now() - LOGIN_LOCKOUT_MS).toISOString()
				)
			),
			orderBy: (login_attempts, { asc }) => [asc(login_attempts.created_at)]
		});

		const retryAfterMs = oldest
			? new Date(oldest.created_at).getTime() + LOGIN_LOCKOUT_MS - Date.now()
			: LOGIN_LOCKOUT_MS;

		return {
			allowed: false,
			error: `Demasiados intentos fallidos. Probá de nuevo en ${Math.ceil(retryAfterMs / 60000)} minutos.`,
			retryAfterMs
		};
	}

	return { allowed: true };
}

export async function recordFailedLogin(username: string, ipAddress: string): Promise<void> {
	await recordLoginAttempt(username, ipAddress);
}

export async function onLoginSuccess(username: string): Promise<void> {
	await clearAttempts(username);
}

export async function checkResetRateLimit(
	username: string
): Promise<{ allowed: boolean; error?: string }> {
	const attempts = await getRecentAttempts(`reset:${username}`, RESET_LOCKOUT_MS);

	if (attempts >= MAX_RESET_ATTEMPTS) {
		return {
			allowed: false,
			error: 'Demasiados intentos de recuperación. Probá de nuevo en 15 minutos.'
		};
	}

	return { allowed: true };
}

export async function recordFailedReset(username: string): Promise<void> {
	await recordLoginAttempt(`reset:${username}`, 'reset-flow');
}

export async function onResetSuccess(username: string): Promise<void> {
	await clearAttempts(`reset:${username}`);
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

	// Sliding window: if past halfway point, extend expiry
	const expiresAt = new Date(session.expires_at);
	const now = new Date();
	const createdAt = new Date(session.created_at);
	const totalTtl = expiresAt.getTime() - createdAt.getTime();
	const elapsed = now.getTime() - createdAt.getTime();

	if (elapsed > totalTtl * 0.5) {
		const newExpiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
		await db
			.update(sessions)
			.set({ expires_at: newExpiresAt.toISOString() })
			.where(eq(sessions.id, session.id));
	}

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
