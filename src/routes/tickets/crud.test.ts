import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { RequestEvent } from './$types';
import { actions } from './+page.server';
import { db } from '$lib/server/db';
import { initTestDb, type SeedIds } from '$lib/server/db/test-helpers';
import { tickets, ticket_comments, ticket_attachments, activity_log } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// Mock only the disk-write step so upload tests never touch the filesystem.
vi.mock('$lib/server/services/attachments', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/server/services/attachments')>();
	return {
		...actual,
		saveAttachmentFile: vi.fn(async () => 'uploads/test-mocked.txt')
	};
});

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
		email: 'admin@overhaul.test',
		rol: 'admin'
	});
}

function tecnicoLocals(): App.Locals {
	return userLocals({
		id: ids.tecnicoId,
		username: 'tecnico1',
		nombre: 'Carlos',
		apellido: 'Méndez',
		email: 'tecnico@overhaul.test',
		rol: 'tecnico'
	});
}

function consultorLocals(): App.Locals {
	return userLocals({
		id: ids.consultorId,
		username: 'consultor1',
		nombre: 'Laura',
		apellido: 'Rivas',
		email: 'consultor@overhaul.test',
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

async function invokeUpload(locals: App.Locals, formData: FormData): Promise<CrudOutcome> {
	const request = new Request('http://localhost/test', {
		method: 'POST',
		body: formData
	});
	return actions.upload_attachment({
		request,
		locals
	} as unknown as RequestEvent) as unknown as Promise<CrudOutcome>;
}

async function invokeDeleteAttachment(locals: App.Locals, id: string): Promise<CrudOutcome> {
	const fd = new FormData();
	fd.set('id', id);
	const request = new Request('http://localhost/test', {
		method: 'POST',
		body: fd
	});
	return actions.delete_attachment({
		request,
		locals
	} as unknown as RequestEvent) as unknown as Promise<CrudOutcome>;
}

function buildUploadFormData(ticketId: string, file: File): FormData {
	const fd = new FormData();
	fd.set('ticket_id', ticketId);
	fd.set('file', file);
	return fd;
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
	estado: 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado' | 'cancelado' = 'abierto'
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

	it('allows abierto → cancelado for admin', async () => {
		const ticketId = await seedTicket('TKT-CANCEL-A', ids.tecnicoId, 'abierto');
		const res = await invokeCrud(adminLocals(), {
			_action: 'update',
			id: ticketId,
			titulo: 'Cancelable',
			descripcion: '',
			prioridad: 'media',
			estado: 'cancelado',
			tecnico_asignado: '',
			equipo_id: ''
		});
		expect(res).toMatchObject({ success: true, _action: 'update' });
		const row = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
		expect(row?.estado).toBe('cancelado');
	});

	it('fails abierto → cancelado with 403 for a tecnico', async () => {
		const ticketId = await seedTicket('TKT-CANCEL-B', ids.tecnicoId, 'abierto');
		const res = await invokeCrud(tecnicoLocals(), {
			_action: 'update',
			id: ticketId,
			titulo: 'No cancelable',
			descripcion: '',
			prioridad: 'media',
			estado: 'cancelado',
			tecnico_asignado: '',
			equipo_id: ''
		});
		expect(res.status).toBe(403);
		expect(res.data?.error).toContain('El rol');
	});

	it('fails update with 400 out of a cancelado ticket (terminal state)', async () => {
		const ticketId = await seedTicket('TKT-CANCEL-C', ids.tecnicoId, 'cancelado');
		const res = await invokeCrud(adminLocals(), {
			_action: 'update',
			id: ticketId,
			titulo: 'Terminal',
			descripcion: '',
			prioridad: 'media',
			estado: 'abierto',
			tecnico_asignado: '',
			equipo_id: ''
		});
		expect(res.status).toBe(400);
		expect(res.data?.error).toContain('Transición de estado no permitida: cancelado → abierto');
	});

	it('allows a tecnico to reopen resuelto → en_proceso', async () => {
		const ticketId = await seedTicket('TKT-REOPEN-A', ids.tecnicoId, 'resuelto');
		const res = await invokeCrud(tecnicoLocals(), {
			_action: 'update',
			id: ticketId,
			titulo: 'Reopen',
			descripcion: '',
			prioridad: 'media',
			estado: 'en_proceso',
			tecnico_asignado: '',
			equipo_id: ''
		});
		expect(res).toMatchObject({ success: true, _action: 'update' });
		const row = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
		expect(row?.estado).toBe('en_proceso');
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

	it('upload_attachment blocks consultors with 403', async () => {
		const ticketId = await seedTicket('TKT-ATT-0', ids.tecnicoId);
		const res = await invokeUpload(
			consultorLocals(),
			buildUploadFormData(ticketId, new File(['x'], 'a.txt', { type: 'text/plain' }))
		);
		expect(res.status).toBe(403);
		expect(res.data?.error).toBe('Los consultores no pueden subir archivos');
	});

	it('upload_attachment rejects a disallowed mime type with 400', async () => {
		const ticketId = await seedTicket('TKT-ATT-1', ids.tecnicoId);
		const file = new File(['x'], 'malware.exe', { type: 'application/x-msdownload' });
		const res = await invokeUpload(tecnicoLocals(), buildUploadFormData(ticketId, file));
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('Tipo de archivo no permitido');
	});

	it('upload_attachment rejects a file larger than 5 MB with 400', async () => {
		const ticketId = await seedTicket('TKT-ATT-2', ids.tecnicoId);
		const big = new File([new Array(5 * 1024 * 1024 + 1).fill('a').join('')], 'big.pdf', {
			type: 'application/pdf'
		});
		const res = await invokeUpload(tecnicoLocals(), buildUploadFormData(ticketId, big));
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('El archivo supera el tamaño máximo de 5 MB');
	});

	it('upload_attachment persists a valid file row', async () => {
		const ticketId = await seedTicket('TKT-ATT-3', ids.tecnicoId);
		const file = new File(['hola mundo'], 'nota.txt', { type: 'text/plain' });
		const res = await invokeUpload(tecnicoLocals(), buildUploadFormData(ticketId, file));
		expect(res).toMatchObject({ success: true, _action: 'upload_attachment' });

		const rows = await db.query.ticket_attachments.findMany({
			where: eq(ticket_attachments.ticket_id, ticketId)
		});
		expect(rows).toHaveLength(1);
		expect(rows[0].filename).toBe('nota.txt');
		expect(rows[0].mime_type).toBe('text/plain');
		expect(rows[0].uploaded_by).toBe(ids.tecnicoId);
		expect(rows[0].filepath).toBe('uploads/test-mocked.txt');
	});

	it('upload_attachment fails 404 for a missing ticket', async () => {
		const file = new File(['x'], 'a.txt', { type: 'text/plain' });
		const res = await invokeUpload(tecnicoLocals(), buildUploadFormData('no-existe', file));
		expect(res.status).toBe(404);
		expect(res.data?.error).toBe('Ticket no encontrado');
	});

	it('delete_attachment is blocked for a non-owner non-admin', async () => {
		const ticketId = await seedTicket('TKT-ATT-4', ids.tecnicoId);
		const upload = await invokeUpload(
			adminLocals(),
			buildUploadFormData(ticketId, new File(['x'], 'a.txt', { type: 'text/plain' }))
		);
		expect(upload).toMatchObject({ success: true });
		const rows = await db.query.ticket_attachments.findMany({
			where: eq(ticket_attachments.ticket_id, ticketId)
		});
		expect(rows).toHaveLength(1);

		const res = await invokeDeleteAttachment(tecnicoLocals(), rows[0].id);
		expect(res.status).toBe(403);
		expect(res.data?.error).toBe('No tenés permiso para eliminar este archivo');
	});

	it('delete_attachment removes the row for the owner', async () => {
		const ticketId = await seedTicket('TKT-ATT-5', ids.tecnicoId);
		const upload = await invokeUpload(
			tecnicoLocals(),
			buildUploadFormData(ticketId, new File(['x'], 'a.txt', { type: 'text/plain' }))
		);
		expect(upload).toMatchObject({ success: true });
		const rows = await db.query.ticket_attachments.findMany({
			where: eq(ticket_attachments.ticket_id, ticketId)
		});
		expect(rows).toHaveLength(1);

		const res = await invokeDeleteAttachment(tecnicoLocals(), rows[0].id);
		expect(res).toMatchObject({ success: true, _action: 'delete_attachment' });
		const remaining = await db.query.ticket_attachments.findMany({
			where: eq(ticket_attachments.ticket_id, ticketId)
		});
		expect(remaining).toHaveLength(0);
	});

	it('upload_attachment logs an adjunto activity row', async () => {
		const ticketId = await seedTicket('TKT-ATT-LOG1', ids.tecnicoId);
		const res = await invokeUpload(
			tecnicoLocals(),
			buildUploadFormData(ticketId, new File(['x'], 'log.txt', { type: 'text/plain' }))
		);
		expect(res).toMatchObject({ success: true });
		const rows = await db.query.activity_log.findMany({
			where: and(eq(activity_log.entidad_tipo, 'ticket'), eq(activity_log.entidad_id, ticketId))
		});
		expect(rows.some((r) => r.accion === 'adjunto')).toBe(true);
	});

	it('delete_attachment logs an adjunto_eliminado activity row', async () => {
		const ticketId = await seedTicket('TKT-ATT-LOG2', ids.tecnicoId);
		const upload = await invokeUpload(
			tecnicoLocals(),
			buildUploadFormData(ticketId, new File(['x'], 'del.txt', { type: 'text/plain' }))
		);
		expect(upload).toMatchObject({ success: true });
		const rows = await db.query.ticket_attachments.findMany({
			where: eq(ticket_attachments.ticket_id, ticketId)
		});
		expect(rows).toHaveLength(1);

		const res = await invokeDeleteAttachment(tecnicoLocals(), rows[0].id);
		expect(res).toMatchObject({ success: true, _action: 'delete_attachment' });

		const activity = await db.query.activity_log.findMany({
			where: and(eq(activity_log.entidad_tipo, 'ticket'), eq(activity_log.entidad_id, ticketId))
		});
		expect(activity.some((r) => r.accion === 'adjunto_eliminado')).toBe(true);
	});
});
