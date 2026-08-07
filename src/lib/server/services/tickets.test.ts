import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '$lib/server/db';
import { initTestDb, type SeedIds } from '$lib/server/db/test-helpers';
import { tickets, ticket_comments } from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';
import {
	generateTicketNumber,
	createTicket,
	updateTicket,
	deleteTicket,
	addComment
} from './tickets';
import type { Actor } from './types';

// NOTE: no it.concurrent in this file — sequential ticket numbering depends on
// the shared in-memory DB state (mirrors the route crud.test.ts note).

let ids: SeedIds;

function adminActor(): Actor {
	return { id: ids.adminId, rol: 'admin' };
}
function tecnicoActor(): Actor {
	return { id: ids.tecnicoId, rol: 'tecnico' };
}

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

describe('tickets service', () => {
	beforeAll(async () => {
		ids = await initTestDb();
	});

	it('generateTicketNumber returns sequential TKT numbers 001 then 002 for same-day creates', async () => {
		const first = await generateTicketNumber();
		expect(first).toMatch(/^TKT-\d{8}-\d{3}$/);

		const firstCreate = await createTicket(
			{ titulo: 'Num 1', descripcion: '', prioridad: 'media', equipo_id: '' },
			tecnicoActor()
		);
		expect(firstCreate.ok).toBe(true);
		const firstNumber = firstCreate.ok ? firstCreate.data.numero_ticket : null;
		expect(firstNumber).toMatch(/^TKT-\d{8}-001$/);

		const secondCreate = await createTicket(
			{ titulo: 'Num 2', descripcion: '', prioridad: 'media', equipo_id: '' },
			tecnicoActor()
		);
		expect(secondCreate.ok).toBe(true);
		const secondNumber = secondCreate.ok ? secondCreate.data.numero_ticket : null;
		expect(secondNumber).toMatch(/^TKT-\d{8}-002$/);
		expect(secondNumber?.slice(0, 12)).toBe(firstNumber?.slice(0, 12));
	});

	it('creates a ticket with a generated numero and actor as reporter', async () => {
		const res = await createTicket(
			{ titulo: 'Ticket servicio', descripcion: 'Desc', prioridad: 'alta', equipo_id: '' },
			tecnicoActor()
		);
		expect(res.ok).toBe(true);
		const createdId = res.ok ? res.data.id : null;
		expect(createdId).toBeTruthy();
		expect(res.ok && res.data.numero_ticket).toMatch(/^TKT-\d{8}-\d{3}$/);

		const row = await db.query.tickets.findFirst({ where: eq(tickets.id, createdId ?? '') });
		expect(row?.usuario_reporta).toBe(ids.tecnicoId);
		expect(row?.titulo).toBe('Ticket servicio');
		expect(row?.prioridad).toBe('alta');
	});

	it('rejects creating a ticket for a decommissioned equipment', async () => {
		const res = await createTicket(
			{ titulo: 'T', descripcion: '', prioridad: 'media', equipo_id: ids.eqBajaId },
			tecnicoActor()
		);
		expect(res).toEqual({
			ok: false,
			error: 'No se puede crear un ticket para un equipo dado de baja',
			status: 400
		});
	});

	it('rejects creating a ticket with an unknown equipment', async () => {
		const res = await createTicket(
			{ titulo: 'T', descripcion: '', prioridad: 'media', equipo_id: 'no-existe' },
			tecnicoActor()
		);
		expect(res).toEqual({ ok: false, error: 'Equipo no encontrado', status: 400 });
	});

	it('rejects invalid transitions (400) and role-denied transitions (403)', async () => {
		const ticketA = await seedTicket('TKT-SVC-01', ids.tecnicoId, 'abierto');
		const invalid = await updateTicket(
			{
				id: ticketA,
				titulo: 'A',
				descripcion: '',
				prioridad: 'media',
				estado: 'resuelto',
				tecnico_asignado: '',
				equipo_id: ''
			},
			tecnicoActor()
		);
		expect(invalid.ok).toBe(false);
		if (invalid.ok) return;
		expect(invalid.status).toBe(400);
		expect(invalid.error).toContain('Transición de estado no permitida: abierto → resuelto');

		const ticketB = await seedTicket('TKT-SVC-02', ids.tecnicoId, 'abierto');
		const denied = await updateTicket(
			{
				id: ticketB,
				titulo: 'B',
				descripcion: '',
				prioridad: 'media',
				estado: 'cerrado',
				tecnico_asignado: '',
				equipo_id: ''
			},
			tecnicoActor()
		);
		expect(denied.ok).toBe(false);
		if (denied.ok) return;
		expect(denied.status).toBe(403);
		expect(denied.error).toContain('El rol');
	});

	it('updateTicket unknown id returns 404; deleteTicket unknown id returns 400 (asymmetry)', async () => {
		const upd = await updateTicket(
			{
				id: 'no-existe',
				titulo: 'X',
				descripcion: '',
				prioridad: 'media',
				estado: 'abierto',
				tecnico_asignado: '',
				equipo_id: ''
			},
			adminActor()
		);
		expect(upd).toEqual({ ok: false, error: 'Ticket no encontrado', status: 404 });

		const del = await deleteTicket({ id: 'no-existe' }, adminActor());
		expect(del).toEqual({ ok: false, error: 'Ticket no encontrado', status: 400 });
	});

	it('deleteTicket enforces creator-or-admin', async () => {
		// non-creator non-admin denied
		const consultorCreated = await seedTicket('TKT-SVC-03', ids.consultorId, 'abierto');
		const denied = await deleteTicket({ id: consultorCreated }, tecnicoActor());
		expect(denied).toEqual({
			ok: false,
			error: 'No tenés permiso para eliminar este ticket',
			status: 403
		});

		// creator ok
		const own = await seedTicket('TKT-SVC-04', ids.tecnicoId, 'abierto');
		const creatorDel = await deleteTicket({ id: own }, tecnicoActor());
		expect(creatorDel).toEqual({ ok: true, data: { id: own } });

		// admin on consultor-created ticket ok
		const adminDel = await deleteTicket({ id: consultorCreated }, adminActor());
		expect(adminDel).toEqual({ ok: true, data: { id: consultorCreated } });
	});

	it('addComment creates a comment row and enforces 404/400 guards', async () => {
		const ticketId = await seedTicket('TKT-SVC-05', ids.tecnicoId, 'abierto');

		const ok = await addComment({ ticket_id: ticketId, contenido: 'Avance' }, tecnicoActor());
		expect(ok.ok).toBe(true);
		const commentId = ok.ok ? ok.data.commentId : null;
		expect(commentId).toBeTruthy();
		const comment = await db.query.ticket_comments.findFirst({
			where: eq(ticket_comments.id, commentId ?? '')
		});
		expect(comment?.usuario_id).toBe(ids.tecnicoId);
		expect(comment?.contenido).toBe('Avance');

		const missing = await addComment({ ticket_id: 'no-existe', contenido: 'x' }, tecnicoActor());
		expect(missing).toEqual({ ok: false, error: 'Ticket no encontrado', status: 404 });

		const empty = await addComment({ ticket_id: ticketId, contenido: '   ' }, tecnicoActor());
		expect(empty).toEqual({ ok: false, error: 'El comentario no puede estar vacío', status: 400 });
	});

	it('validates the title before running numbering (no row created)', async () => {
		const [before] = await db.select({ cnt: count() }).from(tickets);
		const res = await createTicket(
			{ titulo: '   ', descripcion: '', prioridad: 'media', equipo_id: '' },
			tecnicoActor()
		);
		expect(res).toEqual({
			ok: false,
			error: 'El título del ticket es obligatorio',
			status: 400
		});
		const [after] = await db.select({ cnt: count() }).from(tickets);
		expect(after.cnt).toBe(before.cnt);
	});
});
