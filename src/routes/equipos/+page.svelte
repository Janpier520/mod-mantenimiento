<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import DataTable from '$lib/ui/DataTable.svelte';
	import FormField from '$lib/ui/FormField.svelte';
	import Badge from '$lib/ui/Badge.svelte';
	import { addToast } from '$lib/stores/toast.svelte';
	import SearchIcon from '@lucide/svelte/icons/search';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import * as Sheet from '$lib/components/ui/sheet';
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

	let showModal = $state(false);
	let editingEquipo = $state<Record<string, string> | null>(null);
	let showDelete = $state(false);
	let deletingEquipo = $state<Record<string, string> | null>(null);
	let formError = $state('');

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

	function openEdit(e: Record<string, string>) {
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

	function openDelete(e: Record<string, string>) {
		deletingEquipo = e;
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
		if (filterTipo) params.set('tipo', filterTipo);
		if (currentPage > 1) params.set('page', String(currentPage));
		const qs = params.toString();
		await invalidate(qs ? `/${qs}` : '/');
	}

	async function handleSearch(value: string) {
		search = value;
		currentPage = 1;
		await reload();
	}

	async function handleEstadoFilter() {
		currentPage = 1;
		await reload();
	}

	async function handleTipoFilter() {
		currentPage = 1;
		await reload();
	}

	async function handlePageChange(newPage: number) {
		currentPage = newPage;
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
</script>

{#snippet cell(item: Record<string, string>, col: { key: string })}
	{#if col.key === 'estado'}
		<Badge
			text={estadoLabels[item.estado] ?? item.estado}
			variant={estadoBadgeVariant[item.estado] ?? 'default'}
		/>
	{:else}
		{item[col.key] ?? ''}
	{/if}
{/snippet}

<svelte:head>
	<title>Equipos — EquipLab</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Equipos</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Gestioná los equipos registrados en el laboratorio
		</p>
	</div>

	<!-- Filter bar -->
	<div class="flex flex-wrap items-center gap-3">
		<div class="relative w-full max-w-xs">
			<SearchIcon
				class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
			/>
			<input
				type="text"
				placeholder="Buscar por modelo, marca o serie..."
				bind:value={search}
				oninput={() => handleSearch(search)}
				class="block w-full rounded-xl border border-border bg-card py-2 pr-4 pl-9 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
			/>
		</div>

		<select
			bind:value={filterEstado}
			onchange={handleEstadoFilter}
			class="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
		>
			<option value="">Todos los estados</option>
			<option value="operativo">Operativo</option>
			<option value="en_reparacion">En Reparación</option>
			<option value="dado_de_baja">Dado de Baja</option>
			<option value="prestado">Prestado</option>
		</select>

		<select
			bind:value={filterTipo}
			onchange={handleTipoFilter}
			class="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
		>
			<option value="">Todos los tipos</option>
			{#each tipos as t}
				<option value={t.id}>{t.nombre}</option>
			{/each}
		</select>
	</div>

	<!-- DataTable -->
	<DataTable
		{columns}
		items={equipmentList}
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

	<!-- Sheet form (create/edit) -->
	<Sheet.Root bind:open={showModal}>
		<Sheet.Content class="sm:max-w-lg" side="right">
			<Sheet.Header>
				<Sheet.Title>{modalTitle}</Sheet.Title>
				<Sheet.Description>
					{isEditing
						? 'Actualizá los datos del equipo'
						: 'Registrá un nuevo equipo en el laboratorio'}
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

				<div class="flex justify-end gap-3 pt-2">
					<Button variant="outline" onclick={closeModal}>Cancelar</Button>
					<Button type="submit">{isEditing ? 'Guardar Cambios' : 'Crear Equipo'}</Button>
				</div>
			</form>
		</Sheet.Content>
	</Sheet.Root>

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

						const res = await fetch($page.url.pathname, {
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
		class="fab fixed right-6 bottom-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/40 focus:ring-2 focus:ring-primary/50 focus:outline-none"
		aria-label="Nuevo Equipo"
	>
		<PlusIcon class="h-6 w-6" />
	</button>
</div>
