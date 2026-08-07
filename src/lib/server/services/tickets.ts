import { db } from '$lib/server/db';
import { tickets, users, equipment, ticket_comments } from '$lib/server/db/schema';
import { eq, like, count } from 'drizzle-orm';
import {
	isValidTransition,
	canTransition,
	VALID_TICKET_STATES,
	VALID_TICKET_PRIORITIES
} from '$lib/server/state-machines';
import type { ServiceResult, Actor } from './types';

export interface CreateTicketInput {
	titulo: string;
	descripcion: string;
	prioridad: string;
	equipo_id: string;
}
export interface UpdateTicketInput {
	id: string;
	titulo: string;
	descripcion: string;
	prioridad: string;
	estado: string;
	tecnico_asignado: string;
	equipo_id: string;
}
export interface DeleteTicketInput {
	id: string;
}
export interface AddCommentInput {
	ticket_id: string;
	contenido: string;
}

export type CreateTicketResult = ServiceResult<{ id: string; numero_ticket: string }>;
export type UpdateTicketResult = ServiceResult<{ id: string }>;
export type DeleteTicketResult = ServiceResult<{ id: string }>;
export type AddCommentResult = ServiceResult<{ commentId: string }>;

export async function generateTicketNumber(): Promise<string> {
	const now = new Date();
	const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
	const [result] = await db
		.select({ count: count() })
		.from(tickets)
		.where(like(tickets.numero_ticket, `TKT-${datePart}-%`));
	const nextNum = (result?.count ?? 0) + 1;
	return `TKT-${datePart}-${String(nextNum).padStart(3, '0')}`;
}

export async function createTicket(
	input: CreateTicketInput,
	actor: Actor
): Promise<CreateTicketResult> {
	const { titulo, descripcion, prioridad, equipo_id } = input;

	if (!titulo || titulo.trim().length === 0) {
		return { ok: false, error: 'El título del ticket es obligatorio', status: 400 };
	}

	if (!VALID_TICKET_PRIORITIES.includes(prioridad as any)) {
		return { ok: false, error: 'Prioridad no válida', status: 400 };
	}

	if (equipo_id) {
		const equip = await db.query.equipment.findFirst({ where: eq(equipment.id, equipo_id) });
		if (!equip) return { ok: false, error: 'Equipo no encontrado', status: 400 };
		if (equip.estado === 'dado_de_baja') {
			return {
				ok: false,
				error: 'No se puede crear un ticket para un equipo dado de baja',
				status: 400
			};
		}
	}

	const numero_ticket = await generateTicketNumber();

	const [row] = await db
		.insert(tickets)
		.values({
			numero_ticket,
			titulo: titulo.trim(),
			descripcion: descripcion.trim(),
			prioridad: prioridad as any,
			usuario_reporta: actor.id,
			equipo_id: equipo_id || null
		})
		.returning({ id: tickets.id, numero_ticket: tickets.numero_ticket });

	return { ok: true, data: { id: row.id, numero_ticket: row.numero_ticket } };
}

export async function updateTicket(
	input: UpdateTicketInput,
	actor: Actor
): Promise<UpdateTicketResult> {
	const { id, titulo, descripcion, prioridad, estado, tecnico_asignado, equipo_id } = input;

	if (!id) return { ok: false, error: 'ID de ticket no proporcionado', status: 400 };

	const existing = await db.query.tickets.findFirst({ where: eq(tickets.id, id) });
	if (!existing) return { ok: false, error: 'Ticket no encontrado', status: 404 };

	if (!titulo || titulo.trim().length === 0) {
		return { ok: false, error: 'El título del ticket es obligatorio', status: 400 };
	}

	if (!VALID_TICKET_PRIORITIES.includes(prioridad as any)) {
		return { ok: false, error: 'Prioridad no válida', status: 400 };
	}
	if (!VALID_TICKET_STATES.includes(estado as any)) {
		return { ok: false, error: 'Estado no válido', status: 400 };
	}

	if (existing.estado !== estado && !isValidTransition(existing.estado, estado, 'ticket')) {
		return {
			ok: false,
			error: `Transición de estado no permitida: ${existing.estado} → ${estado}`,
			status: 400
		};
	}

	if (existing.estado !== estado) {
		const roleCheck = canTransition(existing.estado, estado, actor.rol, 'ticket');
		if (!roleCheck.allowed) {
			return { ok: false, error: roleCheck.error ?? '', status: 403 };
		}
	}

	if (tecnico_asignado) {
		const tech = await db.query.users.findFirst({ where: eq(users.id, tecnico_asignado) });
		if (!tech) return { ok: false, error: 'Técnico no encontrado', status: 400 };
		if (tech.rol !== 'tecnico' && tech.rol !== 'admin') {
			return {
				ok: false,
				error: 'El usuario asignado no es técnico ni administrador',
				status: 400
			};
		}
	}

	if (equipo_id) {
		const equip = await db.query.equipment.findFirst({ where: eq(equipment.id, equipo_id) });
		if (!equip) return { ok: false, error: 'Equipo no encontrado', status: 400 };
		if (equip.estado === 'dado_de_baja') {
			return { ok: false, error: 'No se puede asignar un equipo dado de baja', status: 400 };
		}
	}

	await db
		.update(tickets)
		.set({
			titulo: titulo.trim(),
			descripcion: descripcion.trim(),
			prioridad: prioridad as any,
			estado: estado as any,
			tecnico_asignado: tecnico_asignado || null,
			equipo_id: equipo_id || null,
			updated_at: new Date().toISOString()
		})
		.where(eq(tickets.id, id));

	return { ok: true, data: { id } };
}

export async function deleteTicket(
	input: DeleteTicketInput,
	actor: Actor
): Promise<DeleteTicketResult> {
	const { id } = input;

	if (!id) return { ok: false, error: 'ID de ticket no proporcionado', status: 400 };

	const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, id) });
	if (!ticket) return { ok: false, error: 'Ticket no encontrado', status: 400 };

	if (ticket.usuario_reporta !== actor.id && actor.rol !== 'admin') {
		return { ok: false, error: 'No tenés permiso para eliminar este ticket', status: 403 };
	}

	await db.delete(tickets).where(eq(tickets.id, id));
	return { ok: true, data: { id } };
}

export async function addComment(input: AddCommentInput, actor: Actor): Promise<AddCommentResult> {
	const { ticket_id, contenido } = input;

	if (!ticket_id) return { ok: false, error: 'ID de ticket no proporcionado', status: 400 };

	const ticketExists = await db.query.tickets.findFirst({ where: eq(tickets.id, ticket_id) });
	if (!ticketExists) return { ok: false, error: 'Ticket no encontrado', status: 404 };

	if (!contenido || contenido.trim().length === 0) {
		return { ok: false, error: 'El comentario no puede estar vacío', status: 400 };
	}

	const [row] = await db
		.insert(ticket_comments)
		.values({
			ticket_id,
			usuario_id: actor.id,
			contenido: contenido.trim()
		})
		.returning({ id: ticket_comments.id });

	return { ok: true, data: { commentId: row.id } };
}
