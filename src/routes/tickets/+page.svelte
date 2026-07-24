<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import DataTable from '$lib/ui/DataTable.svelte';
	import FilterBar from '$lib/ui/FilterBar.svelte';
	import FormField from '$lib/ui/FormField.svelte';
	import Badge from '$lib/ui/Badge.svelte';
	import { addToast } from '$lib/stores/toast.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import XIcon from '@lucide/svelte/icons/x';
	import SendIcon from '@lucide/svelte/icons/send';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';

	let { data } = $props();

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

	let selectedTicket = $state<Record<string, any> | null>(null);
	let showModal = $state(false);
	let editingTicket = $state<Record<string, any> | null>(null);
	let showDelete = $state(false);
	let deletingTicket = $state<Record<string, any> | null>(null);
	let formError = $state('');
	let formComentario = $state('');

	// Form fields for create/edit
	let formTitulo = $state('');
	let formDescripcion = $state('');
	let formPrioridad = $state('media');
	let formEstado = $state('abierto');
	let formEquipoId = $state('');
	let formTecnicoAsignado = $state('');

	let isEditing = $derived(editingTicket !== null);
	let modalTitle = $derived(isEditing ? 'Editar Ticket' : 'Nuevo Ticket');

	const estadoBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> =
		{
			abierto: 'info',
			en_proceso: 'warning',
			resuelto: 'success',
			cerrado: 'default'
		};

	const estadoLabels: Record<string, string> = {
		abierto: 'Abierto',
		en_proceso: 'En Proceso',
		resuelto: 'Resuelto',
		cerrado: 'Cerrado'
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
		{ key: 'reportado_por', label: 'Reportado por' },
		{ key: 'tecnico', label: 'Técnico' },
		{ key: 'fecha', label: 'Fecha' }
	];

	function selectTicket(t: Record<string, any>) {
		selectedTicket = selectedTicket?.id === t.id ? null : t;
	}

	function closeDetail() {
		selectedTicket = null;
	}

	function openCreate() {
		editingTicket = null;
		formTitulo = '';
		formDescripcion = '';
		formPrioridad = 'media';
		formEstado = 'abierto';
		formEquipoId = '';
		formTecnicoAsignado = '';
		formError = '';
		showModal = true;
	}

	function openEdit(t: Record<string, any>) {
		editingTicket = t;
		formTitulo = t.titulo ?? '';
		formDescripcion = t.descripcion ?? '';
		formPrioridad = t.prioridad ?? 'media';
		formEstado = t.estado ?? 'abierto';
		formEquipoId = t.equipo_id ?? '';
		formTecnicoAsignado = t.tecnico_asignado ?? '';
		formError = '';
		showModal = true;
	}

	function openDelete(t: Record<string, any>) {
		deletingTicket = t;
		showDelete = true;
	}

	function closeModal() {
		showModal = false;
		formError = '';
	}

	async function reload() {
		const params = new URLSearchParams();
		if (search) params.set('search', search);
		if (filterEstado) params.set('estado', filterEstado);
		if (filterPrioridad) params.set('prioridad', filterPrioridad);
		if (currentPage > 1) params.set('page', String(currentPage));
		const qs = params.toString();
		const url = qs ? `${$page.url.pathname}?${qs}` : $page.url.pathname;
		await goto(url, { keepFocus: true, noScroll: true, replaceState: true });
	}

	async function handleSearch(value: string) {
		search = value;
		currentPage = 1;
		selectedTicket = null;
		await reload();
	}

	async function handlePageChange(newPage: number) {
		currentPage = newPage;
		await reload();
	}

	$effect(() => {
		const currentId = selectedTicket?.id;
		tickets = data.tickets;
		tecnicos = data.tecnicos;
		equipos = data.equipos;
		total = data.total;
		currentPage = data.page;
		totalPages = data.totalPages;
		search = data.search;
		filterEstado = data.filterEstado;
		filterPrioridad = data.filterPrioridad;
		// Keep selected ticket reference in sync after reload
		if (currentId) {
			const updated = data.tickets.find((t: any) => t.id === currentId);
			if (updated) selectedTicket = updated;
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

	function getEquipoLabel(e: Record<string, any> | null | undefined): string {
		if (!e) return '—';
		return `${e.marca} ${e.modelo}`;
	}

	onMount(() => {
		if ($page.url.searchParams.get('nuevo') === 'true') {
			openCreate();
		}
	});
</script>

{#snippet cell(item: Record<string, any>, col: { key: string })}
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
	{:else if col.key === 'reportado_por'}
		{item.reporta?.nombre ?? ''} {item.reporta?.apellido ?? ''}
	{:else if col.key === 'tecnico'}
		{item.asignado ? `${item.asignado.nombre} ${item.asignado.apellido}` : '—'}
	{:else if col.key === 'fecha'}
		{new Date(item.created_at).toLocaleDateString('es-AR')}
	{:else}
		{item[col.key] ?? ''}
	{/if}
{/snippet}

<svelte:head>
	<title>Tickets — EquipLab</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Tickets</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Gestioná los tickets de soporte y mantenimiento
		</p>
	</div>

	<!-- Filter bar with chips + URL params -->
	<div class="flex flex-wrap items-start gap-3">
		<FilterBar
			search={search}
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
						{ value: 'cerrado', label: 'Cerrado' }
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
				selectedTicket = null;
				reload();
			}}
			onremovechip={(key) => {
				if (key === 'search') { search = ''; handleSearch(''); return; }
				if (key === 'estado') filterEstado = '';
				if (key === 'prioridad') filterPrioridad = '';
				currentPage = 1;
				selectedTicket = null;
				reload();
			}}
			onclearall={() => {
				search = '';
				filterEstado = '';
				filterPrioridad = '';
				currentPage = 1;
				selectedTicket = null;
				goto($page.url.pathname, { keepFocus: true, noScroll: true, replaceState: true });
			}}
		/>

		<Button onclick={openCreate}>
			<PlusIcon class="h-4 w-4" />
			Nuevo Ticket
		</Button>
	</div>

	<!-- DataTable -->
	<DataTable
		{columns}
		items={tickets}
		page={currentPage}
		{totalPages}
		{total}
		search={''}
		onsearch={() => {}}
		onpagechange={handlePageChange}
		hideSearch
		{cell}
	>
		{#snippet children(item)}
			<div class="flex items-center gap-1">
				<button
					onclick={() => openEdit(item)}
					class="inline-flex items-center gap-1 rounded-lg p-1.5 text-sm text-muted-foreground transition-colors hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-800"
					aria-label="Editar"
				>
					<PencilIcon class="h-4 w-4" />
				</button>
				<button
					onclick={() => openDelete(item)}
					class="inline-flex items-center gap-1 rounded-lg p-1.5 text-sm text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
					aria-label="Eliminar"
				>
					<Trash2Icon class="h-4 w-4" />
				</button>
			</div>
		{/snippet}
	</DataTable>

	<!-- Detail panel -->
	{#if selectedTicket}
		<div
			class="rounded-xl border bg-card p-6 shadow-sm transition-all"
		>
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
				class="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground dark:hover:bg-gray-800"
				aria-label="Cerrar detalle"
			>
				<XIcon class="h-5 w-5" />
			</button>
		</div>

		<!-- Info grid -->
		<div class="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-3">
			<div>
				<span
					class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
					>Equipo</span
				>
				<p class="text-sm text-foreground">
					{getEquipoLabel(selectedTicket.equipo)}
				</p>
			</div>
			<div>
				<span
					class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
					>Técnico asignado</span
				>
				<p class="text-sm text-foreground">
					{selectedTicket.asignado
						? `${selectedTicket.asignado.nombre} ${selectedTicket.asignado.apellido}`
						: '—'}
				</p>
			</div>
			<div>
				<span
					class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
					>Reportado por</span
				>
				<p class="text-sm text-foreground">
					{selectedTicket.reporta?.nombre ?? ''}
					{selectedTicket.reporta?.apellido ?? ''}
					<span class="text-xs text-muted-foreground"> — {formatDate(selectedTicket.created_at)}</span>
				</p>
			</div>
		</div>

		<!-- Description -->
		{#if selectedTicket.descripcion}
			<div class="mt-4">
				<span
					class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
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
				{#each selectedTicket.comentarios ?? [] as comment}
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
								addToast((result.data as any)?.error ?? 'Error al enviar comentario', 'error');
							}
						};
					}}
				>
					<input type="hidden" name="_action" value="add_comment" />
					<input type="hidden" name="ticket_id" value={selectedTicket.id} />
					<textarea
						name="contenido"
						bind:value={formComentario}
						placeholder="Escribí un comentario..."
						required
						class="min-h-[2.5rem] flex-1 resize-none rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
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
			</div>
		</div>
	{/if}

	<!-- Sheet form (create/edit) -->
	<Sheet.Root bind:open={showModal}>
		<Sheet.Content class="sm:max-w-lg">
			<Sheet.Header>
				<Sheet.Title>{modalTitle}</Sheet.Title>
				<Sheet.Description>
					{isEditing ? 'Actualizá el ticket' : 'Registrá un nuevo ticket'}
				</Sheet.Description>
			</Sheet.Header>

			<form
				method="post"
				action="?/crud"
				class="mt-4 space-y-4"
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
							formError = (d.error as string) ?? 'Error al guardar el ticket';
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
					error={formError && !formTitulo ? formError : ''}
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
					/>
					<FormField
						label="Equipo"
						name="equipo_id"
						type="select"
						bind:value={formEquipoId}
						options={[
							{ value: '', label: 'Sin equipo' },
							...equipos.map((e: any) => ({ value: e.id, label: `${e.marca} ${e.modelo}` }))
						]}
					/>
				</div>

				{#if isEditing}
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<FormField
							label="Estado"
							name="estado"
							type="select"
							bind:value={formEstado}
							options={[
								{ value: 'abierto', label: 'Abierto' },
								{ value: 'en_proceso', label: 'En Proceso' },
								{ value: 'resuelto', label: 'Resuelto' },
								{ value: 'cerrado', label: 'Cerrado' }
							]}
						/>
						<FormField
							label="Técnico Asignado"
							name="tecnico_asignado"
							type="select"
							bind:value={formTecnicoAsignado}
							options={[
								{ value: '', label: 'Sin técnico' },
								...tecnicos.map((t: any) => ({ value: t.id, label: `${t.nombre} ${t.apellido}` }))
							]}
						/>
					</div>
				{/if}

				{#if formError && formTitulo}
					<p class="text-xs text-red-500">{formError}</p>
				{/if}

				<div class="flex justify-end gap-3 pt-2">
					<Button variant="outline" onclick={closeModal}>Cancelar</Button>
					<Button type="submit">{isEditing ? 'Guardar Cambios' : 'Crear Ticket'}</Button>
				</div>
			</form>
		</Sheet.Content>
	</Sheet.Root>

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

						const res = await fetch($page.url.pathname, {
							method: 'POST',
							body: formData
						});

						const body = (await res.json()) as Record<string, unknown>;
						const wasSelected = selectedTicket?.id === deletingTicket.id;
						showDelete = false;
						deletingTicket = null;

						if (body.success) {
							if (wasSelected) selectedTicket = null;
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
	<Button
		onclick={openCreate}
		class="fab fixed right-6 bottom-6 z-30 h-14 w-14 rounded-full shadow-lg shadow-primary/30"
		aria-label="Nuevo Ticket"
	>
		<PlusIcon class="h-6 w-6" />
	</Button>
</div>
