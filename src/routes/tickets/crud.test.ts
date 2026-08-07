import { describe, it, expect, beforeAll } from 'vitest';
import type { RequestEvent } from './$types';
import { actions } from './+page.server';
import { db } from '$lib/server/db';
import { initTestDb, type SeedIds } from '$lib/server/db/test-helpers';
import { tickets, ticket_comments } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// TC-10: tickets crud action — create validations, sequential numbering,
// transition/role guards, delete creator-or-admin, add_comment.
// NOTE: no it.concurrent in this file (spec TC-11) — shared in-memory DB per
// file and sequential ticket numbering.

let ids: SeedIds;

function buildFormData(fields: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.set(k, v);
	return fd;
}

function userLocals(user: NonNullable<App.Locals['user']>): App.Locals {
	return { user };
}

function adminLocals(): App.Locals {
	return userLocals({
		id: ids.adminId,
		username: 'admin',
		nombre: 'Admin',
		apellido: 'Sistema',
		email: 'admin@equiplab.test',
		rol: 'admin'
	});
}

function tecnicoLocals(): App.Locals {
	return userLocals({
		id: ids.tecnicoId,
		username: 'tecnico1',
		nombre: 'Carlos',
		apellido: 'Méndez',
		email: 'tecnico@equiplab.test',
		rol: 'tecnico'
	});
}

function consultorLocals(): App.Locals {
	return userLocals({
		id: ids.consultorId,
		username: 'consultor1',
		nombre: 'Laura',
		apellido: 'Rivas',
		email: 'consultor@equiplab.test',
		rol: 'consultor'
	});
}

interface CrudOutcome {
	status?: number;
	data?: { error?: string; _action?: string };
	success?: boolean;
}

async function invokeCrud(
	locals: App.Locals,
	fields: Record<string, string>
): Promise<CrudOutcome> {
	const request = new Request('http://localhost/test', {
		method: 'POST',
		body: buildFormData(fields)
	});
	return actions.crud({
		request,
		locals
	} as unknown as RequestEvent) as unknown as Promise<CrudOutcome>;
}

const createFields = {
	titulo: 'Ticket de prueba',
	descripcion: 'Descripción',
	prioridad: 'media',
	equipo_id: ''
};

async function seedTicket(
	numero: string,
	usuarioReporta: string,
	estado: 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado' = 'abierto'
): Promise<string> {
	const [row] = await db
		.insert(tickets)
		.values({
			numero_ticket: numero,
			titulo: `Ticket ${numero}`,
			estado,
			usuario_reporta: usuarioReporta
		})
		.returning({ id: tickets.id });
	return row.id;
}

describe('tickets crud (TC-10)', () => {
	beforeAll(async () => {
		ids = await initTestDb();
	});

	it('throws a 303 redirect to /login when unauthenticated', async () => {
		await expect(invokeCrud({ user: null }, { _action: 'create' })).rejects.toMatchObject({
			status: 303,
			location: '/login'
		});
	});

	it('blocks all consultor actions with 403', async () => {
		const res = await invokeCrud(consultorLocals(), { _action: 'create', ...createFields });
		expect(res.status).toBe(403);
		expect(res.data?.error).toBe('Los consultores no pueden modificar tickets');
	});

	it('fails create with 400 when the title is empty', async () => {
		const res = await invokeCrud(tecnicoLocals(), {
			_action: 'create',
			...createFields,
			titulo: ''
		});
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('El título del ticket es obligatorio');
	});

	it('fails create with 400 when the equipment does not exist', async () => {
		const res = await invokeCrud(tecnicoLocals(), {
			_action: 'create',
			...createFields,
			equipo_id: 'no-existe'
		});
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('Equipo no encontrado');
	});

	it('fails create with 400 for a decommissioned equipment', async () => {
		const res = await invokeCrud(tecnicoLocals(), {
			_action: 'create',
			...createFields,
			equipo_id: ids.eqBajaId
		});
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('No se puede crear un ticket para un equipo dado de baja');
	});

	it('generates sequential ticket numbers TKT-YYYYMMDD-001/002', async () => {
		const first = await invokeCrud(tecnicoLocals(), { _action: 'create', ...createFields });
		expect(first).toMatchObject({ success: true });
		const second = await invokeCrud(tecnicoLocals(), { _action: 'create', ...createFields });
		expect(second).toMatchObject({ success: true });

		const created = await db.query.tickets.findMany({
			where: eq(tickets.titulo, 'Ticket de prueba'),
			orderBy: (t, { asc }) => [asc(t.created_at)]
		});
		const numbers = created.map((t) => t.numero_ticket);
		expect(numbers).toHaveLength(2);
		expect(numbers[0]).toMatch(/^TKT-\d{8}-001$/);
		expect(numbers[1]).toMatch(/^TKT-\d{8}-002$/);
		expect(numbers[0].slice(0, 12)).toBe(numbers[1].slice(0, 12)); // same date part
	});

	it('fails update with 400 for an invalid transition (abierto → resuelto)', async () => {
		const ticketId = await seedTicket('TKT-TEST-A', ids.tecnicoId, 'abierto');
		const res = await invokeCrud(tecnicoLocals(), {
			_action: 'update',
			id: ticketId,
			titulo: 'Ticket A',
			descripcion: '',
			prioridad: 'media',
			estado: 'resuelto',
			tecnico_asignado: '',
			equipo_id: ''
		});
		expect(res.status).toBe(400);
		expect(res.data?.error).toContain('Transición de estado no permitida: abierto → resuelto');
	});

	it('fails update with 403 when a tecnico closes a ticket (cerrado needs admin/consultor)', async () => {
		const ticketId = await seedTicket('TKT-TEST-B', ids.tecnicoId, 'abierto');
		const res = await invokeCrud(tecnicoLocals(), {
			_action: 'update',
			id: ticketId,
			titulo: 'Ticket B',
			descripcion: '',
			prioridad: 'media',
			estado: 'cerrado',
			tecnico_asignado: '',
			equipo_id: ''
		});
		expect(res.status).toBe(403);
		expect(res.data?.error).toContain('El rol');
	});

	it('delete is blocked for a non-creator non-admin (consultor-created ticket)', async () => {
		// consultor-created ticket seeded via direct insert — the action blocks
		// consultor at the top, so the "created by consultor" state is a
		// legitimate historical record, not something a consultor can create live
		const ticketId = await seedTicket('TKT-TEST-C', ids.consultorId, 'abierto');
		const res = await invokeCrud(tecnicoLocals(), { _action: 'delete', id: ticketId });
		expect(res.status).toBe(403);
		expect(res.data?.error).toBe('No tenés permiso para eliminar este ticket');
	});

	it('delete succeeds for the creator', async () => {
		const ticketId = await seedTicket('TKT-TEST-D', ids.tecnicoId, 'abierto');
		const res = await invokeCrud(tecnicoLocals(), { _action: 'delete', id: ticketId });
		expect(res).toMatchObject({ success: true, _action: 'delete' });
		const row = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
		expect(row).toBeUndefined();
	});

	it('delete succeeds for an admin on any ticket', async () => {
		const ticketId = await seedTicket('TKT-TEST-E', ids.consultorId, 'abierto');
		const res = await invokeCrud(adminLocals(), { _action: 'delete', id: ticketId });
		expect(res).toMatchObject({ success: true, _action: 'delete' });
	});

	it('add_comment creates a comment row on valid input', async () => {
		const ticketId = await seedTicket('TKT-TEST-F', ids.tecnicoId, 'abierto');
		const res = await invokeCrud(tecnicoLocals(), {
			_action: 'add_comment',
			ticket_id: ticketId,
			contenido: 'Avance: repuesto pedido'
		});
		expect(res).toMatchObject({ success: true, _action: 'add_comment' });
		const comments = await db.query.ticket_comments.findMany({
			where: eq(ticket_comments.ticket_id, ticketId)
		});
		expect(comments).toHaveLength(1);
		expect(comments[0].contenido).toBe('Avance: repuesto pedido');
		expect(comments[0].usuario_id).toBe(ids.tecnicoId);
	});

	it('add_comment fails 400 for empty content', async () => {
		const ticketId = await seedTicket('TKT-TEST-G', ids.tecnicoId, 'abierto');
		const res = await invokeCrud(tecnicoLocals(), {
			_action: 'add_comment',
			ticket_id: ticketId,
			contenido: '   '
		});
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('El comentario no puede estar vacío');
	});

	it('add_comment fails 404 for a missing ticket', async () => {
		const res = await invokeCrud(tecnicoLocals(), {
			_action: 'add_comment',
			ticket_id: 'no-existe',
			contenido: 'hola'
		});
		expect(res.status).toBe(404);
		expect(res.data?.error).toBe('Ticket no encontrado');
	});

	it('fails update with 400 when the assigned tecnico does not exist', async () => {
		const ticketId = await seedTicket('TKT-TEST-H', ids.tecnicoId, 'abierto');
		const res = await invokeCrud(tecnicoLocals(), {
			_action: 'update',
			id: ticketId,
			titulo: 'Ticket H',
			descripcion: '',
			prioridad: 'media',
			estado: 'abierto',
			tecnico_asignado: 'no-existe',
			equipo_id: ''
		});
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('Técnico no encontrado');
	});

	it('fails with 400 for an unknown action', async () => {
		const res = await invokeCrud(tecnicoLocals(), { _action: 'explode' });
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('Acción no válida');
	});

	it('add_comment fails 400 when no ticket_id is provided', async () => {
		const res = await invokeCrud(tecnicoLocals(), { _action: 'add_comment', contenido: 'hola' });
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('ID de ticket no proporcionado');
	});
});
