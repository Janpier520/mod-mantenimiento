<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import Badge from '$lib/ui/Badge.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import ConfirmDialog from '$lib/ui/ConfirmDialog.svelte';
	import ActionIconButton from '$lib/ui/ActionIconButton.svelte';
	import { addToast } from '$lib/stores/toast.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Calendar from '@lucide/svelte/icons/calendar';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	let plans = $state(data.plans);
	// svelte-ignore state_referenced_locally
	let equipmentList = $state(data.equipment);
	// svelte-ignore state_referenced_locally
	let equipmentTypesList = $state(data.equipmentTypes);
	// svelte-ignore state_referenced_locally
	let technicians = $state(data.technicians);
	// svelte-ignore state_referenced_locally
	let overdueCount = $state(data.overdueCount);

	let isConsultor = $derived($page.data.user?.rol === 'consultor');

	type PlanRow = (typeof data.plans)[number];
	type TaskRow = PlanRow['tareas'][number];
	type ExecRow = PlanRow['ejecuciones'][number];

	let expandedPlanId = $state<string | null>(null);

	// Plan modal
	let showPlanModal = $state(false);
	let editingPlan = $state<PlanRow | null>(null);
	let formPlanNombre = $state('');
	let formPlanDescripcion = $state('');
	let formPlanFrecuencia = $state(30);
	let formPlanEquipoId = $state('');
	let formPlanTipoEquipoId = $state('');
	let formPlanError = $state('');
	let isEditingPlan = $derived(editingPlan !== null);
	let planModalTitle = $derived(isEditingPlan ? 'Editar Plan' : 'Nuevo Plan');

	// Task modal
	let showTaskModal = $state(false);
	let editingTask = $state<TaskRow | null>(null);
	let taskPlanId = $state('');
	let formTaskNombre = $state('');
	let formTaskDescripcion = $state('');
	let formTaskError = $state('');
	let isEditingTask = $derived(editingTask !== null);
	let taskModalTitle = $derived(isEditingTask ? 'Editar Tarea' : 'Agregar Tarea');

	// Schedule modal
	let showScheduleModal = $state(false);
	let schedulePlanId = $state('');
	let schedulePlanName = $state('');
	let formScheduleTecnico = $state('');
	let formScheduleFecha = $state('');
	let scheduleTasks = $state<TaskRow[]>([]);
	let scheduleExecutions = $state<ExecRow[]>([]);
	let formScheduleError = $state('');

	// Delete confirmations
	let showDeletePlan = $state(false);
	let deletingPlan = $state<PlanRow | null>(null);
	let showDeleteTask = $state(false);
	let deletingTask = $state<TaskRow | null>(null);

	// Execution detail
	let showExecModal = $state(false);
	let selectedExec = $state<ExecRow | null>(null);
	let formExecResultado = $state('completado');
	let formExecObservaciones = $state('');
	let formExecError = $state('');

	// Cancel execution confirmation
	let showCancelExec = $state(false);
	let cancelingExec = $state<ExecRow | null>(null);

	// Inline date reschedule
	let editingExecDateId = $state<string | null>(null);
	let editingExecDateValue = $state('');
	let editingExecDateError = $state('');

	const todayStr = new Date().toISOString().slice(0, 10);

	const resultBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> =
		{
			pendiente: 'warning',
			completado: 'success',
			fallido: 'danger',
			omitido: 'default',
			cancelada: 'default'
		};

	const resultLabels: Record<string, string> = {
		pendiente: 'Pendiente',
		completado: 'Completado',
		fallido: 'Fallido',
		omitido: 'Omitido',
		cancelada: 'Cancelada'
	};

	function toggleExpand(planId: string) {
		expandedPlanId = expandedPlanId === planId ? null : planId;
	}

	function formatDate(iso: string | null | undefined): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function getPlanEquipoLabel(plan: PlanRow): string {
		if (plan.equipo) return `${plan.equipo.marca} ${plan.equipo.modelo}`;
		if (plan.tipo_equipo) return `Todos: ${plan.tipo_equipo.nombre}`;
		return 'Todos los equipos';
	}

	function openCreatePlan() {
		editingPlan = null;
		formPlanNombre = '';
		formPlanDescripcion = '';
		formPlanFrecuencia = 30;
		formPlanEquipoId = '';
		formPlanTipoEquipoId = '';
		formPlanError = '';
		showPlanModal = true;
	}

	function openEditPlan(plan: PlanRow) {
		editingPlan = plan;
		formPlanNombre = plan.nombre ?? '';
		formPlanDescripcion = plan.descripcion ?? '';
		formPlanFrecuencia = plan.frecuencia_dias ?? 30;
		formPlanEquipoId = plan.equipo_id ?? '';
		formPlanTipoEquipoId = plan.tipo_equipo_id ?? '';
		formPlanError = '';
		showPlanModal = true;
	}

	function closePlanModal() {
		showPlanModal = false;
		formPlanError = '';
	}

	function openDeletePlan(plan: PlanRow) {
		deletingPlan = plan;
		showDeletePlan = true;
	}

	function openAddTask(planId: string) {
		editingTask = null;
		taskPlanId = planId;
		formTaskNombre = '';
		formTaskDescripcion = '';
		formTaskError = '';
		showTaskModal = true;
	}

	function openEditTask(task: TaskRow) {
		editingTask = task;
		taskPlanId = task.plan_id;
		formTaskNombre = task.nombre ?? '';
		formTaskDescripcion = task.descripcion ?? '';
		formTaskError = '';
		showTaskModal = true;
	}

	function closeTaskModal() {
		showTaskModal = false;
		formTaskError = '';
	}

	function openDeleteTask(task: TaskRow) {
		deletingTask = task;
		showDeleteTask = true;
	}

	function openSchedule(plan: PlanRow) {
		schedulePlanId = plan.id;
		schedulePlanName = plan.nombre;
		scheduleTasks = plan.tareas ?? [];
		scheduleExecutions = plan.ejecuciones ?? [];
		formScheduleTecnico = '';
		formScheduleFecha = new Date().toISOString().split('T')[0];
		formScheduleError = '';
		showScheduleModal = true;
	}

	function closeScheduleModal() {
		showScheduleModal = false;
		formScheduleError = '';
	}

	function openCompleteExec(exec: ExecRow) {
		selectedExec = exec;
		formExecResultado = 'completado';
		formExecObservaciones = '';
		formExecError = '';
		showExecModal = true;
	}

	function closeExecModal() {
		showExecModal = false;
		selectedExec = null;
		formExecError = '';
	}

	function openCancelExec(exec: ExecRow) {
		cancelingExec = exec;
		showCancelExec = true;
	}

	function closeCancelExec() {
		showCancelExec = false;
		cancelingExec = null;
	}

	async function confirmCancelExec() {
		if (!cancelingExec) return;
		const formData = new URLSearchParams({ id: cancelingExec.id });

		const res = await fetch($page.url.pathname + '?/cancel_execution', {
			method: 'POST',
			body: formData
		});

		showCancelExec = false;

		if (res.ok) {
			addToast('Ejecución cancelada correctamente');
			await invalidate($page.url.pathname);
		} else {
			const body = await res.json().catch(() => ({}));
			const d = ((body as Record<string, unknown>).data ?? {}) as Record<string, unknown>;
			const msg = typeof d.error === 'string' ? d.error : 'Error al cancelar la ejecución';
			addToast(msg, 'error');
		}
		cancelingExec = null;
	}

	function openEditDate(exec: ExecRow) {
		editingExecDateId = exec.id;
		editingExecDateValue = exec.fecha_programada;
		editingExecDateError = '';
	}

	function cancelEditDate() {
		editingExecDateId = null;
		editingExecDateValue = '';
		editingExecDateError = '';
	}

	async function saveExecDate(exec: ExecRow) {
		if (!editingExecDateValue) {
			editingExecDateError = 'Selecciona una fecha';
			return;
		}
		const formData = new URLSearchParams({
			id: exec.id,
			fecha_programada: editingExecDateValue
		});

		const res = await fetch($page.url.pathname + '?/reprogram_execution', {
			method: 'POST',
			body: formData
		});

		if (res.ok) {
			editingExecDateId = null;
			editingExecDateValue = '';
			editingExecDateError = '';
			addToast('Fecha reprogramada correctamente');
			await invalidate($page.url.pathname);
		} else {
			const body = await res.json().catch(() => ({}));
			const d = ((body as Record<string, unknown>).data ?? {}) as Record<string, unknown>;
			const msg = typeof d.error === 'string' ? d.error : 'Error al reprogramar';
			editingExecDateError = msg;
		}
	}

	function isOverdue(exec: ExecRow): boolean {
		return exec.resultado === 'pendiente' && exec.fecha_programada < todayStr;
	}

	function getLastExecution(plan: PlanRow): ExecRow | null {
		if (!plan.ejecuciones || plan.ejecuciones.length === 0) return null;
		return plan.ejecuciones[0];
	}

	function getNextPendingExec(plan: PlanRow, taskId: string): ExecRow | null {
		if (!plan.ejecuciones || plan.ejecuciones.length === 0) return null;
		const pendientes = plan.ejecuciones.filter(
			(e) => e.tarea_id === taskId && e.resultado === 'pendiente'
		);
		if (pendientes.length === 0) return null;
		return pendientes.reduce((min, e) => (e.fecha_programada < min.fecha_programada ? e : min));
	}

	function getPendingExecForTask(taskId: string): ExecRow | null {
		const pendientes = scheduleExecutions.filter(
			(e) => e.tarea_id === taskId && e.resultado === 'pendiente'
		);
		if (pendientes.length === 0) return null;
		return pendientes.reduce((min, e) => (e.fecha_programada < min.fecha_programada ? e : min));
	}

	$effect(() => {
		plans = data.plans;
		equipmentList = data.equipment;
		equipmentTypesList = data.equipmentTypes;
		technicians = data.technicians;
		overdueCount = data.overdueCount;
	});

	$effect(() => {
		if ($page.url.searchParams.get('nuevo') === 'true') {
			openCreatePlan();
		}
	});
</script>

<svelte:head>
	<title>Mantenimiento Preventivo — Módulo Mantenimiento de Equipos</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-foreground">Mantenimiento Preventivo</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Gestiona planes, tareas y ejecuciones de mantenimiento
			</p>
		</div>
		{#if !isConsultor}
			<button
				onclick={openCreatePlan}
				class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
			>
				<Plus class="h-4 w-4" />
				Nuevo Plan
			</button>
		{/if}
	</div>

	<!-- Overdue banner -->
	{#if overdueCount > 0}
		<div
			class="flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
		>
			<AlertTriangle class="h-5 w-5 shrink-0" />
			<span class="font-medium">
				{overdueCount} ejecuciones vencidas por programar
			</span>
		</div>
	{/if}

	<!-- Plans list -->
	{#if plans.length === 0}
		<div class="rounded-xl border bg-card p-10 text-center">
			<p class="text-lg text-muted-foreground">No hay planes de mantenimiento</p>
			<p class="mt-1 text-sm text-muted-foreground/70">Crea tu primer plan para empezar</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each plans as plan (plan.id)}
				<div class="overflow-hidden rounded-xl border bg-card">
					<!-- Plan header (always visible) -->
					<div
						onclick={() => toggleExpand(plan.id)}
						onkeydown={(e) => e.key === 'Enter' && toggleExpand(plan.id)}
						role="button"
						tabindex="0"
						class="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
					>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-3">
								<h3 class="text-base font-bold text-foreground">{plan.nombre}</h3>
								<Badge text={`Cada ${plan.frecuencia_dias} días`} variant="info" />
								<Badge text={`${(plan.tareas ?? []).length} tareas`} variant="default" />
							</div>
							<p class="mt-1 truncate text-sm text-muted-foreground">
								{getPlanEquipoLabel(plan)}
								{#if plan.descripcion}
									<span class="mx-1.5">&middot;</span>
									{plan.descripcion}
								{/if}
							</p>
						</div>
						<div class="ml-4 flex shrink-0 items-center gap-2">
							{#if !isConsultor}
								<ActionIconButton
									icon={Pencil}
									variant="edit"
									onclick={(e: MouseEvent) => {
										e.stopPropagation();
										openEditPlan(plan);
									}}
									label="Editar plan"
								/>
								<ActionIconButton
									icon={Trash2}
									variant="delete"
									onclick={(e: MouseEvent) => {
										e.stopPropagation();
										openDeletePlan(plan);
									}}
									label="Eliminar plan"
								/>
							{/if}
							<svg
								class="h-5 w-5 text-muted-foreground transition-transform {expandedPlanId ===
								plan.id
									? 'rotate-180'
									: ''}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</div>
					</div>

					<!-- Expanded content -->
					{#if expandedPlanId === plan.id}
						<div class="animate-in fade-in space-y-4 border-t border-border px-6 py-4 duration-150">
							<!-- Tasks table -->
							{#if (plan.tareas ?? []).length === 0}
								<p class="text-sm text-muted-foreground">No hay tareas en este plan.</p>
							{:else}
								<div class="table-card-mobile overflow-hidden rounded-xl border border-border">
									<table class="w-full text-sm">
										<thead>
											<tr class="bg-muted">
												<th class="w-12 px-4 py-2.5 text-left font-medium text-muted-foreground"
													>#</th
												>
												<th class="px-4 py-2.5 text-left font-medium text-muted-foreground"
													>Tarea</th
												>
												<th
													class="hidden px-4 py-2.5 text-left font-medium text-muted-foreground sm:table-cell"
													>Descripción</th
												>
												<th
													class="hidden px-4 py-2.5 text-left font-medium text-muted-foreground md:table-cell"
													>Próxima ejecución</th
												>
												<th class="w-24 px-4 py-2.5 text-right font-medium text-muted-foreground"
													>Acción</th
												>
											</tr>
										</thead>
										<tbody>
											{#each plan.tareas as task (task.id)}
												<tr class="border-t border-border">
													<td data-label="#" class="px-4 py-2.5 text-muted-foreground"
														>{task.orden}</td
													>
													<td data-label="Tarea" class="px-4 py-2.5 font-medium text-foreground"
														>{task.nombre}</td
													>
													<td
														data-label="Descripción"
														class="hidden px-4 py-2.5 text-muted-foreground sm:table-cell"
														>{task.descripcion || '—'}</td
													>
													<td
														data-label="Próxima ejecución"
														class="hidden px-4 py-2.5 text-muted-foreground md:table-cell"
													>
														{#if getNextPendingExec(plan, task.id)}
															{formatDate(getNextPendingExec(plan, task.id)!.fecha_programada)}
														{:else}—{/if}
													</td>
													<td data-label="Acción" class="px-4 py-2.5 text-right">
														{#if !isConsultor}
															<ActionIconButton
																icon={Pencil}
																variant="edit"
																onclick={() => openEditTask(task)}
																label="Editar tarea"
															/>
															<ActionIconButton
																icon={Trash2}
																variant="delete"
																onclick={() => openDeleteTask(task)}
																label="Eliminar tarea"
															/>
														{/if}
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{/if}

							<!-- Actions row -->
							<div class="flex flex-wrap items-center gap-3">
								{#if !isConsultor}
									<button
										onclick={() => openAddTask(plan.id)}
										class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
									>
										<Plus class="h-3.5 w-3.5" />
										Agregar Tarea
									</button>

									<button
										onclick={() => openSchedule(plan)}
										class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
									>
										<Calendar class="h-3.5 w-3.5" />
										Programar Ejecución
									</button>
								{/if}

								<div class="flex-1 text-right text-xs text-muted-foreground">
									{#if getLastExecution(plan)}
										Última ejecución: {formatDate(getLastExecution(plan)!.fecha_programada)}
									{:else}
										Sin ejecuciones previas
									{/if}
								</div>
							</div>

							<!-- Recent executions for this plan -->
							{#if plan.ejecuciones && plan.ejecuciones.length > 0}
								<div>
									<h4
										class="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
									>
										Ejecuciones recientes
									</h4>
									<div class="max-h-48 space-y-1.5 overflow-y-auto">
										{#each plan.ejecuciones.slice(0, 5) as exec (exec.id)}
											<div
												class="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
											>
												<Badge
													text={resultLabels[exec.resultado] ?? exec.resultado}
													variant={resultBadgeVariant[exec.resultado] ?? 'default'}
												/>
												<span class="text-muted-foreground"
													>{formatDate(exec.fecha_programada)}</span
												>
												{#if isOverdue(exec)}
													<Badge text="Vencida" variant="danger" />
												{/if}
												{#if exec.fecha_ejecucion}
													<span class="text-muted-foreground"
														>&rarr; {formatDate(exec.fecha_ejecucion)}</span
													>
												{/if}
												{#if exec.resultado === 'pendiente' && !isConsultor}
													{#if editingExecDateId === exec.id}
														<span class="ml-auto flex flex-wrap items-center gap-2">
															<input
																type="date"
																bind:value={editingExecDateValue}
																min={todayStr}
																class="rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
															/>
															<button
																onclick={() => saveExecDate(exec)}
																class="text-xs font-medium text-primary hover:underline"
															>
																Guardar
															</button>
															<button
																onclick={cancelEditDate}
																class="text-xs font-medium text-muted-foreground hover:underline"
															>
																Cancelar
															</button>
														</span>
														{#if editingExecDateError}
															<span class="w-full text-xs text-red-500">{editingExecDateError}</span
															>
														{/if}
													{:else}
														<span class="ml-auto flex items-center gap-3">
															<button
																onclick={() => openEditDate(exec)}
																class="text-xs font-medium text-muted-foreground hover:underline"
															>
																Editar fecha
															</button>
															<button
																onclick={() => openCompleteExec(exec)}
																class="text-xs font-medium text-primary hover:underline"
															>
																Completar
															</button>
															<button
																onclick={() => openCancelExec(exec)}
																class="text-xs font-medium text-red-500 hover:underline"
															>
																Cancelar
															</button>
														</span>
													{/if}
												{/if}
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Plan modal (create/edit) -->
	<Dialog.Root bind:open={showPlanModal}>
		<Dialog.Content class="sm:max-w-lg">
			<Dialog.Header>
				<Dialog.Title>{planModalTitle}</Dialog.Title>
				<Dialog.Description>
					{isEditingPlan
						? 'Actualiza los datos del plan de mantenimiento'
						: 'Crea un plan de mantenimiento preventivo'}
				</Dialog.Description>
			</Dialog.Header>

			<form
				method="post"
				action={isEditingPlan ? '?/update_plan' : '?/create_plan'}
				class="space-y-4"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success' && result.data?.success) {
							closePlanModal();
							addToast(
								isEditingPlan ? 'Plan actualizado correctamente' : 'Plan creado correctamente'
							);
							await update();
						} else if (result.type === 'failure') {
							const d = (result.data as Record<string, unknown>) ?? {};
							formPlanError = (d.error as string) ?? 'Error al guardar el plan';
						}
					};
				}}
			>
				{#if isEditingPlan}
					<input type="hidden" name="id" value={editingPlan!.id} />
				{/if}

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-1.5 sm:col-span-2">
						<label for="plan-nombre" class="block text-sm font-medium text-foreground">
							Nombre <span class="text-red-500">*</span>
						</label>
						<input
							id="plan-nombre"
							name="nombre"
							type="text"
							bind:value={formPlanNombre}
							required
							class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
							class:border-red-400={!!formPlanError}
							placeholder="Ej: Mantenimiento Mensual PCs"
						/>
					</div>

					<div class="space-y-1.5 sm:col-span-2">
						<label for="plan-descripcion" class="block text-sm font-medium text-foreground">
							Descripción
						</label>
						<textarea
							id="plan-descripcion"
							name="descripcion"
							bind:value={formPlanDescripcion}
							class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
							rows="2"></textarea>
					</div>

					<div class="space-y-1.5">
						<label for="plan-frecuencia" class="block text-sm font-medium text-foreground">
							Frecuencia (días) <span class="text-red-500">*</span>
						</label>
						<input
							id="plan-frecuencia"
							name="frecuencia_dias"
							type="number"
							bind:value={formPlanFrecuencia}
							required
							min="1"
							class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="plan-equipo" class="block text-sm font-medium text-foreground">
							Equipo específico
						</label>
						<select
							id="plan-equipo"
							name="equipo_id"
							bind:value={formPlanEquipoId}
							class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
						>
							<option value="">Cualquier equipo</option>
							{#each equipmentList as eq (eq.id)}
								<option value={eq.id}>{eq.marca} {eq.modelo}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-1.5">
						<label for="plan-tipo-equipo" class="block text-sm font-medium text-foreground">
							O por tipo de equipo
						</label>
						<select
							id="plan-tipo-equipo"
							name="tipo_equipo_id"
							bind:value={formPlanTipoEquipoId}
							class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
						>
							<option value="">Todos los tipos</option>
							{#each equipmentTypesList as et (et.id)}
								<option value={et.id}>{et.nombre}</option>
							{/each}
						</select>
					</div>
				</div>

				{#if formPlanError}
					<p class="text-xs text-red-500">{formPlanError}</p>
				{/if}

				<Dialog.Footer>
					<Button variant="outline" onclick={closePlanModal}>Cancelar</Button>
					<Button type="submit">{isEditingPlan ? 'Guardar Cambios' : 'Crear Plan'}</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Task modal (add/edit) -->
	<Dialog.Root bind:open={showTaskModal}>
		<Dialog.Content class="sm:max-w-lg">
			<Dialog.Header>
				<Dialog.Title>{taskModalTitle}</Dialog.Title>
			</Dialog.Header>

			<form
				method="post"
				action={isEditingTask ? '?/update_task' : '?/add_task'}
				class="space-y-4"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success' && result.data?.success) {
							closeTaskModal();
							addToast(
								isEditingTask ? 'Tarea actualizada correctamente' : 'Tarea agregada correctamente'
							);
							await update();
						} else if (result.type === 'failure') {
							const d = (result.data as Record<string, unknown>) ?? {};
							formTaskError = (d.error as string) ?? 'Error al guardar la tarea';
						}
					};
				}}
			>
				<input type="hidden" name="plan_id" value={taskPlanId} />
				{#if isEditingTask}
					<input type="hidden" name="id" value={editingTask!.id} />
				{/if}

				<div class="space-y-1.5">
					<label for="task-nombre" class="block text-sm font-medium text-foreground">
						Nombre <span class="text-red-500">*</span>
					</label>
					<input
						id="task-nombre"
						name="nombre"
						type="text"
						bind:value={formTaskNombre}
						required
						class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
						class:border-red-400={!!formTaskError}
						placeholder="Ej: Limpieza interna"
					/>
				</div>

				<div class="space-y-1.5">
					<label for="task-descripcion" class="block text-sm font-medium text-foreground">
						Descripción
					</label>
					<textarea
						id="task-descripcion"
						name="descripcion"
						bind:value={formTaskDescripcion}
						class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
						rows="2"></textarea>
				</div>

				{#if formTaskError}
					<p class="text-xs text-red-500">{formTaskError}</p>
				{/if}

				<Dialog.Footer>
					<Button variant="outline" onclick={closeTaskModal}>Cancelar</Button>
					<Button type="submit">{isEditingTask ? 'Guardar Cambios' : 'Agregar Tarea'}</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Schedule modal -->
	<Dialog.Root bind:open={showScheduleModal}>
		<Dialog.Content class="sm:max-w-lg">
			<Dialog.Header>
				<Dialog.Title>Programar Ejecución</Dialog.Title>
				<Dialog.Description>
					{schedulePlanName}
				</Dialog.Description>
			</Dialog.Header>

			<form
				method="post"
				action="?/schedule_execution"
				class="space-y-4"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success' && result.data?.success) {
							closeScheduleModal();
							addToast('Ejecución programada correctamente');
							await update();
						} else if (result.type === 'failure') {
							const d = (result.data as Record<string, unknown>) ?? {};
							formScheduleError = (d.error as string) ?? 'Error al programar';
						}
					};
				}}
			>
				<input type="hidden" name="plan_id" value={schedulePlanId} />

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-1.5">
						<label for="sched-tecnico" class="block text-sm font-medium text-foreground">
							Técnico <span class="text-red-500">*</span>
						</label>
						<select
							id="sched-tecnico"
							name="ejecutado_por"
							bind:value={formScheduleTecnico}
							required
							class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
						>
							<option value="">Seleccionar técnico</option>
							{#each technicians as t (t.id)}
								<option value={t.id}>{t.nombre} {t.apellido}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-1.5">
						<label for="sched-fecha" class="block text-sm font-medium text-foreground">
							Fecha programada <span class="text-red-500">*</span>
						</label>
						<input
							id="sched-fecha"
							name="fecha_programada"
							type="date"
							bind:value={formScheduleFecha}
							required
							class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
						/>
					</div>
				</div>

				<!-- Tasks to confirm -->
				<div>
					<h4 class="mb-2 text-sm font-medium text-foreground">
						Tareas a ejecutar ({scheduleTasks.length})
					</h4>
					<div
						class="max-h-40 divide-y divide-border overflow-y-auto rounded-xl border border-border"
					>
						{#each scheduleTasks as task (task.id)}
							<div class="flex items-center gap-2 px-3 py-2">
								<ChevronRight class="h-4 w-4 shrink-0 text-primary" />
								<span class="text-sm text-foreground">
									{task.orden}. {task.nombre}
								</span>
								{#if getPendingExecForTask(task.id)}
									<span class="ml-auto text-xs text-muted-foreground">
										Ya programada para
										{formatDate(getPendingExecForTask(task.id)!.fecha_programada)}
									</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				{#if formScheduleError}
					<p class="text-xs text-red-500">{formScheduleError}</p>
				{/if}

				<Dialog.Footer>
					<Button variant="outline" onclick={closeScheduleModal}>Cancelar</Button>
					<Button type="submit">Programar</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Complete execution modal -->
	<Dialog.Root bind:open={showExecModal}>
		<Dialog.Content class="sm:max-w-lg">
			<Dialog.Header>
				<Dialog.Title>Completar Ejecución</Dialog.Title>
				<Dialog.Description>
					{selectedExec ? `Tarea pendiente del ${formatDate(selectedExec.fecha_programada)}` : ''}
				</Dialog.Description>
			</Dialog.Header>

			<form
				method="post"
				action="?/complete_execution"
				class="space-y-4"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success' && result.data?.success) {
							closeExecModal();
							addToast('Ejecución actualizada correctamente');
							await update();
						} else if (result.type === 'failure') {
							const d = (result.data as Record<string, unknown>) ?? {};
							formExecError = (d.error as string) ?? 'Error al actualizar';
						}
					};
				}}
			>
				<input type="hidden" name="id" value={selectedExec?.id ?? ''} />

				<div class="space-y-1.5">
					<label for="exec-resultado" class="block text-sm font-medium text-foreground">
						Resultado <span class="text-red-500">*</span>
					</label>
					<select
						id="exec-resultado"
						name="resultado"
						bind:value={formExecResultado}
						required
						class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
					>
						<option value="completado">Completado</option>
						<option value="fallido">Fallido</option>
						<option value="omitido">Omitido</option>
					</select>
				</div>

				<div class="space-y-1.5">
					<label for="exec-obs" class="block text-sm font-medium text-foreground">
						Observaciones
					</label>
					<textarea
						id="exec-obs"
						name="observaciones"
						bind:value={formExecObservaciones}
						class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
						rows="3"
						placeholder="Detalles de la ejecución..."></textarea>
				</div>

				{#if formExecError}
					<p class="text-xs text-red-500">{formExecError}</p>
				{/if}

				<Dialog.Footer>
					<Button variant="outline" onclick={closeExecModal}>Cancelar</Button>
					<Button type="submit">Guardar</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Confirm delete plan -->
	<ConfirmDialog
		bind:open={showDeletePlan}
		title="Eliminar Plan"
		message={deletingPlan
			? `¿Estás seguro de eliminar el plan "${deletingPlan.nombre}"? Esta acción no se puede deshacer.`
			: ''}
		confirmLabel="Eliminar"
		variant="danger"
		onconfirm={async () => {
			if (!deletingPlan) return;
			const formData = new URLSearchParams({ id: deletingPlan.id });

			const res = await fetch($page.url.pathname + '?/delete_plan', {
				method: 'POST',
				body: formData
			});

			showDeletePlan = false;

			if (res.ok) {
				if (expandedPlanId === deletingPlan.id) expandedPlanId = null;
				addToast('Plan eliminado correctamente');
				await invalidate($page.url.pathname);
			} else {
				const body = await res.json().catch(() => ({}));
				const d = ((body as Record<string, unknown>).data ?? {}) as Record<string, unknown>;
				const msg = typeof d.error === 'string' ? d.error : 'Error al eliminar el plan';
				addToast(msg, 'error');
			}
			deletingPlan = null;
		}}
		oncancel={() => {
			showDeletePlan = false;
			deletingPlan = null;
		}}
	/>

	<!-- Confirm delete task -->
	<ConfirmDialog
		bind:open={showDeleteTask}
		title="Eliminar Tarea"
		message={deletingTask
			? `¿Estás seguro de eliminar la tarea "${deletingTask.nombre}"? Esta acción no se puede deshacer.`
			: ''}
		confirmLabel="Eliminar"
		variant="danger"
		onconfirm={async () => {
			if (!deletingTask) return;
			const formData = new URLSearchParams({ id: deletingTask.id });

			const res = await fetch($page.url.pathname + '?/delete_task', {
				method: 'POST',
				body: formData
			});

			showDeleteTask = false;

			if (res.ok) {
				addToast('Tarea eliminada correctamente');
				await invalidate($page.url.pathname);
			} else {
				const body = await res.json().catch(() => ({}));
				const d = ((body as Record<string, unknown>).data ?? {}) as Record<string, unknown>;
				const msg = typeof d.error === 'string' ? d.error : 'Error al eliminar la tarea';
				addToast(msg, 'error');
			}
			deletingTask = null;
		}}
		oncancel={() => {
			showDeleteTask = false;
			deletingTask = null;
		}}
	/>

	<!-- Confirm cancel execution -->
	<ConfirmDialog
		bind:open={showCancelExec}
		title="Cancelar Ejecución"
		message={cancelingExec
			? `¿Estás seguro de cancelar la ejecución pendiente del ${formatDate(cancelingExec.fecha_programada)}?`
			: ''}
		confirmLabel="Cancelar ejecución"
		variant="danger"
		onconfirm={confirmCancelExec}
		oncancel={closeCancelExec}
	/>
</div>
