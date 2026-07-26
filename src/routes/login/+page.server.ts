import {
	login,
	logoutUser,
	setSessionCookie,
	checkLoginRateLimit,
	recordFailedLogin,
	onLoginSuccess,
	checkResetRateLimit,
	onResetSuccess
} from '$lib/server/auth';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/');
	}
};

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const form = await request.formData();
		const username = form.get('username')?.toString().trim();
		const password = form.get('password')?.toString();
		const ipAddress =
			request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';

		if (!username || !password) {
			return fail(400, { error: 'Completá todos los campos', username: username ?? '' });
		}

		const rateCheck = await checkLoginRateLimit(username, ipAddress);
		if (!rateCheck.allowed) {
			return fail(429, { error: rateCheck.error!, username });
		}

		const result = await login(username, password);

		if (!result.success) {
			await recordFailedLogin(username, ipAddress);
			return fail(401, { error: result.error, username });
		}

		await onLoginSuccess(username);
		setSessionCookie(cookies, result.token);
		throw redirect(303, '/');
	},

	logout: async ({ cookies }) => {
		await logoutUser(cookies);
		throw redirect(303, '/login');
	},

	forgot: async ({ request }) => {
		const form = await request.formData();
		const username = form.get('username')?.toString().trim();

		if (!username) {
			return fail(400, { error: 'Ingresá tu nombre de usuario' });
		}

		const rateCheck = await checkResetRateLimit(username);
		if (!rateCheck.allowed) {
			return fail(429, { error: rateCheck.error! });
		}

		const user = await db.query.users.findFirst({
			where: eq(users.username, username)
		});

		if (!user) {
			return fail(400, {
				error: 'Si el usuario existe, recibirás instrucciones para recuperar tu contraseña.'
			});
		}

		await onResetSuccess(username);
		throw redirect(303, `/auth/reset-password?username=${encodeURIComponent(username)}`);
	}
};
