import { db } from '$lib/server/db';
import {
	equipment,
	tickets,
	pm_executions,
	preventive_maintenance_plans
} from '$lib/server/db/schema';
import { eq, ne, and, asc, desc, gte, lte, count } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return {
			equipmentCount: 0,
			ticketCount: 0,
			upcomingMaintenance: [] as Array<Record<string, any>>,
			overdueMaintenance: 0,
			totalPlans: 0,
			pendingCount: 0,
			recentTickets: [] as Array<Record<string, any>>
		};
	}

	const today = new Date().toISOString().split('T')[0];

	const [equipmentCountResult] = await db.select({ cnt: count() }).from(equipment);

	const [ticketCountResult] = await db.select({ cnt: count() }).from(tickets);

	const [totalPlansResult] = await db.select({ cnt: count() }).from(preventive_maintenance_plans);

	const [pendingCountResult] = await db
		.select({ cnt: count() })
		.from(pm_executions)
		.where(eq(pm_executions.resultado, 'pendiente'));

	// Next 5 upcoming pending executions
	const upcoming = await db.query.pm_executions.findMany({
		where: and(
			eq(pm_executions.resultado, 'pendiente'),
			gte(pm_executions.fecha_programada, today)
		),
		with: {
			plan: true,
			tarea: true,
			ejecutante: true
		},
		orderBy: [asc(pm_executions.fecha_programada)],
		limit: 5
	});

	// Overdue pending executions count
	const [overdueResult] = await db
		.select({ cnt: count() })
		.from(pm_executions)
		.where(
			and(eq(pm_executions.resultado, 'pendiente'), lte(pm_executions.fecha_programada, today))
		);

	// Last 5 open tickets
	const recentTickets = await db.query.tickets.findMany({
		where: ne(tickets.estado, 'cerrado'),
		with: {
			equipo: true,
			reporta: true
		},
		orderBy: [desc(tickets.created_at)],
		limit: 5
	});

	return {
		equipmentCount: equipmentCountResult?.cnt ?? 0,
		ticketCount: ticketCountResult?.cnt ?? 0,
		upcomingMaintenance: upcoming,
		overdueMaintenance: overdueResult?.cnt ?? 0,
		totalPlans: totalPlansResult?.cnt ?? 0,
		pendingCount: pendingCountResult?.cnt ?? 0,
		recentTickets
	};
};
