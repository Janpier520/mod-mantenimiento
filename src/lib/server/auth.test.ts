import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
	hashPassword,
	verifyPassword,
	checkLoginRateLimit,
	recordFailedLogin,
	onLoginSuccess,
	checkResetRateLimit,
	recordFailedReset,
	createSession,
	validateSession,
	deleteSession,
	setSessionCookie,
	clearSessionCookie,
	getSessionToken,
	login,
	requireAuth,
	requireRole,
	SESSION_DURATION_MS
} from './auth';
import { db } from './db';
import { initTestDb } from './db/test-helpers';
import { login_attempts, sessions, users } from './db/schema';
import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';

// TC-6: auth integration — rate limiting, session lifecycle, sliding window,
// login flows, cookie helpers and guards against the in-memory DB.

describe('auth', () => {
	beforeAll(async () => {
		await initTestDb();
	});

	it('should hash and verify passwords correctly', async () => {
		const password = 'test-password-123';
		const hash = await hashPassword(password);
		expect(hash).not.toBe(password);
		expect(await verifyPassword(password, hash)).toBe(true);
		expect(await verifyPassword('wrong-password', hash)).toBe(false);
	});

	it('login succeeds with the seeded credentials', async () => {
		const res = await login('admin', 'test-password-123');
		expect(res.success).toBe(true);
		if (res.success) {
			expect(res.token).toBeTruthy();
		}
	});

	it('login fails for an unknown user', async () => {
		const res = await login('ghost', 'whatever');
		expect(res).toEqual({ success: false, error: 'Usuario o contraseña incorrectos' });
	});

	it('login fails for a disabled account', async () => {
		await db.update(users).set({ activo: false }).where(eq(users.username, 'consultor1'));
		const res = await login('consultor1', 'test-password-123');
		expect(res).toEqual({
			success: false,
			error: 'Esta cuenta está desactivada. Contacta al administrador.'
		});
		// restore for other tests
		await db.update(users).set({ activo: true }).where(eq(users.username, 'consultor1'));
	});

	it('login fails with the wrong password', async () => {
		const res = await login('admin', 'wrong-password');
		expect(res).toEqual({ success: false, error: 'Usuario o contraseña incorrectos' });
	});

	it('login success clears previous failed attempts', async () => {
		await recordFailedLogin('admin', '1.2.3.4');
		await recordFailedLogin('admin', '1.2.3.4');
		await onLoginSuccess('admin');
		const remaining = await db
			.select()
			.from(login_attempts)
			.where(eq(login_attempts.username, 'admin'));
		expect(remaining).toHaveLength(0);
	});
});

describe('rate limiting (TC-6)', () => {
	beforeAll(async () => {
		await initTestDb();
	});

	it('blocks on the 5th failed attempt within the window with retryAfterMs > 0', async () => {
		const username = 'lockout-user';
		const now = Date.now();
		for (let i = 0; i < 5; i++) {
			await db.insert(login_attempts).values({
				username,
				ip_address: '1.2.3.4',
				created_at: new Date(now - 60 * 1000).toISOString()
			});
		}
		const res = await checkLoginRateLimit(username);
		expect(res.allowed).toBe(false);
		expect(res.retryAfterMs).toBeGreaterThan(0);
		expect(res.error).toContain('Demasiados intentos fallidos');
	});

	it('does not count attempts older than the 15-min window', async () => {
		const username = 'old-attempts-user';
		const now = Date.now();
		// 4 recent + 1 old (20 minutes ago) → only 4 in window → allowed
		for (let i = 0; i < 4; i++) {
			await db.insert(login_attempts).values({
				username,
				ip_address: '1.2.3.4',
				created_at: new Date(now - 5 * 60 * 1000).toISOString()
			});
		}
		await db.insert(login_attempts).values({
			username,
			ip_address: '1.2.3.4',
			created_at: new Date(now - 20 * 60 * 1000).toISOString()
		});
		const res = await checkLoginRateLimit(username);
		expect(res.allowed).toBe(true);
	});

	it('isolation: reset attempts (reset: prefix) do not affect the login counter', async () => {
		const username = 'namespace-user';
		for (let i = 0; i < 3; i++) {
			await recordFailedReset(username);
		}
		const loginRes = await checkLoginRateLimit(username);
		expect(loginRes.allowed).toBe(true);

		const resetRes = await checkResetRateLimit(username);
		expect(resetRes.allowed).toBe(false);
		expect(resetRes.error).toContain('Demasiados intentos de recuperación');
	});

	it('isolation: login attempts do not affect the reset counter', async () => {
		const username = 'namespace-user-2';
		for (let i = 0; i < 5; i++) {
			await recordFailedLogin(username, '1.2.3.4');
		}
		const resetRes = await checkResetRateLimit(username);
		expect(resetRes.allowed).toBe(true);
	});
});

describe('session lifecycle (TC-6)', () => {
	beforeAll(async () => {
		await initTestDb();
	});

	it('createSession returns a token and validateSession resolves the user', async () => {
		const admin = await db.query.users.findFirst({ where: eq(users.username, 'admin') });
		expect(admin).toBeTruthy();
		const token = await createSession(admin!.id);
		expect(token).toBeTruthy();
		const user = await validateSession(token);
		expect(user).not.toBeNull();
		expect(user!.username).toBe('admin');
		expect(user!.rol).toBe('admin');
	});

	it('deleteSession invalidates the token', async () => {
		const admin = await db.query.users.findFirst({ where: eq(users.username, 'admin') });
		const token = await createSession(admin!.id);
		await deleteSession(token);
		expect(await validateSession(token)).toBeNull();
	});

	it('validateSession returns null for an expired session', async () => {
		const admin = await db.query.users.findFirst({ where: eq(users.username, 'admin') });
		const token = 'expired-token';
		await db.insert(sessions).values({
			user_id: admin!.id,
			token,
			expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
			created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
		});
		expect(await validateSession(token)).toBeNull();
	});

	it('sliding window: a 13h-old session (of 24h TTL) is extended to ~now+24h', async () => {
		const admin = await db.query.users.findFirst({ where: eq(users.username, 'admin') });
		const token = 'sliding-13h-token';
		const now = Date.now();
		await db.insert(sessions).values({
			user_id: admin!.id,
			token,
			expires_at: new Date(now + 11 * 60 * 60 * 1000).toISOString(),
			created_at: new Date(now - 13 * 60 * 60 * 1000).toISOString()
		});
		const user = await validateSession(token);
		expect(user).not.toBeNull();
		const row = await db.query.sessions.findFirst({ where: eq(sessions.token, token) });
		const newExpiry = new Date(row!.expires_at).getTime();
		expect(newExpiry).toBeGreaterThan(now + 23 * 60 * 60 * 1000);
		expect(newExpiry).toBeLessThanOrEqual(now + SESSION_DURATION_MS + 60_000);
	});

	it('sliding window: a 6h-old session keeps its expires_at unchanged', async () => {
		const admin = await db.query.users.findFirst({ where: eq(users.username, 'admin') });
		const token = 'sliding-6h-token';
		const now = Date.now();
		const originalExpiry = new Date(now + 18 * 60 * 60 * 1000).toISOString();
		await db.insert(sessions).values({
			user_id: admin!.id,
			token,
			expires_at: originalExpiry,
			created_at: new Date(now - 6 * 60 * 60 * 1000).toISOString()
		});
		const user = await validateSession(token);
		expect(user).not.toBeNull();
		const row = await db.query.sessions.findFirst({ where: eq(sessions.token, token) });
		expect(row!.expires_at).toBe(originalExpiry);
	});
});

describe('cookie helpers (TC-6)', () => {
	it('setSessionCookie sets the httpOnly overhaul-session cookie', () => {
		const cookies = { set: vi.fn(), get: vi.fn(), delete: vi.fn() } as unknown as Cookies;
		setSessionCookie(cookies, 'token-123');
		expect(cookies.set).toHaveBeenCalledWith(
			'overhaul-session',
			'token-123',
			expect.objectContaining({ path: '/', httpOnly: true, sameSite: 'lax' })
		);
	});

	it('getSessionToken reads the cookie', () => {
		const cookies = {
			set: vi.fn(),
			get: vi.fn(() => 'token-456'),
			delete: vi.fn()
		} as unknown as Cookies;
		expect(getSessionToken(cookies)).toBe('token-456');
	});

	it('clearSessionCookie deletes the cookie', () => {
		const cookies = { set: vi.fn(), get: vi.fn(), delete: vi.fn() } as unknown as Cookies;
		clearSessionCookie(cookies);
		expect(cookies.delete).toHaveBeenCalledWith('overhaul-session', { path: '/' });
	});
});

describe('guards (TC-6)', () => {
	it('requireAuth throws a 303 redirect to /login for unauthenticated locals', () => {
		let caught: unknown;
		try {
			requireAuth({ user: null });
		} catch (e) {
			caught = e;
		}
		expect(caught).toMatchObject({ status: 303, location: '/login' });
	});

	it('requireRole throws a 303 redirect to / for a tecnico asking admin', async () => {
		await initTestDb();
		const tecnico = await db.query.users.findFirst({ where: eq(users.username, 'tecnico1') });
		const locals = {
			user: {
				id: tecnico!.id,
				username: tecnico!.username,
				nombre: tecnico!.nombre,
				apellido: tecnico!.apellido,
				email: tecnico!.email,
				rol: 'tecnico' as const
			}
		};
		let caught: unknown;
		try {
			requireRole(locals, 'admin');
		} catch (e) {
			caught = e;
		}
		expect(caught).toMatchObject({ status: 303, location: '/' });
	});

	it('requireRole passes for a matching role', async () => {
		const admin = await db.query.users.findFirst({ where: eq(users.username, 'admin') });
		const locals = {
			user: {
				id: admin!.id,
				username: admin!.username,
				nombre: admin!.nombre,
				apellido: admin!.apellido,
				email: admin!.email,
				rol: 'admin' as const
			}
		};
		expect(() => requireRole(locals, 'admin')).not.toThrow();
	});
});
