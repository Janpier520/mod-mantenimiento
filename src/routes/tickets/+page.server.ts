import { db } from '$lib/server/db';
import { tickets, users, equipment } from '$lib/server/db/schema';
import { eq, like, or, and, count, asc, desc } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { escapeLike } from '$lib/server/validators';
import { requireAuth } from '$lib/server/auth';
import { createTicket, updateTicket, deleteTicket, addComment } from '$lib/server/services/tickets';
import type { Actor } from '$lib/server/services/types';

const PAGE_SIZE = 10;

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
		if (locals.user.rol === 'consultor') {
			return fail(403, { error: 'Los consultores no pueden modificar tickets', _action: '' });
		}

		const form = await request.formData();
		const _action = form.get('_action') as string;
		const id = (form.get('id') as string) ?? '';
		const actor: Actor = { id: locals.user.id, rol: locals.user.rol };

		if (_action === 'create') {
			const res = await createTicket(
				{
					titulo: (form.get('titulo') as string) ?? '',
					descripcion: (form.get('descripcion') as string) ?? '',
					prioridad: (form.get('prioridad') as string) ?? 'media',
					equipo_id: (form.get('equipo_id') as string) ?? ''
				},
				actor
			);
			if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action });
			return { success: true, _action };
		}

		if (_action === 'update') {
			const res = await updateTicket(
				{
					id,
					titulo: (form.get('titulo') as string) ?? '',
					descripcion: (form.get('descripcion') as string) ?? '',
					prioridad: (form.get('prioridad') as string) ?? 'media',
					estado: (form.get('estado') as string) ?? 'abierto',
					tecnico_asignado: (form.get('tecnico_asignado') as string) ?? '',
					equipo_id: (form.get('equipo_id') as string) ?? ''
				},
				actor
			);
			if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action });
			return { success: true, _action };
		}

		if (_action === 'delete') {
			const res = await deleteTicket({ id }, actor);
			if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action });
			return { success: true, _action };
		}

		if (_action === 'add_comment') {
			const res = await addComment(
				{
					ticket_id: (form.get('ticket_id') as string) ?? '',
					contenido: (form.get('contenido') as string) ?? ''
				},
				actor
			);
			if (!res.ok) return fail(res.status ?? 400, { error: res.error, _action });
			return { success: true, _action };
		}

		return fail(400, { error: 'Acción no válida', _action });
	}
};
