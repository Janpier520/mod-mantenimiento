import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '$lib/server/db';
import { initTestDb, type SeedIds } from '$lib/server/db/test-helpers';
import {
	equipment,
	equipment_status_history,
	tickets,
	preventive_maintenance_plans
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createEquipo, updateEquipo, deleteEquipo } from './equipos';
import type { Actor } from './types';

let ids: SeedIds;

function adminActor(): Actor {
	return { id: ids.adminId, rol: 'admin' };
}
function tecnicoActor(): Actor {
	return { id: ids.tecnicoId, rol: 'tecnico' };
}

function baseInput() {
	return {
		tipo_id: ids.tipoPcId,
		modelo: 'OptiPlex SVC',
		marca: 'Dell',
		numero_serie: 'SN-SVC-001',
		estado: 'operativo' as const,
		ubicacion: 'Oficina',
		fecha_adquisicion: '2026-01-10',
		proveedor_id: ids.proveedorId,
		notas: 'nota'
	};
}

describe('equipos service', () => {
	beforeAll(async () => {
		ids = await initTestDb();
	});

	it('creates an equipment row on valid input with trimmed values', async () => {
		const res = await createEquipo({
			...baseInput(),
			tipo_id: ids.tipoPcId,
			modelo: '  OptiPlex Nuevo  ',
			numero_serie: 'SN-SVC-CREATE-001',
			proveedor_id: ids.proveedorId
		});
		expect(res.ok).toBe(true);
		const createdId = res.ok ? res.data.id : null;
		expect(createdId).toBeTruthy();
		const row = await db.query.equipment.findFirst({ where: eq(equipment.id, createdId ?? '') });
		expect(row?.modelo).toBe('OptiPlex Nuevo');
		expect(row?.marca).toBe('Dell');
		expect(row?.estado).toBe('operativo');
		expect(row?.proveedor_id).toBe(ids.proveedorId);
	});

	it('rejects missing required fields and invalid estados with exact errors', async () => {
		const input = { ...baseInput(), tipo_id: ids.tipoPcId };

		const noModelo = await createEquipo({ ...input, modelo: '' });
		expect(noModelo).toEqual({ ok: false, error: 'El modelo es obligatorio', status: 400 });

		const noMarca = await createEquipo({ ...input, marca: '' });
		expect(noMarca).toEqual({ ok: false, error: 'La marca es obligatoria', status: 400 });

		const noTipo = await createEquipo({ ...input, tipo_id: '' });
		expect(noTipo).toEqual({ ok: false, error: 'El tipo de equipo es obligatorio', status: 400 });

		const badEstado = await createEquipo({ ...input, estado: 'volando' as any });
		expect(badEstado).toEqual({ ok: false, error: 'Estado no válido', status: 400 });
	});

	it('updates the row and records exactly one status history entry on state change', async () => {
		const res = await updateEquipo(
			{ ...baseInput(), id: ids.eqOperativoId, estado: 'en_reparacion' },
			adminActor()
		);
		expect(res).toEqual({ ok: true, data: { id: ids.eqOperativoId } });

		const row = await db.query.equipment.findFirst({ where: eq(equipment.id, ids.eqOperativoId) });
		expect(row?.estado).toBe('en_reparacion');

		const history = await db.query.equipment_status_history.findMany({
			where: eq(equipment_status_history.equipo_id, ids.eqOperativoId)
		});
		expect(history).toHaveLength(1);
		expect(history[0].estado_anterior).toBe('operativo');
		expect(history[0].estado_nuevo).toBe('en_reparacion');
		expect(history[0].cambiado_por).toBe(ids.adminId);
	});

	it('rejects an invalid transition (dado_de_baja → operativo) with 400', async () => {
		const res = await updateEquipo(
			{ ...baseInput(), id: ids.eqBajaId, estado: 'operativo' },
			adminActor()
		);
		expect(res).toEqual({
			ok: false,
			error: 'Transición de estado no permitida: dado_de_baja → operativo',
			status: 400
		});
	});

	it('rejects a tecnico decommissioning an equipment with 403 and writes no history', async () => {
		const historyBefore = await db.query.equipment_status_history.findMany({
			where: eq(equipment_status_history.equipo_id, ids.eqOperativoId)
		});

		const res = await updateEquipo(
			{ ...baseInput(), id: ids.eqOperativoId, estado: 'dado_de_baja' },
			tecnicoActor()
		);
		expect(res).toEqual({
			ok: false,
			error: 'Solo los administradores pueden dar de baja equipos',
			status: 403
		});

		const historyAfter = await db.query.equipment_status_history.findMany({
			where: eq(equipment_status_history.equipo_id, ids.eqOperativoId)
		});
		expect(historyAfter).toHaveLength(historyBefore.length);
	});

	it('rejects updating an unknown equipo with 400 (asymmetry vs tickets 404)', async () => {
		const res = await updateEquipo(
			{ ...baseInput(), id: 'no-existe', estado: 'operativo' },
			adminActor()
		);
		expect(res).toEqual({ ok: false, error: 'Equipo no encontrado', status: 400 });
	});

	it('rejects deleting an equipo referenced by tickets, then by PM plans, and deletes unreferenced', async () => {
		// ticket reference
		await db.insert(tickets).values({
			numero_ticket: 'TKT-SVC-REF-001',
			titulo: 'Ref ticket',
			usuario_reporta: ids.adminId,
			equipo_id: ids.eqOperativoId
		});
		const ticketRef = await deleteEquipo({ id: ids.eqOperativoId });
		expect(ticketRef).toEqual({
			ok: false,
			error: 'No se puede eliminar: hay tickets que referencian este equipo',
			status: 400
		});

		// PM plan reference
		await db.insert(preventive_maintenance_plans).values({
			nombre: 'Plan ref equipo',
			equipo_id: ids.eqPrestadoId
		});
		const pmRef = await deleteEquipo({ id: ids.eqPrestadoId });
		expect(pmRef).toEqual({
			ok: false,
			error: 'No se puede eliminar: hay planes de mantenimiento que referencian este equipo',
			status: 400
		});

		// unreferenced delete succeeds
		const ok = await deleteEquipo({ id: ids.eqReparacionId });
		expect(ok).toEqual({ ok: true, data: { id: ids.eqReparacionId } });
		const row = await db.query.equipment.findFirst({ where: eq(equipment.id, ids.eqReparacionId) });
		expect(row).toBeUndefined();
	});

	it('writes no history row on a same-state update', async () => {
		const res = await updateEquipo(
			{ ...baseInput(), id: ids.eqPrestadoId, estado: 'prestado' },
			adminActor()
		);
		expect(res).toEqual({ ok: true, data: { id: ids.eqPrestadoId } });

		const history = await db.query.equipment_status_history.findMany({
			where: eq(equipment_status_history.equipo_id, ids.eqPrestadoId)
		});
		expect(history).toHaveLength(0);
	});
});
