import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '$lib/server/db';
import { initTestDb, type SeedIds } from '$lib/server/db/test-helpers';
import { activity_log } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { logActivity } from './activity';

let ids: SeedIds;

describe('activity service', () => {
	beforeAll(async () => {
		ids = await initTestDb();
	});

	it('inserts an activity row with actor, action, entity and detail', async () => {
		await logActivity({
			actor_id: ids.tecnicoId,
			action: 'transicion',
			entity_type: 'ticket',
			entity_id: 'ticket-act-1',
			detail: 'abierto → en_proceso'
		});

		const rows = await db.query.activity_log.findMany({
			where: and(
				eq(activity_log.entidad_tipo, 'ticket'),
				eq(activity_log.entidad_id, 'ticket-act-1')
			)
		});
		expect(rows).toHaveLength(1);
		expect(rows[0].usuario_id).toBe(ids.tecnicoId);
		expect(rows[0].accion).toBe('transicion');
		expect(rows[0].metadata).toEqual({ detail: 'abierto → en_proceso' });
		expect(rows[0].created_at).toBeTruthy();
	});

	it('logs an empty metadata object when no detail is provided', async () => {
		await logActivity({
			actor_id: ids.adminId,
			action: 'eliminar',
			entity_type: 'ticket',
			entity_id: 'ticket-act-2'
		});

		const rows = await db.query.activity_log.findMany({
			where: and(
				eq(activity_log.entidad_tipo, 'ticket'),
				eq(activity_log.entidad_id, 'ticket-act-2')
			)
		});
		expect(rows).toHaveLength(1);
		expect(rows[0].metadata).toEqual({});
	});

	it('filters by entity type and entity id independently', async () => {
		await logActivity({
			actor_id: ids.adminId,
			action: 'crear',
			entity_type: 'ticket',
			entity_id: 'filter-shared'
		});
		await logActivity({
			actor_id: ids.adminId,
			action: 'crear',
			entity_type: 'equipo',
			entity_id: 'filter-shared'
		});
		await logActivity({
			actor_id: ids.adminId,
			action: 'crear',
			entity_type: 'ticket',
			entity_id: 'filter-other'
		});

		const tickets = await db.query.activity_log.findMany({
			where: and(
				eq(activity_log.entidad_tipo, 'ticket'),
				eq(activity_log.entidad_id, 'filter-shared')
			)
		});
		expect(tickets).toHaveLength(1);
		expect(tickets[0].accion).toBe('crear');
	});

	it('joins the acting user through the usuario relation', async () => {
		await logActivity({
			actor_id: ids.consultorId,
			action: 'comentario',
			entity_type: 'ticket',
			entity_id: 'ticket-act-3'
		});

		const rows = await db.query.activity_log.findMany({
			where: and(
				eq(activity_log.entidad_tipo, 'ticket'),
				eq(activity_log.entidad_id, 'ticket-act-3')
			),
			with: { usuario: { columns: { id: true, nombre: true, apellido: true } } }
		});
		expect(rows).toHaveLength(1);
		expect(rows[0].usuario?.nombre).toBe('Laura');
		expect(rows[0].usuario?.apellido).toBe('Rivas');
	});
});
