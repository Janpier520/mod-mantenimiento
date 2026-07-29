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
	default: async ({ request }) => {
		const form = await request.formData();
		const username = form.get('username')?.toString().trim();

		if (!username) {
			return fail(400, { error: 'Ingresa tu nombre de usuario' });
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
