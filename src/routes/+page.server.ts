import { db } from '$lib/server/db';
import {
	equipment,
	tickets,
	pm_executions,
	preventive_maintenance_plans
} from '$lib/server/db/schema';
import type { Equipment, PMExecution, PMPlan, PMTask, Ticket, User } from '$lib/server/db/schema';
import { eq, ne, and, asc, desc, gte, lt, count } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

type UpcomingMaintenance = PMExecution & { plan: PMPlan; tarea: PMTask; ejecutante: User };
type RecentTicket = Ticket & { equipo: Equipment | null; reporta: User };
type ActivityPeriod = { daily: number[]; weekly: number[]; monthly: number[] };
type ActivityTrend = number | null;

const EMPTY_ACTIVITY: ActivityPeriod = { daily: [], weekly: [], monthly: [] };

// Bucket dates by weekday (Mon=0..Sun=6) within the last 7 days.
function bucketDaily(dates: Date[]): number[] {
	const buckets = Array(7).fill(0) as number[];
	const today = new Date();
	const start = new Date(today);
	start.setDate(today.getDate() - 6);
	start.setHours(0, 0, 0, 0);
	for (const d of dates) {
		if (d < start || d > today) continue;
		const weekdayIndex = (d.getDay() + 6) % 7;
		buckets[weekdayIndex] += 1;
	}
	return buckets;
}

// Bucket dates by week-of-month (weeks 1..4) for the current month.
function bucketWeekly(dates: Date[]): number[] {
	const buckets = Array(4).fill(0) as number[];
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth();
	for (const d of dates) {
		if (d.getFullYear() !== year || d.getMonth() !== month) continue;
		const weekIndex = Math.min(3, Math.floor((d.getDate() - 1) / 7));
		buckets[weekIndex] += 1;
	}
	return buckets;
}

// Bucket dates by calendar month (Jan=0..Dec=11) within the last 12 months.
function bucketMonthly(dates: Date[]): number[] {
	const buckets = Array(12).fill(0) as number[];
	const now = new Date();
	const cutoff = new Date(now.getFullYear(), now.getMonth() - 11, 1);
	for (const d of dates) {
		if (d < cutoff) continue;
		buckets[d.getMonth()] += 1;
	}
	return buckets;
}

function buildActivity(dates: Date[]): ActivityPeriod {
	return {
		daily: bucketDaily(dates),
		weekly: bucketWeekly(dates),
		monthly: bucketMonthly(dates)
	};
}

// Month-over-month percentage change; null when the previous month has no data.
function monthOverMonthDelta(dates: Date[]): ActivityTrend {
	const now = new Date();
	const current = dates.filter(
		(d) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
	).length;
	const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const previous = dates.filter(
		(d) => d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth()
	).length;
	if (previous === 0) return null;
	return Math.round(((current - previous) / previous) * 100);
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return {
			equipmentCount: 0,
			ticketCount: 0,
			upcomingMaintenance: [] as UpcomingMaintenance[],
			overdueMaintenance: 0,
			totalPlans: 0,
			pendingCount: 0,
			recentTickets: [] as RecentTicket[],
			ticketsByPeriod: EMPTY_ACTIVITY,
			maintenanceByPeriod: EMPTY_ACTIVITY,
			ticketDelta: null,
			maintenanceDelta: null
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
			ejecutante: {
				columns: { id: true, nombre: true, apellido: true, email: true, rol: true }
			}
		},
		orderBy: [asc(pm_executions.fecha_programada)],
		limit: 5
	});

	// Overdue pending executions count (strict: scheduled for today is not overdue)
	const [overdueResult] = await db
		.select({ cnt: count() })
		.from(pm_executions)
		.where(
			and(eq(pm_executions.resultado, 'pendiente'), lt(pm_executions.fecha_programada, today))
		);

	// Last 5 open tickets
	const recentTickets = await db.query.tickets.findMany({
		where: ne(tickets.estado, 'cerrado'),
		with: {
			equipo: true,
			reporta: {
				columns: { id: true, nombre: true, apellido: true, email: true, rol: true }
			}
		},
		orderBy: [desc(tickets.created_at)],
		limit: 5
	});

	// Activity series: bucket ticket and PM execution creation dates in JS.
	const [ticketRows, maintenanceRows] = await Promise.all([
		db.select({ createdAt: tickets.created_at }).from(tickets),
		db.select({ createdAt: pm_executions.created_at }).from(pm_executions)
	]);
	const ticketCreatedAts = ticketRows.map((row) => new Date(row.createdAt));
	const maintenanceCreatedAts = maintenanceRows.map((row) => new Date(row.createdAt));

	const ticketsByPeriod = buildActivity(ticketCreatedAts);
	const maintenanceByPeriod = buildActivity(maintenanceCreatedAts);
	const ticketDelta = monthOverMonthDelta(ticketCreatedAts);
	const maintenanceDelta = monthOverMonthDelta(maintenanceCreatedAts);

	return {
		equipmentCount: equipmentCountResult?.cnt ?? 0,
		ticketCount: ticketCountResult?.cnt ?? 0,
		upcomingMaintenance: upcoming,
		overdueMaintenance: overdueResult?.cnt ?? 0,
		totalPlans: totalPlansResult?.cnt ?? 0,
		pendingCount: pendingCountResult?.cnt ?? 0,
		recentTickets,
		ticketsByPeriod,
		maintenanceByPeriod,
		ticketDelta,
		maintenanceDelta
	};
};
