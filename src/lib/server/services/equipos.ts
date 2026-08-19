import { db } from '$lib/server/db';
import {
	equipment,
	equipment_status_history,
	tickets,
	preventive_maintenance_plans
} from '$lib/server/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import {
	isValidTransition,
	canTransition,
	VALID_EQUIPMENT_STATES,
	type EquipmentState
} from '$lib/server/state-machines';
import type { ServiceResult, Actor } from './types';

export interface EquipoInput {
	tipo_id: string;
	modelo: string;
	marca: string;
	numero_serie: string;
	estado: EquipmentState;
	ubicacion: string;
	fecha_adquisicion: string;
	proveedor_id: string;
	notas: string;
}
export interface UpdateEquipoInput extends EquipoInput {
	id: string;
}
export interface DeleteEquipoInput {
	id: string;
}

export type EquipoResult = ServiceResult<{ id: string }>;

function validateEquipoInputs(input: EquipoInput): string | null {
	const { modelo, marca, tipo_id, estado } = input;
	if (!modelo || modelo.trim().length === 0) return 'El modelo es obligatorio';
	if (!marca || marca.trim().length === 0) return 'La marca es obligatoria';
	if (!tipo_id) return 'El tipo de equipo es obligatorio';
	if (!VALID_EQUIPMENT_STATES.includes(estado)) return 'Estado no válido';
	return null;
}

async function isSerialInUse(numeroSerie: string, excludeId?: string): Promise<boolean> {
	const conditions = [eq(equipment.numero_serie, numeroSerie)];
	if (excludeId) conditions.push(ne(equipment.id, excludeId));
	const [row] = await db
		.select({ id: equipment.id })
		.from(equipment)
		.where(and(...conditions))
		.limit(1);
	return !!row;
}

export async function createEquipo(input: EquipoInput): Promise<EquipoResult> {
	const fieldError = validateEquipoInputs(input);
	if (fieldError) return { ok: false, error: fieldError, status: 400 };

	const serial = input.numero_serie.trim();
	if (serial && (await isSerialInUse(serial))) {
		return { ok: false, error: 'El número de serie ya está registrado', status: 400 };
	}

	const [row] = await db
		.insert(equipment)
		.values({
			tipo_id: input.tipo_id,
			modelo: input.modelo.trim(),
			marca: input.marca.trim(),
			numero_serie: serial || null,
			estado: input.estado,
			ubicacion: input.ubicacion.trim(),
			fecha_adquisicion: input.fecha_adquisicion || null,
			proveedor_id: input.proveedor_id || null,
			notas: input.notas.trim()
		})
		.returning({ id: equipment.id });

	return { ok: true, data: { id: row.id } };
}

export async function updateEquipo(input: UpdateEquipoInput, actor: Actor): Promise<EquipoResult> {
	const { id, estado } = input;

	const fieldError = validateEquipoInputs(input);
	if (fieldError) return { ok: false, error: fieldError, status: 400 };

	if (!id) return { ok: false, error: 'ID de equipo no proporcionado', status: 400 };

	const existing = await db.query.equipment.findFirst({ where: eq(equipment.id, id) });
	if (!existing) return { ok: false, error: 'Equipo no encontrado', status: 400 };

	if (existing.estado !== estado && !isValidTransition(existing.estado, estado, 'equipment')) {
		return {
			ok: false,
			error: `Transición de estado no permitida: ${existing.estado} → ${estado}`,
			status: 400
		};
	}

	if (existing.estado !== estado) {
		const roleCheck = canTransition(existing.estado, estado, actor.rol, 'equipment');
		if (!roleCheck.allowed) {
			return { ok: false, error: roleCheck.error ?? '', status: 403 };
		}
	}

	const serial = input.numero_serie.trim();
	if (serial && (await isSerialInUse(serial, id))) {
		return { ok: false, error: 'El número de serie ya está registrado', status: 400 };
	}

	if (existing.estado !== estado) {
		await db.insert(equipment_status_history).values({
			equipo_id: id,
			estado_anterior: existing.estado,
			estado_nuevo: estado,
			cambiado_por: actor.id
		});
	}

	await db
		.update(equipment)
		.set({
			tipo_id: input.tipo_id,
			modelo: input.modelo.trim(),
			marca: input.marca.trim(),
			numero_serie: serial || null,
			estado,
			ubicacion: input.ubicacion.trim(),
			fecha_adquisicion: input.fecha_adquisicion || null,
			proveedor_id: input.proveedor_id || null,
			notas: input.notas.trim(),
			updated_at: new Date().toISOString()
		})
		.where(eq(equipment.id, id));

	return { ok: true, data: { id } };
}

export async function deleteEquipo(input: DeleteEquipoInput): Promise<EquipoResult> {
	const { id } = input;

	if (!id) return { ok: false, error: 'ID de equipo no proporcionado', status: 400 };

	const ref = await db.query.tickets.findFirst({ where: eq(tickets.equipo_id, id) });
	if (ref) {
		return {
			ok: false,
			error: 'No se puede eliminar: hay tickets que referencian este equipo',
			status: 400
		};
	}

	const pmPlanRef = await db.query.preventive_maintenance_plans.findFirst({
		where: eq(preventive_maintenance_plans.equipo_id, id)
	});
	if (pmPlanRef) {
		return {
			ok: false,
			error: 'No se puede eliminar: hay planes de mantenimiento que referencian este equipo',
			status: 400
		};
	}

	await db.delete(equipment).where(eq(equipment.id, id));
	return { ok: true, data: { id } };
}
