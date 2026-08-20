<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import DataTable from '$lib/ui/DataTable.svelte';
	import FilterBar from '$lib/ui/FilterBar.svelte';
	import FormField from '$lib/ui/FormField.svelte';
	import { mapFieldErrors } from '$lib/ui/formErrors';
	import Badge from '$lib/ui/Badge.svelte';
	import ActionIconButton from '$lib/ui/ActionIconButton.svelte';
	import { addToast } from '$lib/stores/toast.svelte';
	import { getValidTransitions } from '$lib/domain/state-machines';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import XIcon from '@lucide/svelte/icons/x';
	import SendIcon from '@lucide/svelte/icons/send';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';

	let { data } = $props();

	type TicketRow = (typeof data.tickets)[number];

	// svelte-ignore state_referenced_locally
	let tickets = $state(data.tickets);
	// svelte-ignore state_referenced_locally
	let tecnicos = $state(data.tecnicos);
	// svelte-ignore state_referenced_locally
	let equipos = $state(data.equipos);
	// svelte-ignore state_referenced_locally
	let total = $state(data.total);
	// svelte-ignore state_referenced_locally
	let currentPage = $state(data.page);
	// svelte-ignore state_referenced_locally
	let totalPages = $state(data.totalPages);
	// svelte-ignore state_referenced_locally
	let search = $state(data.search);
	// svelte-ignore state_referenced_locally
	let filterEstado = $state(data.filterEstado);
	// svelte-ignore state_referenced_locally
	let filterPrioridad = $state(data.filterPrioridad);

	let selectedId = $state<string | null>(null);
	let selectedTicket = $derived(
		selectedId ? (data.tickets.find((t) => t.id === selectedId) ?? null) : null
	);
	let showModal = $state(false);
	let editingTicket = $state<TicketRow | null>(null);
	let showDelete = $state(false);
	let deletingTicket = $state<TicketRow | null>(null);
	let formError = $state('');
	let fieldErrors = $state<Record<string, string>>({});
	let formComentario = $state('');

	// Read-only role: consultors can view but not create/edit records
	let isConsultor = $derived($page.data.user?.rol === 'consultor');

	// Server error messages routed to the matching form field
	const fieldErrorMessages: Record<string, string[]> = {
		titulo: ['El título del ticket es obligatorio'],
		prioridad: ['Prioridad no válida'],
		estado: ['Estado no válido'],
		equipo_id: [
			'Equipo no encontrado',
			'No se puede crear un ticket para un equipo dado de baja',
			'No se puede asignar un equipo dado de baja'
		],
		tecnico_asignado: [
			'Técnico no encontrado',
			'El usuario asignado no es técnico ni administrador'
		],
		fecha_limite: ['Formato de fecha límite no válido (usa YYYY-MM-DD)']
	};

	// Form fields for create/edit
	let formTitulo = $state('');
	let formDescripcion = $state('');
	let formPrioridad = $state('media');
	let formEstado = $state('abierto');
	let formEquipoId = $state('');
	let formTecnicoAsignado = $state('');
	let formFechaLimite = $state('');

	// Attachments
	let uploadError = $state('');
	let uploadForm: HTMLFormElement | undefined = $state();

	let isEditing = $derived(editingTicket !== null);
	let modalTitle = $derived(isEditing ? 'Editar Ticket' : 'Nuevo Ticket');

	let formEstadoOptions = $derived.by(() => {
		if (!isEditing || !editingTicket) return [];
		const states = [editingTicket.estado, ...getValidTransitions(editingTicket.estado, 'ticket')];
		return [...new Set(states)].map((s) => ({ value: s, label: estadoLabels[s] ?? s }));
	});

	let selectedActivity = $derived(
		selectedId ? (data.activity ?? []).filter((a) => a.entidad_id === selectedId) : []
	);

	const estadoBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> =
		{
			abierto: 'info',
			en_proceso: 'warning',
			resuelto: 'success',
			cerrado: 'default',
			cancelado: 'danger'
		};

	const estadoLabels: Record<string, string> = {
		abierto: 'Abierto',
		en_proceso: 'En Proceso',
		resuelto: 'Resuelto',
		cerrado: 'Cerrado',
		cancelado: 'Cancelado'
	};

	const prioridadBadgeVariant: Record<
		string,
		'default' | 'success' | 'warning' | 'danger' | 'info'
	> = {
		baja: 'default',
		media: 'warning',
		alta: 'danger',
		critica: 'danger'
	};

	const prioridadLabels: Record<string, string> = {
		baja: 'Baja',
		media: 'Media',
		alta: 'Alta',
		critica: 'Crítica'
	};

	const columns = [
		{ key: 'numero_ticket', label: 'Ticket#' },
		{ key: 'titulo', label: 'Título' },
		{ key: 'estado', label: 'Estado' },
		{ key: 'prioridad', label: 'Prioridad' },
		{ key: 'fecha_limite', label: 'F. límite' },
		{ key: 'reportado_por', label: 'Reportado por' },
		{ key: 'tecnico', label: 'Técnico' },
		{ key: 'fecha', label: 'Fecha' }
	];

	function selectTicket(t: TicketRow) {
		selectedId = selectedId === t.id ? null : t.id;
	}

	function closeDetail() {
		selectedId = null;
	}

	function openCreate() {
		editingTicket = null;
		formTitulo = '';
		formDescripcion = '';
		formPrioridad = 'media';
		formEstado = 'abierto';
		formEquipoId = '';
		formTecnicoAsignado = '';
		formFechaLimite = '';
		formError = '';
		fieldErrors = {};
		showModal = true;
	}

	function openEdit(t: TicketRow) {
		editingTicket = t;
		formTitulo = t.titulo ?? '';
		formDescripcion = t.descripcion ?? '';
		formPrioridad = t.prioridad ?? 'media';
		formEstado = t.estado ?? 'abierto';
		formEquipoId = t.equipo_id ?? '';
		formTecnicoAsignado = t.tecnico_asignado ?? '';
		formFechaLimite = t.fecha_limite ?? '';
		formError = '';
		fieldErrors = {};
		showModal = true;
	}

	function openDelete(t: TicketRow) {
		deletingTicket = t;
		showDelete = true;
	}

	function closeModal() {
		showModal = false;
		formError = '';
		fieldErrors = {};
	}

	async function reload() {
		const params = new SvelteURLSearchParams();
		if (search) params.set('search', search);
		if (filterEstado) params.set('estado', filterEstado);
		if (filterPrioridad) params.set('prioridad', filterPrioridad);
		if (currentPage > 1) params.set('page', String(currentPage));
		const qs = params.toString();
		const url = qs ? `${$page.url.pathname}?${qs}` : $page.url.pathname;
		await goto(resolve(url as '/tickets'), {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}

	async function handleSearch(value: string) {
		search = value;
		currentPage = 1;
		selectedId = null;
		await reload();
	}

	async function handlePageChange(newPage: number) {
		currentPage = newPage;
		await reload();
	}

	$effect(() => {
		tickets = data.tickets;
		tecnicos = data.tecnicos;
		equipos = data.equipos;
		total = data.total;
		currentPage = data.page;
		totalPages = data.totalPages;
		search = data.search;
		filterEstado = data.filterEstado;
		filterPrioridad = data.filterPrioridad;
	});

	$effect(() => {
		if ($page.url.searchParams.get('nuevo') === 'true') {
			openCreate();
		}
	});

	function formatDate(iso: string): string {
		if (!iso) return '';
		return new Date(iso).toLocaleDateString('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const activityActionLabels: Record<string, (detail?: string) => string> = {
		crear: () => 'Ticket creado',
		transicion: (detail) => `Cambio de estado: ${detail ?? ''}`,
		comentario: () => 'Comentario agregado',
		adjunto: () => 'Archivo adjunto',
		adjunto_eliminado: () => 'Adjunto eliminado',
		eliminar: () => 'Ticket eliminado'
	};

	function getActivityLabel(action: string, detail?: string): string {
		return activityActionLabels[action]?.(detail) ?? action;
	}

	function getEquipoLabel(e: (typeof data.equipos)[number] | null | undefined): string {
		if (!e) return '—';
		return `${e.marca} ${e.modelo}`;
	}

	function formatDateOnly(iso: string | null | undefined): string {
		if (!iso) return '';
		return new Date(iso).toLocaleDateString('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function isVencido(t: TicketRow): boolean {
		if (!t.fecha_limite) return false;
		if (t.estado === 'cerrado' || t.estado === 'resuelto' || t.estado === 'cancelado') return false;
		return t.fecha_limite < new Date().toISOString().slice(0, 10);
	}

	async function deleteAttachment(attachmentId: string) {
		const formData = new FormData();
		formData.set('id', attachmentId);
		const res = await fetch(`${$page.url.pathname}?/delete_attachment`, {
			method: 'POST',
			body: formData
		});
		const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
		if (body.success) {
			addToast('Archivo eliminado correctamente');
			await invalidate($page.url.pathname);
		} else {
			addToast((body.error as string) ?? 'Error al eliminar el archivo', 'error');
		}
	}
</script>

{#snippet cell(item: TicketRow, col: { key: string })}
	{#if col.key === 'numero_ticket'}
		<button onclick={() => selectTicket(item)} class="font-medium text-primary hover:underline">
			{item.numero_ticket}
		</button>
	{:else if col.key === 'estado'}
		<Badge
			text={estadoLabels[item.estado] ?? item.estado}
			variant={estadoBadgeVariant[item.estado] ?? 'default'}
		/>
	{:else if col.key === 'prioridad'}
		<Badge
			text={prioridadLabels[item.prioridad] ?? item.prioridad}
			variant={prioridadBadgeVariant[item.prioridad] ?? 'default'}
		/>
	{:else if col.key === 'fecha_limite'}
		{#if item.fecha_limite}
			<div class="flex items-center gap-1.5">
				{formatDateOnly(item.fecha_limite)}
				{#if isVencido(item)}
					<Badge text="Vencido" variant="danger" />
				{/if}
			</div>
		{:else}—{/if}
	{:else if col.key === 'reportado_por'}
		{item.reporta?.nombre ?? ''} {item.reporta?.apellido ?? ''}
	{:else if col.key === 'tecnico'}
		{item.asignado ? `${item.asignado.nombre} ${item.asignado.apellido}` : '—'}
	{:else if col.key === 'fecha'}
		{new Date(item.created_at).toLocaleDateString('es-AR')}
	{:else}
		{(item as unknown as Record<string, unknown>)[col.key] ?? ''}
	{/if}
{/snippet}

<svelte:head>
	<title>Tickets — Módulo Mantenimiento de Equipos</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Tickets</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Gestiona los tickets de soporte y mantenimiento
		</p>
	</div>

	<!-- Filter bar with chips + URL params -->
	<div class="flex flex-wrap items-start gap-3">
		<FilterBar
			{search}
			onsearch={handleSearch}
			values={{
				estado: filterEstado,
				prioridad: filterPrioridad
			}}
			filters={[
				{
					key: 'estado',
					label: 'Estado',
					options: [
						{ value: 'abierto', label: 'Abierto' },
						{ value: 'en_proceso', label: 'En Proceso' },
						{ value: 'resuelto', label: 'Resuelto' },
						{ value: 'cerrado', label: 'Cerrado' },
						{ value: 'cancelado', label: 'Cancelado' }
					]
				},
				{
					key: 'prioridad',
					label: 'Prioridad',
					options: [
						{ value: 'baja', label: 'Baja' },
						{ value: 'media', label: 'Media' },
						{ value: 'alta', label: 'Alta' },
						{ value: 'critica', label: 'Crítica' }
					]
				}
			]}
			onfilterchange={(key, value) => {
				if (key === 'estado') filterEstado = value;
				if (key === 'prioridad') filterPrioridad = value;
				currentPage = 1;
				selectedId = null;
				reload();
			}}
			onremovechip={(key) => {
				if (key === 'search') {
					search = '';
					handleSearch('');
					return;
				}
				if (key === 'estado') filterEstado = '';
				if (key === 'prioridad') filterPrioridad = '';
				currentPage = 1;
				selectedId = null;
				reload();
			}}
			onclearall={() => {
				search = '';
				filterEstado = '';
				filterPrioridad = '';
				currentPage = 1;
				selectedId = null;
				goto($page.url.pathname, { keepFocus: true, noScroll: true, replaceState: true });
			}}
		/>

		{#if !isConsultor}
			<Button onclick={openCreate}>
				<PlusIcon class="h-4 w-4" />
				Nuevo Ticket
			</Button>
		{/if}
	</div>

	<!-- DataTable -->
	<DataTable
		{columns}
		items={tickets}
		page={currentPage}
		{totalPages}
		{total}
		search=""
		onsearch={() => {}}
		onpagechange={handlePageChange}
		hideSearch
		{cell}
	>
		{#snippet children(item)}
			{#if !isConsultor}
				<div class="flex items-center gap-1">
					<ActionIconButton
						icon={PencilIcon}
						variant="edit"
						onclick={() => openEdit(item)}
						label="Editar"
					/>
					<ActionIconButton
						icon={Trash2Icon}
						variant="delete"
						onclick={() => openDelete(item)}
						label="Eliminar"
					/>
				</div>
			{/if}
		{/snippet}
	</DataTable>

	<!-- Detail panel -->
	{#if selectedTicket}
		<div class="rounded-xl border bg-card p-6 shadow-sm transition-all">
			<!-- Header row -->
			<div class="flex items-start justify-between gap-4">
				<div class="flex-1">
					<div class="flex items-center gap-3">
						<h2 class="text-lg font-bold text-foreground">
							{selectedTicket.numero_ticket}
						</h2>
						<Badge
							text={estadoLabels[selectedTicket.estado] ?? selectedTicket.estado}
							variant={estadoBadgeVariant[selectedTicket.estado] ?? 'default'}
						/>
						<Badge
							text={prioridadLabels[selectedTicket.prioridad] ?? selectedTicket.prioridad}
							variant={prioridadBadgeVariant[selectedTicket.prioridad] ?? 'default'}
						/>
					</div>
					<p class="mt-1 text-base font-medium text-foreground">
						{selectedTicket.titulo}
					</p>
				</div>
				<button
					onclick={closeDetail}
					class="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					aria-label="Cerrar detalle"
				>
					<XIcon class="h-5 w-5" />
				</button>
			</div>

			<!-- Info grid -->
			<div class="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-3">
				<div>
					<span class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>Equipo</span
					>
					<p class="text-sm text-foreground">
						{getEquipoLabel(selectedTicket.equipo)}
					</p>
				</div>
				<div>
					<span class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>Técnico asignado</span
					>
					<p class="text-sm text-foreground">
						{selectedTicket.asignado
							? `${selectedTicket.asignado.nombre} ${selectedTicket.asignado.apellido}`
							: '—'}
					</p>
				</div>
				<div>
					<span class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>Reportado por</span
					>
					<p class="text-sm text-foreground">
						{selectedTicket.reporta?.nombre ?? ''}
						{selectedTicket.reporta?.apellido ?? ''}
						<span class="text-xs text-muted-foreground">
							— {formatDate(selectedTicket.created_at)}</span
						>
					</p>
				</div>
				<div>
					<span class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>Fecha límite</span
					>
					<p class="flex items-center gap-2 text-sm text-foreground">
						{#if selectedTicket.fecha_limite}
							{formatDateOnly(selectedTicket.fecha_limite)}
							{#if isVencido(selectedTicket)}
								<Badge text="Vencido" variant="danger" />
							{/if}
						{:else}—{/if}
					</p>
				</div>
			</div>

			<!-- Description -->
			{#if selectedTicket.descripcion}
				<div class="mt-4">
					<span class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>Descripción</span
					>
					<p class="mt-1 text-sm whitespace-pre-wrap text-foreground">
						{selectedTicket.descripcion}
					</p>
				</div>
			{/if}

			<!-- Comments -->
			<div class="mt-6">
				<hr class="mb-4 border-border" />
				<h3 class="mb-3 text-sm font-semibold text-foreground">
					Comentarios ({selectedTicket.comentarios?.length ?? 0})
				</h3>

				<div class="mb-4 max-h-64 space-y-3 overflow-y-auto">
					{#each selectedTicket.comentarios ?? [] as comment (comment.id)}
						<div class="rounded-lg bg-muted p-3">
							<div class="flex items-center gap-2 text-xs text-muted-foreground">
								<span class="font-medium text-foreground">
									{comment.usuario?.nombre ?? ''}
									{comment.usuario?.apellido ?? ''}
								</span>
								<span>&middot;</span>
								<span>{formatDate(comment.created_at)}</span>
							</div>
							<p class="mt-1 text-sm text-foreground">
								{comment.contenido}
							</p>
						</div>
					{/each}
				</div>

				{#if !isConsultor}
					<!-- Add comment form -->
					<form
						method="post"
						action="?/crud"
						class="flex gap-3"
						use:enhance={() => {
							return async ({ result, update }) => {
								if (result.type === 'success' && result.data?.success) {
									formComentario = '';
									await update();
									await invalidate($page.url.pathname);
								} else if (result.type === 'failure') {
									addToast(
										(result.data as { error?: string } | null)?.error ??
											'Error al enviar comentario',
										'error'
									);
								}
							};
						}}
					>
						<input type="hidden" name="_action" value="add_comment" />
						<input type="hidden" name="ticket_id" value={selectedTicket.id} />
						<textarea
							name="contenido"
							bind:value={formComentario}
							placeholder="Escribe un comentario..."
							required
							class="min-h-[2.5rem] flex-1 resize-none rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
							rows="1"></textarea>
						<button
							type="submit"
							disabled={!formComentario.trim()}
							class="shrink-0 self-end rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
						>
							<SendIcon class="h-4 w-4" />
							Enviar
						</button>
					</form>
				{/if}
			</div>

			<!-- Attachments -->
			<div class="mt-6">
				<hr class="mb-4 border-border" />
				<h3 class="mb-3 text-sm font-semibold text-foreground">
					Adjuntos ({selectedTicket.adjuntos?.length ?? 0})
				</h3>

				<div class="mb-4 space-y-2">
					{#if (selectedTicket.adjuntos ?? []).length === 0}
						<p class="text-sm text-muted-foreground">Sin archivos adjuntos.</p>
					{:else}
						{#each selectedTicket.adjuntos ?? [] as adj (adj.id)}
							<div class="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
								<a
									href={resolve('/tickets/attachments/[id]', { id: adj.id })}
									target="_blank"
									rel="noopener"
									class="min-w-0 truncate font-medium text-primary hover:underline"
								>
									{adj.filename}
								</a>
								<span class="ml-auto shrink-0 text-xs text-muted-foreground">
									{adj.mime_type || '—'}
								</span>
								{#if ($page.data.user?.id === adj.uploaded_by || $page.data.user?.rol === 'admin') && $page.data.user?.rol !== 'consultor'}
									<button
										onclick={() => deleteAttachment(adj.id)}
										class="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
										aria-label="Eliminar archivo"
									>
										<Trash2Icon class="h-4 w-4" />
									</button>
								{/if}
							</div>
						{/each}
					{/if}
				</div>

				{#if !isConsultor}
					<!-- Upload form -->
					<form
						method="post"
						action="?/upload_attachment"
						enctype="multipart/form-data"
						bind:this={uploadForm}
						class="flex flex-wrap items-center gap-3"
						use:enhance={() => {
							return async ({ result, update }) => {
								if (result.type === 'success' && result.data?.success) {
									uploadError = '';
									uploadForm?.reset();
									await update();
									await invalidate($page.url.pathname);
								} else if (result.type === 'failure') {
									const d = (result.data as Record<string, unknown>) ?? {};
									uploadError = (d.error as string) ?? 'Error al subir el archivo';
								}
							};
						}}
					>
						<input type="hidden" name="ticket_id" value={selectedTicket.id} />
						<input
							type="file"
							name="file"
							required
							accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.txt,.doc,.docx,.xls,.xlsx"
							class="block max-w-full text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
						/>
						<button
							type="submit"
							class="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
						>
							<UploadIcon class="h-4 w-4" />
							Subir archivo
						</button>
					</form>
				{/if}
				{#if uploadError}
					<p class="mt-2 text-xs text-red-500">{uploadError}</p>
				{/if}
			</div>

			<!-- Activity history -->
			<div class="mt-6">
				<hr class="mb-4 border-border" />
				<h3 class="mb-3 text-sm font-semibold text-foreground">
					Historial de Actividad ({selectedActivity.length})
				</h3>

				<div class="mb-4 max-h-64 space-y-3 overflow-y-auto">
					{#if selectedActivity.length === 0}
						<p class="text-sm text-muted-foreground">Sin actividad registrada.</p>
					{:else}
						{#each selectedActivity as entry (entry.id)}
							<div class="rounded-lg bg-muted p-3">
								<div class="flex items-center gap-2 text-xs text-muted-foreground">
									<span class="font-medium text-foreground">
										{entry.usuario?.nombre ?? ''}
										{entry.usuario?.apellido ?? ''}
									</span>
									<span>&middot;</span>
									<span>
										{new Date(entry.created_at).toLocaleString('es-AR')}
									</span>
								</div>
								<p class="mt-1 text-sm text-foreground">
									{getActivityLabel(entry.accion, entry.metadata?.detail as string | undefined)}
								</p>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Dialog form (create/edit) -->
	<Dialog.Root bind:open={showModal}>
		<Dialog.Content class="sm:max-w-lg">
			<Dialog.Header>
				<Dialog.Title>{modalTitle}</Dialog.Title>
				<Dialog.Description>
					{isEditing ? 'Actualiza el ticket' : 'Registra un nuevo ticket'}
				</Dialog.Description>
			</Dialog.Header>

			<form
				method="post"
				action="?/crud"
				class="space-y-4"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success' && result.data?.success) {
							closeModal();
							addToast(
								isEditing ? 'Ticket actualizado correctamente' : 'Ticket creado correctamente'
							);
							await update();
							await invalidate($page.url.pathname);
						} else if (result.type === 'failure') {
							const d = (result.data as Record<string, unknown>) ?? {};
							const err = (d.error as string) ?? 'Error al guardar el ticket';
							const mapped = mapFieldErrors(err, fieldErrorMessages);
							fieldErrors = mapped.fields;
							formError = mapped.general;
						}
					};
				}}
			>
				<input type="hidden" name="_action" value={isEditing ? 'update' : 'create'} />
				{#if isEditing}
					<input type="hidden" name="id" value={editingTicket!.id} />
				{/if}

				<FormField
					label="Título"
					name="titulo"
					bind:value={formTitulo}
					required
					error={fieldErrors['titulo']}
				/>
				<FormField
					label="Descripción"
					name="descripcion"
					type="textarea"
					bind:value={formDescripcion}
				/>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<FormField
						label="Prioridad"
						name="prioridad"
						type="select"
						bind:value={formPrioridad}
						options={[
							{ value: 'baja', label: 'Baja' },
							{ value: 'media', label: 'Media' },
							{ value: 'alta', label: 'Alta' },
							{ value: 'critica', label: 'Crítica' }
						]}
						error={fieldErrors['prioridad']}
					/>
					<FormField
						label="Equipo"
						name="equipo_id"
						type="select"
						bind:value={formEquipoId}
						options={[
							{ value: '', label: 'Sin equipo' },
							...equipos.map((e) => ({ value: e.id, label: `${e.marca} ${e.modelo}` }))
						]}
						error={fieldErrors['equipo_id']}
					/>
				</div>

				<FormField
					label="Fecha límite"
					name="fecha_limite"
					type="date"
					bind:value={formFechaLimite}
					error={fieldErrors['fecha_limite']}
				/>
				<p class="-mt-2 text-xs text-muted-foreground">
					Si se deja vacía, se calcula automáticamente según la prioridad (SLA).
				</p>

				{#if isEditing}
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<FormField
							label="Estado"
							name="estado"
							type="select"
							bind:value={formEstado}
							options={formEstadoOptions}
							error={fieldErrors['estado']}
						/>
						<FormField
							label="Técnico Asignado"
							name="tecnico_asignado"
							type="select"
							bind:value={formTecnicoAsignado}
							options={[
								{ value: '', label: 'Sin técnico' },
								...tecnicos.map((t) => ({ value: t.id, label: `${t.nombre} ${t.apellido}` }))
							]}
							error={fieldErrors['tecnico_asignado']}
						/>
					</div>
				{/if}

				{#if formError}
					<p class="text-xs text-red-500">{formError}</p>
				{/if}

				<Dialog.Footer>
					<Button variant="outline" onclick={closeModal}>Cancelar</Button>
					<Button type="submit">{isEditing ? 'Guardar Cambios' : 'Crear Ticket'}</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={showDelete}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Eliminar Ticket</Dialog.Title>
				<Dialog.Description>
					{deletingTicket
						? `¿Estás seguro de eliminar el ticket "${deletingTicket.numero_ticket}"? Esta acción no se puede deshacer.`
						: ''}
				</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer>
				<Button
					variant="outline"
					onclick={() => {
						showDelete = false;
						deletingTicket = null;
					}}
				>
					Cancelar
				</Button>
				<Button
					variant="destructive"
					onclick={async () => {
						if (!deletingTicket) return;
						const formData = new FormData();
						formData.set('_action', 'delete');
						formData.set('id', deletingTicket.id);

						const res = await fetch(`${$page.url.pathname}?/crud`, {
							method: 'POST',
							body: formData
						});

						const body = (await res.json()) as Record<string, unknown>;
						const wasSelected = selectedTicket?.id === deletingTicket.id;
						showDelete = false;
						deletingTicket = null;

						if (body.success) {
							if (wasSelected) selectedId = null;
							addToast('Ticket eliminado correctamente');
							await invalidate($page.url.pathname);
						} else {
							addToast((body.error as string) ?? 'Error al eliminar el ticket', 'error');
						}
					}}
				>
					Eliminar
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Floating action button -->
	{#if !isConsultor}
		<Button
			onclick={openCreate}
			class="fab fixed right-6 bottom-6 z-30 h-14 w-14 rounded-full shadow-lg"
			aria-label="Nuevo Ticket"
		>
			<PlusIcon class="h-6 w-6" />
		</Button>
	{/if}
</div>
