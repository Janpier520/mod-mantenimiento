// ─── State machine transitions ────────────────────────────────────────────────

export const EQUIPMENT_TRANSITIONS: Record<string, string[]> = {
	operativo: ['en_reparacion', 'prestado', 'dado_de_baja'],
	en_reparacion: ['operativo', 'dado_de_baja'],
	dado_de_baja: [],
	prestado: ['operativo', 'en_reparacion']
};

export const TICKET_TRANSITIONS: Record<string, string[]> = {
	abierto: ['en_proceso', 'cerrado'],
	en_proceso: ['resuelto', 'cerrado'],
	resuelto: ['cerrado'],
	cerrado: ['abierto']
};

// ─── Valid value constants ────────────────────────────────────────────────────

export const VALID_EQUIPMENT_STATES = [
	'operativo',
	'en_reparacion',
	'prestado',
	'dado_de_baja'
] as const;
export const VALID_TICKET_STATES = ['abierto', 'en_proceso', 'resuelto', 'cerrado'] as const;
export const VALID_TICKET_PRIORITIES = ['baja', 'media', 'alta', 'critica'] as const;
export const VALID_USER_ROLES = ['admin', 'tecnico', 'consultor'] as const;
export const VALID_PM_RESULTS = ['pendiente', 'completado', 'fallido', 'omitido'] as const;

// ─── SLA (fecha límite) por prioridad de ticket ───────────────────────────────

export const SLA_DAYS_BY_PRIORITY: Record<TicketPriority, number> = {
	critica: 1,
	alta: 3,
	media: 7,
	baja: 14
};

export type EquipmentState = (typeof VALID_EQUIPMENT_STATES)[number];
export type TicketState = (typeof VALID_TICKET_STATES)[number];
export type TicketPriority = (typeof VALID_TICKET_PRIORITIES)[number];
export type UserRole = (typeof VALID_USER_ROLES)[number];
export type PMResult = (typeof VALID_PM_RESULTS)[number];

// ─── Transition enforcement ───────────────────────────────────────────────────

export function isValidTransition(
	from: string,
	to: string,
	machine: 'equipment' | 'ticket'
): boolean {
	const transitions = machine === 'equipment' ? EQUIPMENT_TRANSITIONS : TICKET_TRANSITIONS;
	return transitions[from]?.includes(to) ?? false;
}

export function getValidTransitions(from: string, machine: 'equipment' | 'ticket'): string[] {
	const transitions = machine === 'equipment' ? EQUIPMENT_TRANSITIONS : TICKET_TRANSITIONS;
	return transitions[from] ?? [];
}

// ─── Role-based transition guards ────────────────────────────────────────────

export const TICKET_TRANSITION_ROLES: Record<string, string[]> = {
	abierto: ['admin', 'consultor'],
	en_proceso: ['admin', 'tecnico'],
	resuelto: ['admin', 'tecnico'],
	cerrado: ['admin', 'consultor']
};

export function canTransition(
	from: string,
	to: string,
	role: string,
	machine: 'equipment' | 'ticket'
): { allowed: boolean; error?: string } {
	if (machine === 'equipment') {
		if (to === 'dado_de_baja' && role !== 'admin') {
			return { allowed: false, error: 'Solo los administradores pueden dar de baja equipos' };
		}
		return { allowed: true };
	}

	const allowedRoles = TICKET_TRANSITION_ROLES[to];
	if (!allowedRoles || !allowedRoles.includes(role)) {
		const roleName =
			role === 'admin' ? 'administrador' : role === 'tecnico' ? 'técnico' : 'consultor';
		return {
			allowed: false,
			error: `El rol '${roleName}' no puede cambiar el estado a '${to}'`
		};
	}
	return { allowed: true };
}
