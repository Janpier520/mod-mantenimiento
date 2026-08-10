<script lang="ts">
	import { onMount } from 'svelte';
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

	onMount(() => {
		if ($page.url.searchParams.get('nuevo') === 'true') {
			openCreate();
		}
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
			reload();
		}}
		onclearall={() => {
			search = '';
			filterEstado = '';
			filterTipo = '';
			currentPage = 1;
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
