// ─── User roles ──────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'tecnico' | 'consultor';

// ─── Equipment statuses ──────────────────────────────────────────────────────
export type EquipmentStatus = 'operativo' | 'en_reparacion' | 'dado_de_baja' | 'prestado';

// ─── Ticket statuses ─────────────────────────────────────────────────────────
export type TicketStatus = 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado';

// ─── Ticket priorities ───────────────────────────────────────────────────────
export type TicketPriority = 'baja' | 'media' | 'alta' | 'critica';

// ─── PM execution results ────────────────────────────────────────────────────
export type PMResult = 'pendiente' | 'completado' | 'fallido' | 'omitido';

// ─── Navigation items ─────────────────────────────────────────────────────────
export interface NavItem {
	label: string;
	icon: string;
	href: string;
	roles?: UserRole[];
}
