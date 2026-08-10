// ─── Convenience re-exports from schema inferred types ──────────────────────
// These are derived from the Drizzle schema via InferSelectModel / InferInsertModel
// and kept here for backward compatibility and easy access.

export type {
	User,
	NewUser,
	Session,
	EquipmentType,
	Equipment,
	EquipmentStatusHistory,
	Ticket,
	NewTicket,
	TicketComment,
	TicketAttachment,
	PMPlan,
	PMTask,
	PMExecution,
	Proveedor,
	ConfigSetting,
	ActivityLogEntry
} from '$lib/server/db/schema';

// ─── Row-level type aliases (backward-compat with existing code) ──────────────
// These mirror the string literals in the schema's enum-style text columns.
// They're kept as explicit union types so they work as type annotations
// in route handlers without importing the schema tables.
export type UserRole = 'admin' | 'tecnico' | 'consultor';
export type EquipmentStatus = 'operativo' | 'en_reparacion' | 'dado_de_baja' | 'prestado';
export type TicketStatus = 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado';
export type TicketPriority = 'baja' | 'media' | 'alta' | 'critica';
export type PMResult = 'pendiente' | 'completado' | 'fallido' | 'omitido';

// ─── Navigation items ─────────────────────────────────────────────────────────
import type { ResolvedPathname } from '$app/types';

export interface NavItem {
	label: string;
	icon: string;
	href: ResolvedPathname;
	roles?: UserRole[];
	shortcut?: string;
}
