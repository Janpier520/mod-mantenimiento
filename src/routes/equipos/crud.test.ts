import { describe, it, expect, beforeAll } from 'vitest';
import type { RequestEvent } from './$types';
import { actions } from './+page.server';
import { db } from '$lib/server/db';
import { initTestDb, type SeedIds } from '$lib/server/db/test-helpers';
import {
	equipment_status_history,
	tickets,
	preventive_maintenance_plans,
	equipment
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// TC-8: equipos crud action — direct invocation, real in-memory DB.

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

const baseFields = {
	tipo_id: 'TIPO',
	modelo: 'OptiPlex X',
	marca: 'Dell',
	numero_serie: 'SN-001',
	estado: 'operativo',
	ubicacion: 'Oficina 1',
	fecha_adquisicion: '2026-01-10',
	proveedor_id: 'PROV',
	notas: 'nota'
};

describe('equipos crud (TC-8)', () => {
	beforeAll(async () => {
		ids = await initTestDb();
		// seed-time data uses real type/proveedor ids
		baseFields.tipo_id = ids.tipoPcId;
		baseFields.proveedor_id = ids.proveedorId;
	});

	it('throws a 303 redirect to /login when unauthenticated', async () => {
		await expect(invokeCrud({ user: null }, { _action: 'create' })).rejects.toMatchObject({
			status: 303,
			location: '/login'
		});
	});

	it('blocks consultor actions with 403', async () => {
		const res = await invokeCrud(consultorLocals(), { _action: 'create', ...baseFields });
		expect(res.status).toBe(403);
		expect(res.data?.error).toBe('Los consultores no pueden modificar equipos');
	});

	it('fails create with 400 when modelo is missing', async () => {
		const res = await invokeCrud(adminLocals(), {
			_action: 'create',
			...baseFields,
			modelo: ''
		});
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('El modelo es obligatorio');
	});

	it('fails create with 400 when marca is missing', async () => {
		const res = await invokeCrud(adminLocals(), { _action: 'create', ...baseFields, marca: '' });
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('La marca es obligatoria');
	});

	it('fails create with 400 when tipo_id is missing', async () => {
		const res = await invokeCrud(adminLocals(), { _action: 'create', ...baseFields, tipo_id: '' });
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('El tipo de equipo es obligatorio');
	});

	it('creates a new equipment row on valid create', async () => {
		const res = await invokeCrud(adminLocals(), {
			_action: 'create',
			...baseFields,
			modelo: 'OptiPlex Nuevo',
			numero_serie: 'SN-CREATE-001'
		});
		expect(res).toMatchObject({ success: true, _action: 'create' });

		const row = await db.query.equipment.findFirst({
			where: eq(equipment.numero_serie, 'SN-CREATE-001')
		});
		expect(row).not.toBeNull();
		expect(row!.modelo).toBe('OptiPlex Nuevo');
		expect(row!.estado).toBe('operativo');
	});

	it('updates the row and records exactly one status history entry on state change', async () => {
		const res = await invokeCrud(adminLocals(), {
			_action: 'update',
			id: ids.eqOperativoId,
			...baseFields,
			estado: 'en_reparacion'
		});
		expect(res).toMatchObject({ success: true, _action: 'update' });

		const row = await db.query.equipment.findFirst({ where: eq(equipment.id, ids.eqOperativoId) });
		expect(row!.estado).toBe('en_reparacion');

		const history = await db.query.equipment_status_history.findMany({
			where: eq(equipment_status_history.equipo_id, ids.eqOperativoId)
		});
		expect(history).toHaveLength(1);
		expect(history[0].estado_anterior).toBe('operativo');
		expect(history[0].estado_nuevo).toBe('en_reparacion');
		expect(history[0].cambiado_por).toBe(ids.adminId);
	});

	it('fails update with 400 for an invalid transition (dado_de_baja → operativo)', async () => {
		const res = await invokeCrud(adminLocals(), {
			_action: 'update',
			id: ids.eqBajaId,
			...baseFields,
			estado: 'operativo'
		});
		expect(res.status).toBe(400);
		expect(res.data?.error).toContain(
			'Transición de estado no permitida: dado_de_baja → operativo'
		);
	});

	it('fails update with 403 when a tecnico decommissions equipment', async () => {
		const res = await invokeCrud(tecnicoLocals(), {
			_action: 'update',
			id: ids.eqOperativoId,
			...baseFields,
			estado: 'dado_de_baja'
		});
		expect(res.status).toBe(403);
		expect(res.data?.error).toBe('Solo los administradores pueden dar de baja equipos');
	});

	it('fails delete with 400 when tickets reference the equipment', async () => {
		await db.insert(tickets).values({
			numero_ticket: 'TKT-REF-EQUIPO-001',
			titulo: 'Referencia ticket',
			usuario_reporta: ids.adminId,
			equipo_id: ids.eqOperativoId
		});
		const res = await invokeCrud(adminLocals(), { _action: 'delete', id: ids.eqOperativoId });
		expect(res.status).toBe(400);
		expect(res.data?.error).toContain('hay tickets que referencian este equipo');
	});

	it('fails delete with 400 when PM plans reference the equipment', async () => {
		await db.insert(preventive_maintenance_plans).values({
			nombre: 'Plan ref equipo',
			equipo_id: ids.eqPrestadoId
		});
		const res = await invokeCrud(adminLocals(), { _action: 'delete', id: ids.eqPrestadoId });
		expect(res.status).toBe(400);
		expect(res.data?.error).toContain('hay planes de mantenimiento que referencian este equipo');
	});

	it('fails create with 400 when the estado is not a valid equipment state', async () => {
		const res = await invokeCrud(adminLocals(), {
			_action: 'create',
			...baseFields,
			estado: 'volando'
		});
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('Estado no válido');
	});

	it('deletes an unreferenced equipment successfully', async () => {
		const res = await invokeCrud(adminLocals(), { _action: 'delete', id: ids.eqReparacionId });
		expect(res).toMatchObject({ success: true, _action: 'delete' });
		const row = await db.query.equipment.findFirst({ where: eq(equipment.id, ids.eqReparacionId) });
		expect(row).toBeUndefined();
	});

	it('fails with 400 for an unknown action', async () => {
		const res = await invokeCrud(adminLocals(), { _action: 'explode' });
		expect(res.status).toBe(400);
		expect(res.data?.error).toBe('Acción no válida');
	});
});
