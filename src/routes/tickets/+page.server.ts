import { db } from '$lib/server/db';
import { tickets, users, equipment, ticket_comments } from '$lib/server/db/schema';
import { eq, like, or, and, count, asc, desc } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
	isValidTransition,
	canTransition,
	VALID_TICKET_STATES,
	VALID_TICKET_PRIORITIES
} from '$lib/server/state-machines';
import { escapeLike } from '$lib/server/validators';
import { requireAuth } from '$lib/server/auth';

const PAGE_SIZE = 10;

async function generateTicketNumber(): Promise<string> {
	const now = new Date();
	const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
	const [result] = await db
		.select({ count: count() })
		.from(tickets)
		.where(like(tickets.numero_ticket, `TKT-${datePart}-%`));
	const nextNum = (result?.count ?? 0) + 1;
	return `TKT-${datePart}-${String(nextNum).padStart(3, '0')}`;
}

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) {
		return {
			tickets: [],
			tecnicos: [],
			equipos: [],
			total: 0,
			page: 1,
			totalPages: 1,
			search: '',
			filterEstado: '',
			filterPrioridad: ''
		};
	}

	const search = url.searchParams.get('search') ?? '';
	const filterEstado = url.searchParams.get('estado') ?? '';
	const filterPrioridad = url.searchParams.get('prioridad') ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page')) ?? 1);

	const conditions: ReturnType<typeof and>[] = [];
	if (search) {
		const safeSearch = escapeLike(search);
		conditions.push(
			or(
				like(tickets.titulo, `%${safeSearch}%`),
				like(tickets.descripcion, `%${safeSearch}%`),
				like(tickets.numero_ticket, `%${safeSearch}%`)
			)
		);
	}
	if (filterEstado) conditions.push(eq(tickets.estado, filterEstado as any));
	if (filterPrioridad) conditions.push(eq(tickets.prioridad, filterPrioridad as any));

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [countResult] = await db.select({ total: count() }).from(tickets).where(where);

	const total = countResult.total;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const offset = (currentPage - 1) * PAGE_SIZE;

	const items = await db.query.tickets.findMany({
		where,
		with: {
			reporta: true,
			asignado: true,
			equipo: true,
			comentarios: {
				with: { usuario: true },
				orderBy: (comments, { asc }) => [asc(comments.created_at)]
			}
		},
		orderBy: (tickets, { desc }) => [desc(tickets.created_at)],
		limit: PAGE_SIZE,
		offset
	});

	const tecnicos = await db.query.users.findMany({
		where: or(eq(users.rol, 'tecnico'), eq(users.rol, 'admin')),
		orderBy: (users, { asc }) => [asc(users.nombre)]
	});

	const equipos = await db.query.equipment.findMany({
		orderBy: (equipment, { asc }) => [asc(equipment.modelo)]
	});

	return {
		tickets: items,
		tecnicos,
		equipos,
		total,
		page: currentPage,
		totalPages,
		search,
		filterEstado,
		filterPrioridad
	};
};

export const actions: Actions = {
	crud: async ({ request, locals }) => {
		requireAuth(locals);

		const form = await request.formData();
		const _action = form.get('_action') as string;
		const id = (form.get('id') as string) ?? '';

		if (_action === 'create') {
			const titulo = (form.get('titulo') as string) ?? '';
			const descripcion = (form.get('descripcion') as string) ?? '';
			const prioridad = (form.get('prioridad') as string) ?? 'media';
			const equipo_id = (form.get('equipo_id') as string) ?? '';

			if (!titulo || titulo.trim().length === 0) {
				return fail(400, { error: 'El título del ticket es obligatorio', _action });
			}

			// Validate enum
			if (!VALID_TICKET_PRIORITIES.includes(prioridad as any)) {
				return fail(400, { error: 'Prioridad no válida', _action });
			}

			// Validate equipment exists and is not decommissioned
			if (equipo_id) {
				const equip = await db.query.equipment.findFirst({ where: eq(equipment.id, equipo_id) });
				if (!equip) return fail(400, { error: 'Equipo no encontrado', _action });
				if (equip.estado === 'dado_de_baja') {
					return fail(400, {
						error: 'No se puede crear un ticket para un equipo dado de baja',
						_action
					});
				}
			}

			const numero_ticket = await generateTicketNumber();

			await db.insert(tickets).values({
				numero_ticket,
				titulo: titulo.trim(),
				descripcion: descripcion.trim(),
				prioridad: prioridad as any,
				usuario_reporta: locals.user.id,
				equipo_id: equipo_id || null
			});

			return { success: true, _action };
		}

		if (_action === 'update') {
			if (!id) return fail(400, { error: 'ID de ticket no proporcionado', _action });

			// Entity existence check
			const existing = await db.query.tickets.findFirst({ where: eq(tickets.id, id) });
			if (!existing) return fail(404, { error: 'Ticket no encontrado', _action });

			const titulo = (form.get('titulo') as string) ?? '';
			const descripcion = (form.get('descripcion') as string) ?? '';
			const prioridad = (form.get('prioridad') as string) ?? 'media';
			const estado = (form.get('estado') as string) ?? 'abierto';
			const tecnico_asignado = (form.get('tecnico_asignado') as string) ?? '';
			const equipo_id = (form.get('equipo_id') as string) ?? '';

			// Validate required fields
			if (!titulo || titulo.trim().length === 0) {
				return fail(400, { error: 'El título del ticket es obligatorio', _action });
			}

			// Validate enums
			if (!VALID_TICKET_PRIORITIES.includes(prioridad as any)) {
				return fail(400, { error: 'Prioridad no válida', _action });
			}
			if (!VALID_TICKET_STATES.includes(estado as any)) {
				return fail(400, { error: 'Estado no válido', _action });
			}

			// Validate state transition
			if (existing.estado !== estado && !isValidTransition(existing.estado, estado, 'ticket')) {
				return fail(400, {
					error: `Transición de estado no permitida: ${existing.estado} → ${estado}`,
					_action
				});
			}

			// Validate role-based transition
			if (existing.estado !== estado) {
				const roleCheck = canTransition(existing.estado, estado, locals.user.rol, 'ticket');
				if (!roleCheck.allowed) {
					return fail(403, { error: roleCheck.error, _action });
				}
			}

			// Validate technician exists and has tech/admin role
			if (tecnico_asignado) {
				const tech = await db.query.users.findFirst({ where: eq(users.id, tecnico_asignado) });
				if (!tech) return fail(400, { error: 'Técnico no encontrado', _action });
				if (tech.rol !== 'tecnico' && tech.rol !== 'admin') {
					return fail(400, {
						error: 'El usuario asignado no es técnico ni administrador',
						_action
					});
				}
			}

			// Validate equipment exists and is not decommissioned
			if (equipo_id) {
				const equip = await db.query.equipment.findFirst({ where: eq(equipment.id, equipo_id) });
				if (!equip) return fail(400, { error: 'Equipo no encontrado', _action });
				if (equip.estado === 'dado_de_baja') {
					return fail(400, { error: 'No se puede asignar un equipo dado de baja', _action });
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

			return { success: true, _action };
		}

		if (_action === 'delete') {
			if (!id) return fail(400, { error: 'ID de ticket no proporcionado', _action });

			const ticket = await db.query.tickets.findFirst({
				where: eq(tickets.id, id)
			});

			if (!ticket) return fail(400, { error: 'Ticket no encontrado', _action });

			// Only creator or admin can delete
			if (ticket.usuario_reporta !== locals.user.id && locals.user.rol !== 'admin') {
				return fail(403, { error: 'No tenés permiso para eliminar este ticket', _action });
			}

			await db.delete(tickets).where(eq(tickets.id, id));
			return { success: true, _action };
		}

		if (_action === 'add_comment') {
			const ticket_id = (form.get('ticket_id') as string) ?? '';
			const contenido = (form.get('contenido') as string) ?? '';

			if (!ticket_id) {
				return fail(400, { error: 'ID de ticket no proporcionado', _action });
			}
			const ticketExists = await db.query.tickets.findFirst({ where: eq(tickets.id, ticket_id) });
			if (!ticketExists) return fail(404, { error: 'Ticket no encontrado', _action });
			if (!contenido || contenido.trim().length === 0) {
				return fail(400, { error: 'El comentario no puede estar vacío', _action });
			}

			await db.insert(ticket_comments).values({
				ticket_id,
				usuario_id: locals.user.id,
				contenido: contenido.trim()
			});

			return { success: true, _action };
		}

		return fail(400, { error: 'Acción no válida', _action });
	}
};
