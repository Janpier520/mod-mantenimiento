import { validateSession, getSessionToken, setSessionCookie } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

// Routes that don't need authentication
const PUBLIC_ROUTES = ['/login', '/auth/forgot-password', '/auth/reset-password'];

// Role-based route access: prefix → allowed roles
const ROLE_ROUTES: Record<string, string[]> = {
	'/usuarios': ['admin'],
	'/config': ['admin'],
	'/proveedores': ['admin', 'consultor'],
	'/reportes': ['admin', 'consultor']
};

export const handle: Handle = async ({ event, resolve }) => {
	// Validate session
	const token = getSessionToken(event.cookies);
	const user = await validateSession(token);
	event.locals.user = user;

	// Renew cookie on every valid request (sliding window, no DB write)
	if (user && token) {
		setSessionCookie(event.cookies, token);
	}

	const path = event.url.pathname;

	// Allow public routes
	if (PUBLIC_ROUTES.includes(path)) {
		return resolve(event);
	}

	// Redirect unauthenticated users to login
	if (!user) {
		throw redirect(303, '/login');
	}

	// Check role-based access
	for (const [prefix, roles] of Object.entries(ROLE_ROUTES)) {
		if (path.startsWith(prefix) && !roles.includes(user.rol)) {
			throw redirect(303, '/');
		}
	}

	return resolve(event);
};
