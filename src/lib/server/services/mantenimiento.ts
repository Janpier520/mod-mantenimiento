import { db } from '$lib/server/db';
import {
	preventive_maintenance_plans,
	pm_tasks,
	pm_executions,
	equipment,
	equipment_types,
	users,
	pm_execution_parts,
	inventory_items,
	inventory_movements
} from '$lib/server/db/schema';
import { eq, count, and, sql } from 'drizzle-orm';
import { addDaysToDate, todayISO } from '$lib/server/dates';
import type { ServiceResult, Actor } from './types';

const CONSULTOR_ERROR: ServiceResult<never> = {
	ok: false,
	error: 'Los consultores no pueden modificar mantenimiento',
	status: 403
};

export interface PlanInput {
	nombre: string;
	descripcion: string;
	frecuencia_dias: number;
	equipo_id: string;
	tipo_equipo_id: string;
}
export interface TaskInput {
	nombre: string;
	descripcion: string;
}
export interface ScheduleExecutionInput {
	plan_id: string;
	ejecutado_por: string;
	fecha_programada: string;
}
export interface ExecutionPartInput {
	inventory_item_id: string;
	accion: 'instalado' | 'removido' | 'reemplazado';
	cantidad: number;
	observaciones: string;
}

export interface CompleteExecutionInput {
	id: string;
	resultado: string;
	observaciones: string;
	parts?: ExecutionPartInput[];
}
export interface CancelExecutionInput {
	id: string;
}
export interface RescheduleExecutionInput {
	id: string;
	fecha_programada: string;
}

export type PlanResult = ServiceResult<{ id: string }>;
export type TaskResult = ServiceResult<{ id: string; orden: number }>;
export type ScheduleResult = ServiceResult<{ scheduled: number }>;
export type CompleteResult = ServiceResult<{ id: string }>;
export type CancelResult = ServiceResult<{ id: string }>;
export type RescheduleResult = ServiceResult<{ id: string }>;

export async function createPlan(input: PlanInput, actor: Actor): Promise<PlanResult> {
	if (actor.rol === 'consultor') return CONSULTOR_ERROR;

	const { nombre, descripcion, frecuencia_dias, equipo_id, tipo_equipo_id } = input;

	if (!nombre.trim()) return { ok: false, error: 'El nombre del plan es obligatorio', status: 400 };
	if (!frecuencia_dias || frecuencia_dias < 1)
		return { ok: false, error: 'La frecuencia debe ser mayor a 0 días', status: 400 };

	if (equipo_id) {
		const equip = await db.query.equipment.findFirst({ where: eq(equipment.id, equipo_id) });
		if (!equip) return { ok: false, error: 'Equipo no encontrado', status: 400 };
	}
	if (tipo_equipo_id) {
		const tipo = await db.query.equipment_types.findFirst({
			where: eq(equipment_types.id, tipo_equipo_id)
		});
		if (!tipo) return { ok: false, error: 'Tipo de equipo no encontrado', status: 400 };
	}

	const [row] = await db
		.insert(preventive_maintenance_plans)
		.values({
			nombre: nombre.trim(),
			descripcion: descripcion.trim(),
			frecuencia_dias,
			equipo_id: equipo_id || null,
			tipo_equipo_id: tipo_equipo_id || null
		})
		.returning({ id: preventive_maintenance_plans.id });

	return { ok: true, data: { id: row.id } };
}

export async function updatePlan(
	input: PlanInput & { id: string },
	actor: Actor
): Promise<PlanResult> {
	if (actor.rol === 'consultor') return CONSULTOR_ERROR;

	const { id, nombre, descripcion, frecuencia_dias, equipo_id, tipo_equipo_id } = input;

	if (!id) return { ok: false, error: 'ID de plan no proporcionado', status: 400 };
	if (!nombre.trim()) return { ok: false, error: 'El nombre del plan es obligatorio', status: 400 };
	if (!frecuencia_dias || frecuencia_dias < 1)
		return { ok: false, error: 'La frecuencia debe ser mayor a 0 días', status: 400 };

	const existingPlan = await db.query.preventive_maintenance_plans.findFirst({
		where: eq(preventive_maintenance_plans.id, id)
	});
	if (!existingPlan) return { ok: false, error: 'Plan no encontrado', status: 404 };

	if (equipo_id) {
		const equip = await db.query.equipment.findFirst({ where: eq(equipment.id, equipo_id) });
		if (!equip) return { ok: false, error: 'Equipo no encontrado', status: 400 };
	}
	if (tipo_equipo_id) {
		const tipo = await db.query.equipment_types.findFirst({
			where: eq(equipment_types.id, tipo_equipo_id)
		});
		if (!tipo) return { ok: false, error: 'Tipo de equipo no encontrado', status: 400 };
	}

	await db
		.update(preventive_maintenance_plans)
		.set({
			nombre: nombre.trim(),
			descripcion: descripcion.trim(),
			frecuencia_dias,
			equipo_id: equipo_id || null,
			tipo_equipo_id: tipo_equipo_id || null,
			updated_at: new Date().toISOString()
		})
		.where(eq(preventive_maintenance_plans.id, id));

	return { ok: true, data: { id } };
}

export async function deletePlan(input: { id: string }, actor: Actor): Promise<PlanResult> {
	if (actor.rol === 'consultor') return CONSULTOR_ERROR;

	const { id } = input;

	if (!id) return { ok: false, error: 'ID de plan no proporcionado', status: 400 };

	const existingPlan = await db.query.preventive_maintenance_plans.findFirst({
		where: eq(preventive_maintenance_plans.id, id)
	});
	if (!existingPlan) return { ok: false, error: 'Plan no encontrado', status: 404 };

	const [execCount] = await db
		.select({ cnt: count() })
		.from(pm_executions)
		.where(eq(pm_executions.plan_id, id));

	if (execCount.cnt > 0) {
		return {
			ok: false,
			error: `El plan tiene ${execCount.cnt} ejecuciones registradas. Eliminalas primero o reagendalas.`,
			status: 400
		};
	}

	await db.delete(preventive_maintenance_plans).where(eq(preventive_maintenance_plans.id, id));
	return { ok: true, data: { id } };
}

export async function addTask(
	input: TaskInput & { plan_id: string },
	actor: Actor
): Promise<TaskResult> {
	if (actor.rol === 'consultor') return CONSULTOR_ERROR;

	const { plan_id, nombre, descripcion } = input;

	if (!plan_id) return { ok: false, error: 'ID de plan no proporcionado', status: 400 };

	const planExists = await db.query.preventive_maintenance_plans.findFirst({
		where: eq(preventive_maintenance_plans.id, plan_id)
	});
	if (!planExists) return { ok: false, error: 'Plan no encontrado', status: 404 };

	if (!nombre.trim())
		return { ok: false, error: 'El nombre de la tarea es obligatorio', status: 400 };

	const [maxOrden] = await db
		.select({ max: sql<number>`COALESCE(MAX(${pm_tasks.orden}), 0)` })
		.from(pm_tasks)
		.where(eq(pm_tasks.plan_id, plan_id));

	const [row] = await db
		.insert(pm_tasks)
		.values({
			plan_id,
			nombre: nombre.trim(),
			descripcion: descripcion.trim(),
			orden: (maxOrden?.max ?? 0) + 1
		})
		.returning({ id: pm_tasks.id, orden: pm_tasks.orden });

	return { ok: true, data: { id: row.id, orden: row.orden } };
}

export async function updateTask(
	input: TaskInput & { id: string },
	actor: Actor
): Promise<TaskResult> {
	if (actor.rol === 'consultor') return CONSULTOR_ERROR;

	const { id, nombre, descripcion } = input;

	if (!id) return { ok: false, error: 'ID de tarea no proporcionado', status: 400 };

	const existingTask = await db.query.pm_tasks.findFirst({ where: eq(pm_tasks.id, id) });
	if (!existingTask) return { ok: false, error: 'Tarea no encontrada', status: 404 };

	if (!nombre.trim())
		return { ok: false, error: 'El nombre de la tarea es obligatorio', status: 400 };

	await db
		.update(pm_tasks)
		.set({ nombre: nombre.trim(), descripcion: descripcion.trim() })
		.where(eq(pm_tasks.id, id));

	return { ok: true, data: { id, orden: existingTask.orden } };
}

export async function deleteTask(input: { id: string }, actor: Actor): Promise<TaskResult> {
	if (actor.rol === 'consultor') return CONSULTOR_ERROR;

	const { id } = input;

	if (!id) return { ok: false, error: 'ID de tarea no proporcionado', status: 400 };

	const existingTask = await db.query.pm_tasks.findFirst({ where: eq(pm_tasks.id, id) });
	if (!existingTask) return { ok: false, error: 'Tarea no encontrada', status: 404 };

	const [execCount] = await db
		.select({ cnt: count() })
		.from(pm_executions)
		.where(eq(pm_executions.tarea_id, id));

	if (execCount.cnt > 0) {
		return {
			ok: false,
			error: `La tarea tiene ${execCount.cnt} ejecuciones registradas. Eliminalas primero.`,
			status: 400
		};
	}

	await db.delete(pm_tasks).where(eq(pm_tasks.id, id));
	return { ok: true, data: { id, orden: existingTask.orden } };
}

export async function scheduleExecution(
	input: ScheduleExecutionInput,
	actor: Actor
): Promise<ScheduleResult> {
	if (actor.rol === 'consultor') return CONSULTOR_ERROR;

	const { plan_id, ejecutado_por, fecha_programada } = input;

	if (!plan_id) return { ok: false, error: 'ID de plan no proporcionado', status: 400 };
	if (!ejecutado_por) return { ok: false, error: 'Selecciona un técnico', status: 400 };
	if (!fecha_programada)
		return { ok: false, error: 'Selecciona una fecha programada', status: 400 };

	const planExists = await db.query.preventive_maintenance_plans.findFirst({
		where: eq(preventive_maintenance_plans.id, plan_id)
	});
	if (!planExists) return { ok: false, error: 'Plan no encontrado', status: 404 };

	const tech = await db.query.users.findFirst({ where: eq(users.id, ejecutado_por) });
	if (!tech) return { ok: false, error: 'Técnico no encontrado', status: 400 };
	if (tech.rol !== 'tecnico' && tech.rol !== 'admin') {
		return {
			ok: false,
			error: 'El usuario seleccionado no es técnico ni administrador',
			status: 400
		};
	}

	if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_programada)) {
		return { ok: false, error: 'Formato de fecha no válido (usa YYYY-MM-DD)', status: 400 };
	}
	if (fecha_programada < todayISO()) {
		return { ok: false, error: 'La fecha no puede ser anterior a hoy', status: 400 };
	}

	const tasks = await db.query.pm_tasks.findMany({ where: eq(pm_tasks.plan_id, plan_id) });

	if (tasks.length === 0) {
		return { ok: false, error: 'El plan no tiene tareas. Agrega tareas primero.', status: 400 };
	}

	const rows = await db
		.insert(pm_executions)
		.values(
			tasks.map((t) => ({
				plan_id,
				tarea_id: t.id,
				ejecutado_por,
				fecha_programada,
				resultado: 'pendiente' as const
			}))
		)
		.returning({ id: pm_executions.id });

	return { ok: true, data: { scheduled: rows.length } };
}

export async function completeExecution(
	input: CompleteExecutionInput,
	actor: Actor
): Promise<CompleteResult> {
	if (actor.rol === 'consultor') return CONSULTOR_ERROR;

	const { id, resultado, observaciones, parts } = input;

	if (!id) return { ok: false, error: 'ID de ejecución no proporcionado', status: 400 };

	const execution = await db.query.pm_executions.findFirst({ where: eq(pm_executions.id, id) });
	if (!execution) return { ok: false, error: 'Ejecución no encontrada', status: 404 };

	if (execution.resultado !== 'pendiente') {
		return { ok: false, error: 'Esta ejecución ya fue procesada', status: 400 };
	}

	if (!['completado', 'fallido', 'omitido'].includes(resultado)) {
		return { ok: false, error: 'Resultado no válido', status: 400 };
	}

	// Validate parts stock before any writes
	if (parts && parts.length > 0) {
		for (const part of parts) {
			if (part.cantidad <= 0) {
				return { ok: false, error: `Cantidad inválida para el ítem ${part.inventory_item_id}` };
			}
			const item = await db.query.inventory_items.findFirst({
				where: eq(inventory_items.id, part.inventory_item_id)
			});
			if (!item) {
				return { ok: false, error: `Ítem de inventario no encontrado: ${part.inventory_item_id}` };
			}
			if (part.accion === 'instalado' || part.accion === 'reemplazado') {
				if (item.stock_actual < part.cantidad) {
					return {
						ok: false,
						error: `Stock insuficiente para ${item.nombre}: disponible ${item.stock_actual}, solicitado ${part.cantidad}`
					};
				}
			}
		}
	}

	// Atomic: update execution + create parts + update stock
	await db.transaction(async (tx) => {
		await tx
			.update(pm_executions)
			.set({
				fecha_ejecucion: new Date().toISOString(),
				resultado: resultado as 'completado' | 'fallido' | 'omitido',
				observaciones: observaciones.trim()
			})
			.where(eq(pm_executions.id, id));

		// Register parts and adjust stock
		if (parts && parts.length > 0) {
			for (const part of parts) {
				await tx.insert(pm_execution_parts).values({
					pm_execution_id: id,
					inventory_item_id: part.inventory_item_id,
					accion: part.accion,
					cantidad: part.cantidad,
					observaciones: part.observaciones?.trim() || ''
				});

				// Update stock
				const item = await tx.query.inventory_items.findFirst({
					where: eq(inventory_items.id, part.inventory_item_id)
				});
				if (item) {
					let newStock = item.stock_actual;
					if (part.accion === 'instalado' || part.accion === 'reemplazado') {
						newStock -= part.cantidad;
					} else if (part.accion === 'removido') {
						newStock += part.cantidad;
					}
					await tx
						.update(inventory_items)
						.set({ stock_actual: newStock })
						.where(eq(inventory_items.id, part.inventory_item_id));

					// Create movement record
					await tx.insert(inventory_movements).values({
						inventory_item_id: part.inventory_item_id,
						tipo: part.accion === 'removido' ? 'entrada' : 'salida',
						cantidad: part.cantidad,
						motivo: `PM ejecución: ${part.accion}`,
						usuario_id: actor.id,
						referencia_tipo: 'pm_execution',
						referencia_id: id
					});
				}
			}
		}
	});

	if (resultado === 'completado' || resultado === 'fallido' || resultado === 'omitido') {
		await autoScheduleNextExecution(execution);
	}

	return { ok: true, data: { id } };
}

export async function cancelarEjecucion(
	input: CancelExecutionInput,
	actor: Actor
): Promise<CancelResult> {
	if (actor.rol === 'consultor') return CONSULTOR_ERROR;

	const { id } = input;
	if (!id) return { ok: false, error: 'ID de ejecución no proporcionado', status: 400 };

	const execution = await db.query.pm_executions.findFirst({ where: eq(pm_executions.id, id) });
	if (!execution) return { ok: false, error: 'Ejecución no encontrada', status: 404 };

	if (execution.resultado !== 'pendiente') {
		return { ok: false, error: 'Solo se puede cancelar una ejecución pendiente', status: 400 };
	}

	await db.update(pm_executions).set({ resultado: 'cancelada' }).where(eq(pm_executions.id, id));

	return { ok: true, data: { id } };
}

export async function reprogramarEjecucion(
	input: RescheduleExecutionInput,
	actor: Actor
): Promise<RescheduleResult> {
	if (actor.rol === 'consultor') return CONSULTOR_ERROR;

	const { id, fecha_programada } = input;
	if (!id) return { ok: false, error: 'ID de ejecución no proporcionado', status: 400 };
	if (!fecha_programada)
		return { ok: false, error: 'Selecciona una fecha programada', status: 400 };
	if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_programada)) {
		return { ok: false, error: 'Formato de fecha no válido (usa YYYY-MM-DD)', status: 400 };
	}
	if (fecha_programada < todayISO()) {
		return { ok: false, error: 'La fecha no puede ser anterior a hoy', status: 400 };
	}

	const execution = await db.query.pm_executions.findFirst({ where: eq(pm_executions.id, id) });
	if (!execution) return { ok: false, error: 'Ejecución no encontrada', status: 404 };

	if (execution.resultado !== 'pendiente') {
		return { ok: false, error: 'Solo se puede reprogramar una ejecución pendiente', status: 400 };
	}

	await db.update(pm_executions).set({ fecha_programada }).where(eq(pm_executions.id, id));

	return { ok: true, data: { id } };
}

/**
 * After completing an execution, auto-create the next pendiente execution for
 * the same plan+tarea with fecha_programada = old date + plan frequency.
 * Skips if an execution for the same plan+tarea+date already exists.
 */
async function autoScheduleNextExecution(execution: {
	plan_id: string;
	tarea_id: string;
	ejecutado_por: string;
	fecha_programada: string;
}): Promise<void> {
	const plan = await db.query.preventive_maintenance_plans.findFirst({
		where: eq(preventive_maintenance_plans.id, execution.plan_id)
	});
	if (!plan) return;

	const nextDate = addDaysToDate(execution.fecha_programada, plan.frecuencia_dias);

	const [existing] = await db
		.select({ cnt: count() })
		.from(pm_executions)
		.where(
			and(
				eq(pm_executions.plan_id, execution.plan_id),
				eq(pm_executions.tarea_id, execution.tarea_id),
				eq(pm_executions.fecha_programada, nextDate)
			)
		);

	if (existing.cnt > 0) return;

	await db.insert(pm_executions).values({
		plan_id: execution.plan_id,
		tarea_id: execution.tarea_id,
		ejecutado_por: execution.ejecutado_por,
		fecha_programada: nextDate,
		resultado: 'pendiente'
	});
}
