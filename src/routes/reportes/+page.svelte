<script lang="ts">
	import {
		Chart,
		BarController,
		BarElement,
		CategoryScale,
		LinearScale,
		ArcElement,
		DoughnutController,
		Tooltip,
		Legend
	} from 'chart.js';
	import Package from '@lucide/svelte/icons/package';
	import Ticket from '@lucide/svelte/icons/ticket';
	import Wrench from '@lucide/svelte/icons/wrench';
	import Users from '@lucide/svelte/icons/users';

	Chart.register(
		BarController,
		BarElement,
		CategoryScale,
		LinearScale,
		ArcElement,
		DoughnutController,
		Tooltip,
		Legend
	);

	let { data } = $props();

	// ── Derived totals ────────────────────────────────────────────────────────
	let totalEquipment = $derived(data.equipmentByStatus.reduce((s, i) => s + i.count, 0));
	let totalTickets = $derived(data.ticketsByStatus.reduce((s, i) => s + i.count, 0));
	let openTickets = $derived(
		data.ticketsByStatus.filter((t) => t.estado === 'abierto').reduce((s, i) => s + i.count, 0)
	);
	let inProgressTickets = $derived(
		data.ticketsByStatus.filter((t) => t.estado === 'en_proceso').reduce((s, i) => s + i.count, 0)
	);

	let totalAdmins = $derived(
		data.usersByRole.filter((r) => r.rol === 'admin').reduce((s, i) => s + i.count, 0)
	);
	let totalTecnicos = $derived(
		data.usersByRole.filter((r) => r.rol === 'tecnico').reduce((s, i) => s + i.count, 0)
	);
	let totalConsultores = $derived(
		data.usersByRole.filter((r) => r.rol === 'consultor').reduce((s, i) => s + i.count, 0)
	);

	// ── Status lookup helpers ──────────────────────────────────────────────────
	const estadoLabel: Record<string, string> = {
		operativo: 'Operativo',
		en_reparacion: 'En Reparación',
		dado_de_baja: 'Dado de Baja',
		prestado: 'Prestado'
	};
	const estadoColor: Record<string, string> = {
		operativo: '#22c55e',
		en_reparacion: '#eab308',
		dado_de_baja: '#ef4444',
		prestado: '#3b82f6'
	};
	const prioridadLabel: Record<string, string> = {
		baja: 'Baja',
		media: 'Media',
		alta: 'Alta',
		critica: 'Crítica'
	};
	const prioridadColor: Record<string, string> = {
		baja: '#22c55e',
		media: '#3b82f6',
		alta: '#f97316',
		critica: '#ef4444'
	};

	const palette = [
		'#7c3aed',
		'#0ea5e9',
		'#f59e0b',
		'#10b981',
		'#f97316',
		'#ec4899',
		'#6366f1',
		'#14b8a6'
	];

	// ── Canvas refs ────────────────────────────────────────────────────────────
	let estadoCanvas: HTMLCanvasElement | undefined = $state();
	let monthCanvas: HTMLCanvasElement | undefined = $state();
	let priorityCanvas: HTMLCanvasElement | undefined = $state();
	let tipoCanvas: HTMLCanvasElement | undefined = $state();

	// ── Chart: Equipos por Estado ──────────────────────────────────────────────
	$effect(() => {
		if (!estadoCanvas || !data.equipmentByStatus.length) return;
		const sorted = [...data.equipmentByStatus].sort((a, b) => (a.estado < b.estado ? -1 : 1));
		const chart = new Chart(estadoCanvas, {
			type: 'doughnut',
			data: {
				labels: sorted.map((s) => estadoLabel[s.estado] ?? s.estado),
				datasets: [
					{
						data: sorted.map((s) => s.count),
						backgroundColor: sorted.map((s) => estadoColor[s.estado] ?? '#9ca3af'),
						borderWidth: 0
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } },
					tooltip: { backgroundColor: '#1e1b2e', titleColor: '#fff', bodyColor: '#c4bcd8' }
				}
			}
		});
		return () => chart.destroy();
	});

	// ── Chart: Tickets por Mes ─────────────────────────────────────────────────
	$effect(() => {
		if (!monthCanvas || !data.ticketsByMonth.length) return;
		const chart = new Chart(monthCanvas, {
			type: 'bar',
			data: {
				labels: data.ticketsByMonth.map((m) => m.month),
				datasets: [
					{
						label: 'Tickets',
						data: data.ticketsByMonth.map((m) => m.count),
						backgroundColor: '#7c3aed',
						borderRadius: 4
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: { backgroundColor: '#1e1b2e', titleColor: '#fff', bodyColor: '#c4bcd8' }
				},
				scales: {
					y: {
						beginAtZero: true,
						ticks: { stepSize: 1, color: '#9ca3af' },
						grid: { color: 'rgba(156,163,175,0.15)' }
					},
					x: {
						ticks: { color: '#9ca3af' },
						grid: { display: false }
					}
				}
			}
		});
		return () => chart.destroy();
	});

	// ── Chart: Tickets por Prioridad ───────────────────────────────────────────
	$effect(() => {
		if (!priorityCanvas || !data.ticketsByPriority.length) return;
		const order = ['critica', 'alta', 'media', 'baja'];
		const sorted = [...data.ticketsByPriority].sort(
			(a, b) => order.indexOf(a.prioridad) - order.indexOf(b.prioridad)
		);
		const chart = new Chart(priorityCanvas, {
			type: 'doughnut',
			data: {
				labels: sorted.map((p) => prioridadLabel[p.prioridad] ?? p.prioridad),
				datasets: [
					{
						data: sorted.map((p) => p.count),
						backgroundColor: sorted.map((p) => prioridadColor[p.prioridad] ?? '#9ca3af'),
						borderWidth: 0
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } },
					tooltip: { backgroundColor: '#1e1b2e', titleColor: '#fff', bodyColor: '#c4bcd8' }
				}
			}
		});
		return () => chart.destroy();
	});

	// ── Chart: Equipos por Tipo ────────────────────────────────────────────────
	$effect(() => {
		if (!tipoCanvas || !data.equipmentByType.length) return;
		const chart = new Chart(tipoCanvas, {
			type: 'bar',
			data: {
				labels: data.equipmentByType.map((t) => t.tipo_nombre ?? 'Sin tipo'),
				datasets: [
					{
						label: 'Equipos',
						data: data.equipmentByType.map((t) => t.count),
						backgroundColor: data.equipmentByType.map((_, i) => palette[i % palette.length]),
						borderRadius: 4
					}
				]
			},
			options: {
				indexAxis: 'y',
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: { backgroundColor: '#1e1b2e', titleColor: '#fff', bodyColor: '#c4bcd8' }
				},
				scales: {
					x: {
						beginAtZero: true,
						ticks: { stepSize: 1, color: '#9ca3af' },
						grid: { color: 'rgba(156,163,175,0.15)' }
					},
					y: {
						ticks: { color: '#9ca3af' },
						grid: { display: false }
					}
				}
			}
		});
		return () => chart.destroy();
	});
</script>

<svelte:head>
	<title>Reportes — Módulo Mantenimiento de Equipos</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Reportes</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Vista general del laboratorio con métricas y estadísticas
		</p>
	</div>

	<!-- Stat cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<!-- Equipos -->
		<div class="rounded-xl border bg-card p-5">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">Equipos</p>
					<p class="mt-1 text-3xl font-bold text-foreground">
						{totalEquipment}
					</p>
				</div>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
				>
					<Package class="h-5 w-5" />
				</div>
			</div>
			<div class="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
				{#each data.equipmentByStatus as s}
					<span class="flex items-center gap-1">
						<span
							class="inline-block h-2 w-2 rounded-full"
							style="background:{estadoColor[s.estado] ?? '#9ca3af'}"
						></span>
						{estadoLabel[s.estado] ?? s.estado}: {s.count}
					</span>
				{/each}
			</div>
		</div>

		<!-- Tickets -->
		<div class="rounded-xl border bg-card p-5">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">Tickets</p>
					<p class="mt-1 text-3xl font-bold text-foreground">
						{totalTickets}
					</p>
				</div>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
				>
					<Ticket class="h-5 w-5" />
				</div>
			</div>
			<div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
				<span>Abiertos: {openTickets}</span>
				<span>En curso: {inProgressTickets}</span>
				<span
					>Resueltos: {data.ticketsByStatus
						.filter((t) => t.estado === 'resuelto')
						.reduce((s, i) => s + i.count, 0)}</span
				>
			</div>
		</div>

		<!-- Mantenimiento -->
		<div class="rounded-xl border bg-card p-5">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
						Mantenimiento
					</p>
					<p class="mt-1 text-3xl font-bold text-foreground">
						{data.maintenanceStats.totalPlans}
					</p>
				</div>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
				>
					<Wrench class="h-5 w-5" />
				</div>
			</div>
			<div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
				<span class="text-red-500">Vencidos: {data.maintenanceStats.overdue}</span>
				<span class="text-amber-500">Próximos: {data.maintenanceStats.upcomingThisWeek}</span>
			</div>
		</div>

		<!-- Usuarios -->
		<div class="rounded-xl border bg-card p-5">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">Usuarios</p>
					<p class="mt-1 text-3xl font-bold text-foreground">
						{data.usersByRole.reduce((s, i) => s + i.count, 0)}
					</p>
				</div>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
				>
					<Users class="h-5 w-5" />
				</div>
			</div>
			<div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
				<span>Admin: {totalAdmins}</span>
				<span>Técnicos: {totalTecnicos}</span>
				{#if totalConsultores > 0}
					<span>Consultores: {totalConsultores}</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Charts grid -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Equipos por Estado -->
		<div class="rounded-xl border bg-card p-5">
			<h3 class="mb-3 text-sm font-semibold text-foreground">Equipos por Estado</h3>
			<div class="relative h-64">
				<canvas bind:this={estadoCanvas}></canvas>
			</div>
		</div>

		<!-- Tickets por Mes -->
		<div class="rounded-xl border bg-card p-5">
			<h3 class="mb-3 text-sm font-semibold text-foreground">Tickets por Mes</h3>
			<div class="relative h-64">
				<canvas bind:this={monthCanvas}></canvas>
			</div>
		</div>

		<!-- Tickets por Prioridad -->
		<div class="rounded-xl border bg-card p-5">
			<h3 class="mb-3 text-sm font-semibold text-foreground">Tickets por Prioridad</h3>
			<div class="relative h-64">
				<canvas bind:this={priorityCanvas}></canvas>
			</div>
		</div>

		<!-- Equipos por Tipo -->
		<div class="rounded-xl border bg-card p-5">
			<h3 class="mb-3 text-sm font-semibold text-foreground">Equipos por Tipo</h3>
			<div class="relative h-64">
				<canvas bind:this={tipoCanvas}></canvas>
			</div>
		</div>
	</div>

	<!-- Top 5 equipos con más reportes -->
	{#if data.topEquipment.length > 0}
		<div class="rounded-xl border bg-card p-5">
			<h3 class="mb-3 text-sm font-semibold text-foreground">Top 5 — Equipos con más Tickets</h3>
			<div class="table-card-mobile overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border text-left text-xs font-medium text-muted-foreground">
							<th class="pr-4 pb-2">#</th>
							<th class="pr-4 pb-2">Equipo</th>
							<th class="pr-4 pb-2">Modelo</th>
							<th class="pb-2 text-right">Tickets</th>
						</tr>
					</thead>
					<tbody>
						{#each data.topEquipment as item, i}
							<tr class="border-b border-border last:border-0">
								<td data-label="#" class="py-2 pr-4 text-muted-foreground">{i + 1}</td>
								<td data-label="Equipo" class="py-2 pr-4 font-medium text-foreground">
									{item.marca ?? '—'}
								</td>
								<td data-label="Modelo" class="py-2 pr-4 text-muted-foreground">
									{item.modelo ?? '—'}
								</td>
								<td data-label="Tickets" class="py-2 text-right">
									<span
										class="inline-flex items-center justify-center rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary"
									>
										{item.count}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
