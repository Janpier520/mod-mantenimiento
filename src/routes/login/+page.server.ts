import { login, logoutUser, setSessionCookie } from '$lib/server/auth';
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

		if (!username || !password) {
			return fail(400, { error: 'Completá todos los campos', username: username ?? '' });
		}

		const result = await login(username, password);

		if (!result.success) {
			return fail(401, { error: result.error, username });
		}

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

		const user = await db.query.users.findFirst({
			where: eq(users.username, username)
		});

		if (!user) {
			return fail(404, { error: 'Usuario no encontrado' });
		}

		throw redirect(303, `/auth/reset-password?username=${encodeURIComponent(username)}`);
	}
};
