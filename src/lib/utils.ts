import { type ClassValue, clsx } from 'clsx';
import { parse } from 'devalue';
import { twMerge } from 'tailwind-merge';
import type { UserRole } from './types';

/**
 * Merge Tailwind classes with proper conflict resolution.
 * Uses clsx for conditional classes and tailwind-merge to handle overrides.
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// ── shadcn-svelte utility types ───────────────────────────────────────

export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, 'child'> : T;
export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

/**
 * Format an ISO date string to a human-readable format in Spanish.
 */
export function formatDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	return new Date(iso).toLocaleDateString('es-AR', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

/**
 * Format an ISO date string to a short date (dd/mm/yyyy).
 */
export function formatDateShort(iso: string | null | undefined): string {
	if (!iso) return '—';
	return new Date(iso).toLocaleDateString('es-AR');
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Check if a user role has access based on allowed roles.
 * If no roles specified, everyone has access.
 */
export function hasAccess(role: UserRole | undefined, allowedRoles?: UserRole[]): boolean {
	if (!allowedRoles || allowedRoles.length === 0) return true;
	if (!role) return false;
	return allowedRoles.includes(role);
}

/**
 * Unwrap the payload of a form-action response made via plain fetch().
 *
 * SvelteKit wraps action results as `{ type, status, data }` AND devalue-encodes
 * `data` for non-enhance requests, so `data` arrives as a string like
 * '[{"success":1,"_action":2},true,"create"]'. Only use:enhance requests get
 * the decoded object. This helper decodes it (or falls back to an empty
 * object) so handlers can read flags like `.success` / `.error` directly.
 */
export function unwrapActionData<T = Record<string, unknown>>(payload: { data?: unknown }): T {
	if (typeof payload?.data === 'string') {
		try {
			return parse(payload.data) as T;
		} catch {
			return {} as T;
		}
	}
	return (payload?.data ?? {}) as T;
}

/**
 * Get the display name for a status value.
 */
export function statusLabel(status: string): string {
	const labels: Record<string, string> = {
		operativo: 'Operativo',
		en_reparacion: 'En Reparación',
		dado_de_baja: 'Dado de Baja',
		prestado: 'Prestado',
		abierto: 'Abierto',
		en_proceso: 'En Proceso',
		resuelto: 'Resuelto',
		cerrado: 'Cerrado',
		baja: 'Baja',
		media: 'Media',
		alta: 'Alta',
		critica: 'Crítica',
		pendiente: 'Pendiente',
		completado: 'Completado',
		fallido: 'Fallido',
		omitido: 'Omitido'
	};
	return labels[status] ?? capitalize(status);
}
