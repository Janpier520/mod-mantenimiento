import { db } from '$lib/server/db';
import { sessions } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	const userSessions = await db
		.select()
		.from(sessions)
		.where(eq(sessions.user_id, locals.user.id))
		.orderBy(sessions.created_at);

	return {
		sessions: userSessions.map((s) => ({
			id: s.id,
			token: s.token,
			expires_at: s.expires_at,
			created_at: s.created_at
		}))
	};
};

export const actions: Actions = {
	revoke: async ({ request, locals, cookies }) => {
		if (!locals.user) throw redirect(303, '/login');

		const form = await request.formData();
		const sessionId = form.get('sessionId') as string;
		if (!sessionId) return fail(400, { error: 'ID de sesión no proporcionado' });

		await db
			.delete(sessions)
			.where(and(eq(sessions.id, sessionId), eq(sessions.user_id, locals.user.id)));

		return { success: true };
	}
};
