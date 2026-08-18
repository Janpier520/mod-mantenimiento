<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import DataTable from '$lib/ui/DataTable.svelte';
	import FilterBar from '$lib/ui/FilterBar.svelte';
	import FormField from '$lib/ui/FormField.svelte';
	import Badge from '$lib/ui/Badge.svelte';
	import ActionIconButton from '$lib/ui/ActionIconButton.svelte';
	import { addToast } from '$lib/stores/toast.svelte';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import HistoryIcon from '@lucide/svelte/icons/history';
	import XIcon from '@lucide/svelte/icons/x';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	let equipmentList = $state(data.equipment);
	// svelte-ignore state_referenced_locally
	let tipos = $state(data.tipos);
	// svelte-ignore state_referenced_locally
	let proveedores = $state(data.proveedores);
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
	let filterTipo = $state(data.filterTipo);

	type EquipoRow = (typeof data.equipment)[number];

	let showModal = $state(false);
	let editingEquipo = $state<EquipoRow | null>(null);
	let showDelete = $state(false);
	let deletingEquipo = $state<EquipoRow | null>(null);
	let formError = $state('');
	let selectedId = $state<string | null>(null);
	let selectedEquipo = $derived(
		selectedId ? (equipmentList.find((e) => e.id === selectedId) ?? null) : null
	);

	// Form fields
	let formTipoId = $state('');
	let formModelo = $state('');
	let formMarca = $state('');
	let formNumeroSerie = $state('');
	let formEstado = $state('operativo');
	let formUbicacion = $state('');
	let formFechaAdquisicion = $state('');
	let formProveedorId = $state('');
	let formNotas = $state('');

	let isEditing = $derived(editingEquipo !== null);
	let modalTitle = $derived(isEditing ? 'Editar Equipo' : 'Nuevo Equipo');

	const estadoBadgeVariant: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
		operativo: 'success',
		en_reparacion: 'warning',
		dado_de_baja: 'danger',
		prestado: 'info'
	};

	const estadoLabels: Record<string, string> = {
		operativo: 'Operativo',
		en_reparacion: 'En Reparación',
		dado_de_baja: 'Dado de Baja',
		prestado: 'Prestado'
	};

	const columns = [
		{ key: 'modelo', label: 'Modelo' },
		{ key: 'marca', label: 'Marca' },
		{ key: 'tipo_nombre', label: 'Tipo' },
		{ key: 'estado', label: 'Estado' },
		{ key: 'ubicacion', label: 'Ubicación' }
	];

	function openCreate() {
		editingEquipo = null;
		formTipoId = '';
		formModelo = '';
		formMarca = '';
		formNumeroSerie = '';
		formEstado = 'operativo';
		formUbicacion = '';
		formFechaAdquisicion = '';
		formProveedorId = '';
		formNotas = '';
		formError = '';
		showModal = true;
	}

	function openEdit(e: EquipoRow) {
		editingEquipo = e;
		formTipoId = e.tipo_id ?? '';
		formModelo = e.modelo ?? '';
		formMarca = e.marca ?? '';
		formNumeroSerie = e.numero_serie ?? '';
		formEstado = e.estado ?? 'operativo';
		formUbicacion = e.ubicacion ?? '';
		formFechaAdquisicion = e.fecha_adquisicion ? e.fecha_adquisicion.slice(0, 10) : '';
		formProveedorId = e.proveedor_id ?? '';
		formNotas = e.notas ?? '';
		formError = '';
		showModal = true;
	}

	function openDelete(e: EquipoRow) {
		deletingEquipo = e;
		showDelete = true;
	}

	function selectEquipo(e: EquipoRow) {
		selectedId = selectedId === e.id ? null : e.id;
	}

	function closeDetail() {
		selectedId = null;
	}

	function closeModal() {
		showModal = false;
		formError = '';
	}

	async function reload() {
		const params = new SvelteURLSearchParams();
		if (search) params.set('search', search);
		if (filterEstado) params.set('estado', filterEstado);
		if (filterTipo) params.set('tipo', filterTipo);
		if (currentPage > 1) params.set('page', String(currentPage));
		const qs = params.toString();
		const url = qs ? `${$page.url.pathname}?${qs}` : $page.url.pathname;
		await goto(resolve(url as '/equipos'), {
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
		selectedId = null;
		await reload();
	}

	$effect(() => {
		equipmentList = data.equipment;
		tipos = data.tipos;
		proveedores = data.proveedores;
		total = data.total;
		currentPage = data.page;
		totalPages = data.totalPages;
		search = data.search;
		filterEstado = data.filterEstado;
		filterTipo = data.filterTipo;
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
</script>

{#snippet cell(item: EquipoRow, col: { key: string })}
	{#if col.key === 'estado'}
		<Badge
			text={estadoLabels[item.estado] ?? item.estado}
			variant={estadoBadgeVariant[item.estado] ?? 'default'}
		/>
	{:else}
		{(item as unknown as Record<string, unknown>)[col.key] ?? ''}
	{/if}
{/snippet}

<svelte:head>
	<title>Equipos — Módulo Mantenimiento de Equipos</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Equipos</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Gestiona los equipos registrados en el laboratorio
		</p>
	</div>

	<!-- Filter bar with chips + URL params -->
	<FilterBar
		{search}
		onsearch={handleSearch}
		values={{
			estado: filterEstado,
			tipo: filterTipo
		}}
		filters={[
			{
				key: 'estado',
				label: 'Estado',
				options: [
					{ value: 'operativo', label: 'Operativo' },
					{ value: 'en_reparacion', label: 'En Reparación' },
					{ value: 'dado_de_baja', label: 'Dado de Baja' },
					{ value: 'prestado', label: 'Prestado' }
				]
			},
			{
				key: 'tipo',
				label: 'Tipo',
				options: tipos.map((t) => ({ value: t.id, label: t.nombre }))
			}
		]}
		onfilterchange={(key, value) => {
			if (key === 'estado') filterEstado = value;
			if (key === 'tipo') filterTipo = value;
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
			if (key === 'tipo') filterTipo = '';
			currentPage = 1;
			selectedId = null;
			reload();
		}}
		onclearall={() => {
			search = '';
			filterEstado = '';
			filterTipo = '';
			currentPage = 1;
			selectedId = null;
			goto($page.url.pathname, { keepFocus: true, noScroll: true, replaceState: true });
		}}
	/>

	<!-- DataTable -->
	<DataTable
		{columns}
		items={equipmentList}
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
			<div class="flex items-center gap-1">
				<ActionIconButton
					icon={HistoryIcon}
					variant="default"
					onclick={() => selectEquipo(item)}
					label="Ver historial"
				/>
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
		{/snippet}
	</DataTable>

	<!-- Detail panel -->
	{#if selectedEquipo}
		<div class="rounded-xl border bg-card p-6 shadow-sm transition-all">
			<!-- Header row -->
			<div class="flex items-start justify-between gap-4">
				<div class="flex-1">
					<div class="flex items-center gap-3">
						<h2 class="text-lg font-bold text-foreground">
							{selectedEquipo.modelo}
							{selectedEquipo.marca}
						</h2>
						<Badge
							text={estadoLabels[selectedEquipo.estado] ?? selectedEquipo.estado}
							variant={estadoBadgeVariant[selectedEquipo.estado] ?? 'default'}
						/>
					</div>
					<p class="mt-1 text-sm text-muted-foreground">
						N° Serie: {selectedEquipo.numero_serie || '—'}
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
						>Tipo</span
					>
					<p class="text-sm text-foreground">{selectedEquipo.tipo_nombre || '—'}</p>
				</div>
				<div>
					<span class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>Ubicación</span
					>
					<p class="text-sm text-foreground">{selectedEquipo.ubicacion || '—'}</p>
				</div>
				<div>
					<span class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>Proveedor</span
					>
					<p class="text-sm text-foreground">{selectedEquipo.proveedor_nombre || '—'}</p>
				</div>
				<div>
					<span class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>Fecha de adquisición</span
					>
					<p class="text-sm text-foreground">
						{selectedEquipo.fecha_adquisicion
							? new Date(selectedEquipo.fecha_adquisicion).toLocaleDateString('es-AR')
							: '—'}
					</p>
				</div>
			</div>

			<!-- Status history -->
			<div class="mt-6">
				<hr class="mb-4 border-border" />
				<h3 class="mb-3 text-sm font-semibold text-foreground">
					Historial de Estado ({selectedEquipo.historial?.length ?? 0})
				</h3>

				{#if (selectedEquipo.historial?.length ?? 0) === 0}
					<p class="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
						Sin cambios de estado registrados
					</p>
				{:else}
					<div class="space-y-2">
						{#each selectedEquipo.historial ?? [] as entry (entry.id)}
							<div
								class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted/50 px-4 py-3"
							>
								<Badge
									text={estadoLabels[entry.estado_nuevo] ?? entry.estado_nuevo}
									variant={estadoBadgeVariant[entry.estado_nuevo] ?? 'default'}
								/>
								{#if entry.estado_anterior && entry.estado_anterior !== entry.estado_nuevo}
									<span class="text-xs text-muted-foreground">
										desde {estadoLabels[entry.estado_anterior] ?? entry.estado_anterior}
									</span>
								{/if}
								<span class="ml-auto text-xs text-muted-foreground">
									{entry.cambiado_por
										? `${entry.cambiado_por.nombre} ${entry.cambiado_por.apellido}`
										: 'Sistema'}
								</span>
								<span class="text-xs text-muted-foreground">{formatDate(entry.created_at)}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Dialog form (create/edit) -->
	<Dialog.Root bind:open={showModal}>
		<Dialog.Content class="sm:max-w-lg">
			<Dialog.Header>
				<Dialog.Title>{modalTitle}</Dialog.Title>
				<Dialog.Description>
					{isEditing
						? 'Actualiza los datos del equipo'
						: 'Registra un nuevo equipo en el laboratorio'}
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
								isEditing ? 'Equipo actualizado correctamente' : 'Equipo creado correctamente'
							);
							await update();
							await invalidate($page.url.pathname);
						} else if (result.type === 'failure') {
							const d = (result.data as Record<string, unknown>) ?? {};
							formError = (d.error as string) ?? 'Error al guardar el equipo';
						}
					};
				}}
			>
				<input type="hidden" name="_action" value={isEditing ? 'update' : 'create'} />
				{#if isEditing}
					<input type="hidden" name="id" value={editingEquipo!.id} />
				{/if}

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<FormField
						label="Tipo"
						name="tipo_id"
						type="select"
						bind:value={formTipoId}
						options={tipos.map((t) => ({ value: t.id, label: t.nombre }))}
						required
						error={formError && !formTipoId ? formError : ''}
					/>
					<FormField
						label="Modelo"
						name="modelo"
						bind:value={formModelo}
						required
						error={formError && !formModelo ? formError : ''}
					/>
					<FormField
						label="Marca"
						name="marca"
						bind:value={formMarca}
						required
						error={formError && !formMarca ? formError : ''}
					/>
					<FormField label="N° Serie" name="numero_serie" bind:value={formNumeroSerie} />
					<FormField
						label="Estado"
						name="estado"
						type="select"
						bind:value={formEstado}
						options={[
							{ value: 'operativo', label: 'Operativo' },
							{ value: 'en_reparacion', label: 'En Reparación' },
							{ value: 'dado_de_baja', label: 'Dado de Baja' },
							{ value: 'prestado', label: 'Prestado' }
						]}
					/>
					<FormField label="Ubicación" name="ubicacion" bind:value={formUbicacion} />
					<FormField
						label="Fecha Adquisición"
						name="fecha_adquisicion"
						type="date"
						bind:value={formFechaAdquisicion}
					/>
					<FormField
						label="Proveedor"
						name="proveedor_id"
						type="select"
						bind:value={formProveedorId}
						options={[
							{ value: '', label: 'Sin proveedor' },
							...proveedores.map((p) => ({ value: p.id, label: p.nombre }))
						]}
					/>
				</div>

				<FormField label="Notas" name="notas" type="textarea" bind:value={formNotas} />

				{#if formError && formModelo && formMarca && formTipoId}
					<p class="text-xs text-red-500">{formError}</p>
				{/if}

				<Dialog.Footer>
					<Button variant="outline" onclick={closeModal}>Cancelar</Button>
					<Button type="submit">{isEditing ? 'Guardar Cambios' : 'Crear Equipo'}</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Dialog for delete confirmation -->
	<Dialog.Root bind:open={showDelete}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Eliminar Equipo</Dialog.Title>
				<Dialog.Description>
					{deletingEquipo
						? `¿Estás seguro de eliminar "${deletingEquipo.modelo}" (${deletingEquipo.marca})? Esta acción no se puede deshacer.`
						: ''}
				</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer>
				<Button
					variant="outline"
					onclick={() => {
						showDelete = false;
						deletingEquipo = null;
					}}
				>
					Cancelar
				</Button>
				<Button
					variant="destructive"
					onclick={async () => {
						if (!deletingEquipo) return;
						const formData = new FormData();
						formData.set('_action', 'delete');
						formData.set('id', deletingEquipo.id);

						const res = await fetch(`${$page.url.pathname}?/crud`, {
							method: 'POST',
							body: formData
						});

						const body = (await res.json()) as Record<string, unknown>;
						showDelete = false;
						deletingEquipo = null;

						if (body.success) {
							addToast('Equipo eliminado correctamente');
							await invalidate($page.url.pathname);
						} else {
							addToast((body.error as string) ?? 'Error al eliminar el equipo', 'error');
						}
					}}
				>
					Eliminar
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Floating action button -->
	<button
		onclick={openCreate}
		class="fab fixed right-6 bottom-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
		aria-label="Nuevo Equipo"
	>
		<PlusIcon class="h-6 w-6" />
	</button>
</div>
