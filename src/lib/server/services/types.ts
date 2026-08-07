import type { UserRole } from '$lib/server/state-machines';

export type ServiceResult<T> =
	{ ok: true; data: T } | { ok: false; error: string; status?: number };

export type Actor = { id: string; rol: UserRole };
