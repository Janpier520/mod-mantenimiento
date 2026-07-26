import {
	getUserSecurityQuestions,
	verifyPassword,
	hashPassword,
	resetPassword
} from '$lib/server/auth';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const username = url.searchParams.get('username');
	if (!username) {
		throw redirect(303, '/auth/forgot-password');
	}

	const questions = await getUserSecurityQuestions(username);
	if (!questions) {
		throw redirect(303, '/auth/forgot-password');
	}

	return {
		question1: questions.question1,
		question2: questions.question2,
		username
	};
};

export const actions: Actions = {
	reset: async ({ request }) => {
		const form = await request.formData();
		const username = form.get('username')?.toString().trim();
		const answer1 = form.get('answer1')?.toString().trim();
		const answer2 = form.get('answer2')?.toString().trim();
		const newPassword = form.get('newPassword')?.toString();
		const confirmPassword = form.get('confirmPassword')?.toString();

		if (!username || !answer1 || !answer2 || !newPassword || !confirmPassword) {
			return fail(400, { error: 'Completá todos los campos' });
		}

		if (newPassword.length < 6) {
			return fail(400, { error: 'La contraseña debe tener al menos 6 caracteres' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { error: 'Las contraseñas no coinciden' });
		}

		const questions = await getUserSecurityQuestions(username);
		if (!questions) {
			return fail(404, { error: 'Usuario no encontrado' });
		}

		if (
			!(await verifyPassword(answer1, questions.answerHash1)) ||
			!(await verifyPassword(answer2, questions.answerHash2))
		) {
			return fail(401, { error: 'Las respuestas de seguridad no son correctas' });
		}

		await resetPassword(questions.userId, newPassword);

		return { success: 'Contraseña restablecida correctamente. Ya podés iniciar sesión.' };
	}
};
