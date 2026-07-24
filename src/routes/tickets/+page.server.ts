import { db } from '$lib/server/db';
import { tickets, users, equipment, ticket_comments } from '$lib/server/db/schema';
import { eq, like, or, and, count, asc, desc } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { TicketStatus, TicketPriority } from '$lib/types';
import { requireAuth } from '$lib/server/auth';

const PAGE_SIZE = 10;

// ponytail: sequential ticket number from count — fine for internal tool,
// not safe under concurrent writes; use a sequence if throughput matters
async function generateTicketNumber(): Promise<string> {
	const [result] = await db.select({ count: count() }).from(tickets);
	const nextNum = (result?.count ?? 0) + 1;
	return `TKT-${String(nextNum).padStart(3, '0')}`;
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
		conditions.push(
			or(
				like(tickets.titulo, `%${search}%`),
				like(tickets.descripcion, `%${search}%`),
				like(tickets.numero_ticket, `%${search}%`)
			)
		);
	}
	if (filterEstado) conditions.push(eq(tickets.estado, filterEstado as TicketStatus));
	if (filterPrioridad) conditions.push(eq(tickets.prioridad, filterPrioridad as TicketPriority));

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

			const numero_ticket = await generateTicketNumber();

			await db.insert(tickets).values({
				numero_ticket,
				titulo: titulo.trim(),
				descripcion: descripcion.trim(),
				prioridad: prioridad as TicketPriority,
				usuario_reporta: locals.user.id,
				equipo_id: equipo_id || null
			});

			return { success: true, _action };
		}

		if (_action === 'update') {
			if (!id) return fail(400, { error: 'ID de ticket no proporcionado', _action });

			const titulo = (form.get('titulo') as string) ?? '';
			const descripcion = (form.get('descripcion') as string) ?? '';
			const prioridad = (form.get('prioridad') as string) ?? 'media';
			const estado = (form.get('estado') as string) ?? 'abierto';
			const tecnico_asignado = (form.get('tecnico_asignado') as string) ?? '';
			const equipo_id = (form.get('equipo_id') as string) ?? '';

			if (!titulo || titulo.trim().length === 0) {
				return fail(400, { error: 'El título del ticket es obligatorio', _action });
			}

			await db
				.update(tickets)
				.set({
					titulo: titulo.trim(),
					descripcion: descripcion.trim(),
					prioridad: prioridad as TicketPriority,
					estado: estado as TicketStatus,
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
