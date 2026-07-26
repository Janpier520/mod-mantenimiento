import { db } from '$lib/server/db';
import { config } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.rol !== 'admin') throw redirect(303, '/');
	const settings = await db.query.config.findMany({
		orderBy: (config, { asc }) => [asc(config.key)]
	});
	return { settings };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user || locals.user.rol !== 'admin') throw redirect(303, '/login');

		const form = await request.formData();
		const keys = (form.get('_keys') as string)?.split(',') ?? [];

		const settings = await db.query.config.findMany();
		const settingsMap = new Map(settings.map((s) => [s.key, s.tipo]));

		for (const key of keys) {
			const value = (form.get(key) as string) ?? '';
			const tipo = settingsMap.get(key);

			if (tipo === 'number' && value && isNaN(Number(value))) {
				return fail(400, { error: `El valor de "${key}" debe ser numérico`, _action: 'default' });
			}
			if (tipo === 'email' && value) {
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(value)) {
					return fail(400, {
						error: `El valor de "${key}" debe ser un email válido`,
						_action: 'default'
					});
				}
			}

			await db
				.update(config)
				.set({ value, updated_at: new Date().toISOString() })
				.where(eq(config.key, key));
		}

		return { success: true };
	}
};
