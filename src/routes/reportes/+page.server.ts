import { db } from '$lib/server/db';
import {
	equipment,
	equipment_types,
	tickets,
	users,
	preventive_maintenance_plans,
	pm_executions
} from '$lib/server/db/schema';
import { sql, count, eq, and, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return {
			equipmentByStatus: [],
			equipmentByType: [],
			ticketsByStatus: [],
			ticketsByPriority: [],
			ticketsByMonth: [],
			maintenanceStats: { totalPlans: 0, overdue: 0, upcomingThisWeek: 0 },
			topEquipment: [],
			usersByRole: []
		};
	}

	// ponytail: parallelize all read-only queries via Promise.all
	const [
		equipmentByStatus,
		equipmentByType,
		ticketsByStatus,
		ticketsByPriority,
		ticketsByMonth,
		[totalPlans],
		[overdue],
		[upcoming],
		topEquipment,
		usersByRole
	] = await Promise.all([
		db
			.select({ estado: equipment.estado, count: count() })
			.from(equipment)
			.groupBy(equipment.estado),
		db
			.select({ tipo_id: equipment.tipo_id, tipo_nombre: equipment_types.nombre, count: count() })
			.from(equipment)
			.leftJoin(equipment_types, eq(equipment.tipo_id, equipment_types.id))
			.groupBy(equipment.tipo_id),
		db.select({ estado: tickets.estado, count: count() }).from(tickets).groupBy(tickets.estado),
		db
			.select({ prioridad: tickets.prioridad, count: count() })
			.from(tickets)
			.groupBy(tickets.prioridad),
		db
			.select({
				month: sql<string>`strftime('%Y-%m', ${tickets.created_at})`,
				count: count()
			})
			.from(tickets)
			.where(sql`${tickets.created_at} >= date('now', '-6 months')`)
			.groupBy(sql`strftime('%Y-%m', ${tickets.created_at})`)
			.orderBy(sql`strftime('%Y-%m', ${tickets.created_at})`),
		db.select({ count: count() }).from(preventive_maintenance_plans),
		db
			.select({ count: count() })
			.from(pm_executions)
			.where(
				and(
					eq(pm_executions.resultado, 'pendiente'),
					sql`${pm_executions.fecha_programada} < date('now')`
				)
			),
		db
			.select({ count: count() })
			.from(pm_executions)
			.where(
				and(
					eq(pm_executions.resultado, 'pendiente'),
					sql`${pm_executions.fecha_programada} >= date('now')`,
					sql`${pm_executions.fecha_programada} <= date('now', '+7 days')`
				)
			),
		// ponytail: sort + limit in JS to avoid Drizzle alias bug in ORDER BY
		(async () => {
			try {
				const rows = await db
					.select({
						equipo_id: tickets.equipo_id,
						count: count()
					})
					.from(tickets)
					.where(sql`${tickets.equipo_id} IS NOT NULL`)
					.groupBy(tickets.equipo_id);
				const sorted = rows.sort((a, b) => b.count - a.count).slice(0, 5);
				if (sorted.length === 0) return [];
				const ids: string[] = sorted
					.map((r) => r.equipo_id)
					.filter((id): id is string => id !== null);
				if (ids.length === 0) return [];
				const equipRows = await db.query.equipment.findMany({
					where: inArray(equipment.id, ids)
				});
				const equipMap = new Map(equipRows.map((e) => [e.id, e]));
				return sorted
					.filter((r): r is typeof r & { equipo_id: string } => r.equipo_id !== null)
					.map((r) => ({
						equipo_id: r.equipo_id,
						modelo: equipMap.get(r.equipo_id)?.modelo ?? '-',
						marca: equipMap.get(r.equipo_id)?.marca ?? '-',
						count: r.count
					}));
			} catch (e) {
				console.error('topEquipment query failed:', e);
				return [];
			}
		})(),
		db.select({ rol: users.rol, count: count() }).from(users).groupBy(users.rol)
	]);

	return {
		equipmentByStatus,
		equipmentByType,
		ticketsByStatus,
		ticketsByPriority,
		ticketsByMonth,
		maintenanceStats: {
			totalPlans: totalPlans.count,
			overdue: overdue.count,
			upcomingThisWeek: upcoming.count
		},
		topEquipment,
		usersByRole
	};
};
