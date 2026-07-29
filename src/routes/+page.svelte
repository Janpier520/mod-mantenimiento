<script lang="ts">
	import { onMount } from 'svelte';
	import { staggerIn, countUp } from '$lib/animations';
	import EmptyState from '$lib/ui/EmptyState.svelte';
	import Package from '@lucide/svelte/icons/package';
	import Ticket from '@lucide/svelte/icons/ticket';
	import Wrench from '@lucide/svelte/icons/wrench';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Chart from 'chart.js/auto';

	let { data } = $props();
	const user = $derived(data.user);

	let quickActions: HTMLElement | undefined = $state();
	let featuredEl: HTMLElement | undefined = $state();
	let ticketsEl: HTMLElement | undefined = $state();
	let mantenimientosEl: HTMLElement | undefined = $state();
	let pendientesEl: HTMLElement | undefined = $state();
	let featuredVal: HTMLElement | undefined = $state();
	let mantenimientosVal: HTMLElement | undefined = $state();
	let pendientesVal: HTMLElement | undefined = $state();
	let chartCanvas: HTMLCanvasElement;
	let chartInstance: Chart | null = null;
	let timePeriod = $state<'semanal' | 'mensual' | 'anual'>('mensual');

	function initChart() {
		if (!chartCanvas) return;
		if (chartInstance) chartInstance.destroy();

		const labels =
			timePeriod === 'semanal'
				? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
				: timePeriod === 'mensual'
					? ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4']
					: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

		// ponytail: datos placeholder, reemplazar con reales del server
		const mantenimientos =
			timePeriod === 'semanal'
				? [3, 5, 2, 4, 6, 1, 3]
				: timePeriod === 'mensual'
					? [12, 18, 15, 20]
					: [45, 52, 38, 61, 55, 70, 62, 48, 58, 65, 72, 80];

		const tickets =
			timePeriod === 'semanal'
				? [2, 4, 3, 5, 2, 1, 2]
				: timePeriod === 'mensual'
					? [8, 12, 10, 14]
					: [30, 35, 28, 42, 38, 48, 45, 32, 40, 46, 50, 55];

		chartInstance = new Chart(chartCanvas, {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						label: 'Mantenimientos',
						data: mantenimientos,
						borderColor: '#10b981',
						backgroundColor: 'rgba(16, 185, 129, 0.1)',
						fill: true,
						tension: 0.4,
						pointRadius: 3,
						pointHoverRadius: 6
					},
					{
						label: 'Tickets',
						data: tickets,
						borderColor: '#3b82f6',
						backgroundColor: 'rgba(59, 130, 246, 0.1)',
						fill: true,
						tension: 0.4,
						pointRadius: 3,
						pointHoverRadius: 6
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					intersect: false,
					mode: 'index'
				},
				plugins: {
					legend: {
						position: 'top',
						align: 'end',
						labels: {
							usePointStyle: true,
							pointStyle: 'circle',
							padding: 20,
							font: { size: 12 }
						}
					},
					tooltip: {
						backgroundColor: '#1f2937',
						titleFont: { size: 13 },
						bodyFont: { size: 12 },
						padding: 12,
						cornerRadius: 8,
						displayColors: true,
						boxPadding: 4
					}
				},
				scales: {
					x: {
						grid: { display: false },
						ticks: { font: { size: 11 }, color: '#9ca3af' }
					},
					y: {
						grid: { color: '#f3f4f6' },
						ticks: { font: { size: 11 }, color: '#9ca3af' },
						beginAtZero: true
					}
				}
			}
		});
	}

	$effect(() => {
		initChart();
	});

	onMount(() => {
		staggerIn([featuredEl, ticketsEl, mantenimientosEl, pendientesEl], 0.1);
		staggerIn([quickActions], 0.35);
		[featuredVal, mantenimientosVal, pendientesVal].forEach((el) => {
			if (!el) return;
			const val = parseInt(el.textContent || '', 10);
			if (!isNaN(val)) countUp(el, val);
		});
		initChart();
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">
			¡Bienvenido{user?.nombre ? ', ' + user.nombre : ''}!
		</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Resumen del laboratorio — todo lo que necesitás saber de un vistazo
		</p>
	</div>

	<!-- Stats — 4 cards con trend indicators (bolder) -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<!-- Featured: Equipos — card hero con gradiente brand -->
		<div bind:this={featuredEl} class="stat-card-featured col-span-2 text-white">
			<div class="relative z-10 flex items-start justify-between">
				<div>
					<p class="text-sm font-medium text-white/80">Total Equipos</p>
					<p bind:this={featuredVal} class="stat-value mt-1 text-white">{data.equipmentCount}</p>
				</div>
				<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white">
					<Package class="h-6 w-6" />
				</div>
			</div>
		</div>

		<!-- Tickets — stat card con acento -->
		<div bind:this={ticketsEl} class="stat-card">
			<div class="flex items-start justify-between">
				<div>
					<p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">Tickets</p>
					<p class="stat-value mt-1">{data.ticketCount}</p>
				</div>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
				>
					<Ticket class="h-5 w-5" />
				</div>
			</div>
		</div>

		<!-- Mantenimientos — stat card con badge de vencidos -->
		<div bind:this={mantenimientosEl} class="stat-card">
			<div class="flex items-start justify-between">
				<div>
					<p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
						Mantenimientos
					</p>
					<p class="stat-value mt-1">
						{data.totalPlans}
					</p>
					<div
						class="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
					>
						<TrendingUp class="h-3.5 w-3.5" />
						<span class="font-medium">+8%</span>
						<span class="text-muted-foreground">vs mes anterior</span>
					</div>
				</div>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
				>
					<Wrench class="h-5 w-5" />
				</div>
			</div>
			{#if data.overdueMaintenance > 0}
				<div
					class="mt-3 flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:bg-red-950 dark:text-red-400"
				>
					<AlertTriangle class="h-3.5 w-3.5" />
					<span>{data.overdueMaintenance} vencido{data.overdueMaintenance !== 1 ? 's' : ''}</span>
				</div>
			{/if}
		</div>

		<!-- Pendientes — stat card con trend down -->
		<div bind:this={pendientesEl} class="stat-card">
			<div class="flex items-start justify-between">
				<div>
					<p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
						Pendientes
					</p>
					<p class="stat-value mt-1">
						{data.pendingCount}
					</p>
					<div class="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
						<TrendingDown class="h-3.5 w-3.5" />
						<span class="font-medium">-3%</span>
						<span class="text-muted-foreground">vs mes anterior</span>
					</div>
				</div>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
				>
					<AlertTriangle class="h-5 w-5" />
				</div>
			</div>
		</div>
	</div>

	<!-- Chart section -->
	<div class="rounded-xl border bg-card p-6">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-bold text-foreground">Actividad</h2>
			<div class="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
				<button
					class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors {timePeriod ===
					'semanal'
						? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
						: 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}"
					onclick={() => (timePeriod = 'semanal')}
				>
					Semanal
				</button>
				<button
					class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors {timePeriod ===
					'mensual'
						? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
						: 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}"
					onclick={() => (timePeriod = 'mensual')}
				>
					Mensual
				</button>
				<button
					class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors {timePeriod ===
					'anual'
						? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
						: 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}"
					onclick={() => (timePeriod = 'anual')}
				>
					Anual
				</button>
			</div>
		</div>
		<div class="h-72">
			<canvas bind:this={chartCanvas}></canvas>
		</div>
	</div>

	<!-- Quick actions -->
	<div bind:this={quickActions} class="rounded-xl border bg-card p-6">
		<h2 class="mb-4 text-lg font-bold text-foreground">Acciones Rápidas</h2>
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<a
				href="/equipos"
				class="group flex items-center gap-3 rounded-xl border border-border-light bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm hover:shadow-primary/10"
			>
				<div
					class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20"
				>
					<Package class="h-4 w-4" />
				</div>
				<span>Nuevo Equipo</span>
			</a>
			<a
				href="/tickets"
				class="group flex items-center gap-3 rounded-xl border border-border-light bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm hover:shadow-primary/10"
			>
				<div
					class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20"
				>
					<Ticket class="h-4 w-4" />
				</div>
				<span>Nuevo Ticket</span>
			</a>
			<a
				href="/mantenimiento"
				class="group flex items-center gap-3 rounded-xl border border-border-light bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm hover:shadow-primary/10"
			>
				<div
					class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20"
				>
					<Wrench class="h-4 w-4" />
				</div>
				<span>Programar Mantenimiento</span>
			</a>
			<a
				href="/reportes"
				class="group flex items-center gap-3 rounded-xl border border-border-light bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm hover:shadow-primary/10"
			>
				<div
					class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20"
				>
					<BarChart3 class="h-4 w-4" />
				</div>
				<span>Ver Reportes</span>
			</a>
		</div>
	</div>

	<!-- Modules -->
	<div class="grid gap-6 lg:grid-cols-2">
		<div class="rounded-xl border bg-card p-6">
			<h2 class="mb-4 text-lg font-bold text-foreground">
				Próximos Mantenimientos
				{#if data.overdueMaintenance > 0}
					<span
						class="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400"
					>
						{data.overdueMaintenance} vencido{data.overdueMaintenance !== 1 ? 's' : ''}
					</span>
				{/if}
			</h2>
			{#if data.upcomingMaintenance.length > 0}
				<div class="space-y-2">
					{#each data.upcomingMaintenance as item}
						<a
							href="/mantenimiento"
							class="flex items-center justify-between rounded-lg border border-border-light bg-white px-4 py-3 transition-colors hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-800"
						>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
									{item.plan?.nombre ?? 'Plan'}
								</p>
								<p class="truncate text-xs text-gray-500 dark:text-gray-400">
									{item.tarea?.nombre ?? ''}
									<span class="mx-1">&middot;</span>
									{item.ejecutante
										? `${item.ejecutante.nombre} ${item.ejecutante.apellido}`
										: 'Sin técnico'}
								</p>
							</div>
							<div class="ml-3 shrink-0 text-right">
								<p class="text-xs font-medium text-gray-600 dark:text-gray-400">
									{new Date(item.fecha_programada).toLocaleDateString('es-AR')}
								</p>
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<EmptyState
					title="Sin mantenimientos programados"
					description="Los planes se gestionan desde el módulo de Mantenimiento."
				/>
			{/if}
		</div>

		<div class="rounded-xl border bg-card p-6">
			<h2 class="mb-4 text-lg font-bold text-foreground">Tickets Recientes</h2>
			{#if data.recentTickets.length > 0}
				<div class="space-y-2">
					{#each data.recentTickets as ticket}
						<a
							href="/tickets"
							class="flex items-center justify-between rounded-lg border border-border-light bg-white px-4 py-3 transition-colors hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-800"
						>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
									{ticket.titulo || ticket.equipo?.nombre || 'Ticket'}
								</p>
								<p class="truncate text-xs text-gray-500 dark:text-gray-400">
									{ticket.equipo?.nombre ?? 'Sin equipo'}
									<span class="mx-1">&middot;</span>
									{ticket.reporta
										? `${ticket.reporta.nombre} ${ticket.reporta.apellido}`
										: 'Sistema'}
								</p>
							</div>
							<div class="ml-3 shrink-0 text-right">
								<span
									class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {ticket.estado === 'abierto'
										? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
										: ticket.estado === 'en_progreso'
											? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
											: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}"
								>
									{ticket.estado === 'abierto'
										? 'Abierto'
										: ticket.estado === 'en_progreso'
											? 'En progreso'
											: ticket.estado ?? ticket.estado}
								</span>
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<EmptyState
					title="No hay tickets abiertos"
					description="Los tickets se crearán desde el módulo de Tickets."
				/>
			{/if}
		</div>
	</div>
</div>
