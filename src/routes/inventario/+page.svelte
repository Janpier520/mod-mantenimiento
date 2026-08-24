<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { unwrapActionData } from '$lib/utils';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import DataTable from '$lib/ui/DataTable.svelte';
	import FilterBar from '$lib/ui/FilterBar.svelte';
	import FormField from '$lib/ui/FormField.svelte';
	import { mapFieldErrors } from '$lib/ui/formErrors';
	import Badge from '$lib/ui/Badge.svelte';
	import ActionIconButton from '$lib/ui/ActionIconButton.svelte';
	import { addToast } from '$lib/stores/toast.svelte';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import ConfirmDialog from '$lib/ui/ConfirmDialog.svelte';

	let { data } = $props();

	type ItemRow = (typeof data.items)[number];

	// svelte-ignore state_referenced_locally
	let items = $state(data.items);
	// svelte-ignore state_referenced_locally
	let categorias = $state(data.categorias);
	// svelte-ignore state_referenced_locally
	let tipos = $state(data.tipos);
	// svelte-ignore state_referenced_locally
	let lowStockCount = $state(data.lowStockCount);
	// svelte-ignore state_referenced_locally
	let total = $state(data.total);
	// svelte-ignore state_referenced_locally
	let currentPage = $state(data.page);
	// svelte-ignore state_referenced_locally
	let totalPages = $state(data.totalPages);
	// svelte-ignore state_referenced_locally
	let search = $state(data.search);
	// svelte-ignore state_referenced_locally
	let filterCategoria = $state(data.filterCategoria);
	// svelte-ignore state_referenced_locally
	let filterTipoEquipo = $state(data.filterTipoEquipo);
	// svelte-ignore state_referenced_locally
	let filterStockBajo = $state(data.filterStockBajo);

	let showItemModal = $state(false);
	let editingItem = $state<ItemRow | null>(null);
	let showDelete = $state(false);
	let deletingItem = $state<ItemRow | null>(null);
	let showMovement = $state(false);
	let movementItem = $state<ItemRow | null>(null);
	let formError = $state('');
	let fieldErrors = $state<Record<string, string>>({});

	let isConsultor = $derived($page.data.user?.rol === 'consultor');

	const fieldErrorMessages: Record<string, string[]> = {
		nombre: ['El nombre es obligatorio'],
		categoria: ['La categoría es obligatoria']
	};

	// Item form fields
	let formNombre = $state('');
	let formDescripcion = $state('');
	let formCodigoParte = $state('');
	let formCategoria = $state('');
	let formTipoEquipoId = $state('');
	let formStockActual = $state('0');
	let formStockMinimo = $state('0');
	let formUbicacion = $state('');

	// Movement form fields
	let formMovTipo = $state('entrada');
	let formMovCantidad = $state('1');
	let formMovMotivo = $state('');

	let isEditing = $derived(editingItem !== null);
	let modalTitle = $derived(isEditing ? 'Editar Ítem' : 'Nuevo Ítem');

	const columns = [
		{ key: 'nombre', label: 'Nombre' },
		{ key: 'codigo_parte', label: 'Código Parte' },
		{ key: 'categoria', label: 'Categoría' },
		{ key: 'stock_actual', label: 'Stock Actual' },
		{ key: 'stock_minimo', label: 'Stock Mínimo' },
		{ key: 'ubicacion', label: 'Ubicación' }
	];

	function openCreate() {
		editingItem = null;
		formNombre = '';
		formDescripcion = '';
		formCodigoParte = '';
		formCategoria = '';
		formTipoEquipoId = '';
		formStockActual = '0';
		formStockMinimo = '0';
		formUbicacion = '';
		formError = '';
		fieldErrors = {};
		showItemModal = true;
	}

	function openEdit(item: ItemRow) {
		editingItem = item;
		formNombre = item.nombre ?? '';
		formDescripcion = item.descripcion ?? '';
		formCodigoParte = item.codigo_parte ?? '';
		formCategoria = item.categoria ?? '';
		formTipoEquipoId = item.tipo_equipo_id ?? '';
		formStockActual = String(item.stock_actual ?? 0);
		formStockMinimo = String(item.stock_minimo ?? 0);
		formUbicacion = item.ubicacion ?? '';
		formError = '';
		fieldErrors = {};
		showItemModal = true;
	}

	function openDelete(item: ItemRow) {
		deletingItem = item;
		showDelete = true;
	}

	function openMovement(item: ItemRow) {
		movementItem = item;
		formMovTipo = 'entrada';
		formMovCantidad = '1';
		formMovMotivo = '';
		formError = '';
		fieldErrors = {};
		showMovement = true;
	}

	function closeItemModal() {
		showItemModal = false;
		formError = '';
		fieldErrors = {};
	}

	function closeMovement() {
		showMovement = false;
		formError = '';
		fieldErrors = {};
	}

	async function reload() {
		const params = new SvelteURLSearchParams();
		if (search) params.set('search', search);
		if (filterCategoria) params.set('categoria', filterCategoria);
		if (filterTipoEquipo) params.set('tipo_equipo', filterTipoEquipo);
		if (filterStockBajo) params.set('stock_bajo', filterStockBajo);
		if (currentPage > 1) params.set('page', String(currentPage));
		const qs = params.toString();
		const url = qs ? `${$page.url.pathname}?${qs}` : $page.url.pathname;
		await goto(resolve(url as '/inventario'), {
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
		items = data.items;
		categorias = data.categorias;
		tipos = data.tipos;
		lowStockCount = data.lowStockCount;
		total = data.total;
		currentPage = data.page;
		totalPages = data.totalPages;
		search = data.search;
		filterCategoria = data.filterCategoria;
		filterTipoEquipo = data.filterTipoEquipo;
		filterStockBajo = data.filterStockBajo;
	});

	$effect(() => {
		if ($page.url.searchParams.get('nuevo') === 'true') {
			openCreate();
		}
	});
</script>

{#snippet cell(item: ItemRow, col: { key: string })}
	{#if col.key === 'stock_actual'}
		<div class="flex items-center gap-2">
			<span>{item.stock_actual}</span>
			{#if item.stock_actual < item.stock_minimo}
				<Badge text="Bajo" variant="danger" />
			{/if}
		</div>
	{:else}
		{(item as unknown as Record<string, unknown>)[col.key] ?? ''}
	{/if}
{/snippet}

<svelte:head>
	<title>Inventario — Módulo Mantenimiento de Equipos</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-foreground">Inventario</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Gestiona los repuestos y consumibles del laboratorio
				{#if lowStockCount > 0}
					<span
						class="ml-2 inline-flex items-center rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive"
					>
						{lowStockCount} bajo stock
					</span>
				{/if}
			</p>
		</div>
		<Button href="/inventario/movimientos" variant="outline" class="shrink-0">
			<ArrowLeftRight class="mr-1.5 inline h-4 w-4" />
			Movimientos
		</Button>
	</div>

	<!-- Filter bar with chips + URL params -->
	<FilterBar
		{search}
		onsearch={handleSearch}
		values={{
			categoria: filterCategoria,
			tipo_equipo: filterTipoEquipo,
			stock_bajo: filterStockBajo
		}}
		filters={[
			{
				key: 'categoria',
				label: 'Categoría',
				options: categorias.map((c) => ({ value: c, label: c }))
			},
			{
				key: 'tipo_equipo',
				label: 'Tipo de Equipo',
				options: tipos.map((t) => ({ value: t.id, label: t.nombre }))
			},
			{
				key: 'stock_bajo',
				label: 'Stock Bajo',
				options: [{ value: '1', label: 'Solo bajo stock' }]
			}
		]}
		onfilterchange={(key, value) => {
			if (key === 'categoria') filterCategoria = value;
			if (key === 'tipo_equipo') filterTipoEquipo = value;
			if (key === 'stock_bajo') filterStockBajo = value;
			currentPage = 1;
			reload();
		}}
		onremovechip={(key) => {
			if (key === 'search') {
				search = '';
				handleSearch('');
				return;
			}
			if (key === 'categoria') filterCategoria = '';
			if (key === 'tipo_equipo') filterTipoEquipo = '';
			if (key === 'stock_bajo') filterStockBajo = '';
			currentPage = 1;
			reload();
		}}
		onclearall={() => {
			search = '';
			filterCategoria = '';
			filterTipoEquipo = '';
			filterStockBajo = '';
			currentPage = 1;
			goto($page.url.pathname, { keepFocus: true, noScroll: true, replaceState: true });
		}}
	/>

	<!-- DataTable -->
	<DataTable
		{columns}
		{items}
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
					icon={ArrowLeftRight}
					variant="default"
					onclick={() => openMovement(item)}
					label="Registrar movimiento"
				/>
				{#if !isConsultor}
					<ActionIconButton
						icon={Pencil}
						variant="edit"
						onclick={() => openEdit(item)}
						label="Editar"
					/>
					<ActionIconButton
						icon={Trash2}
						variant="delete"
						onclick={() => openDelete(item)}
						label="Eliminar"
					/>
				{/if}
			</div>
		{/snippet}
	</DataTable>

	<!-- Dialog form (create/edit) -->
	<Dialog.Root bind:open={showItemModal}>
		<Dialog.Content class="sm:max-w-lg">
			<Dialog.Header>
				<Dialog.Title>{modalTitle}</Dialog.Title>
				<Dialog.Description>
					{isEditing ? 'Actualiza los datos del ítem' : 'Registra un nuevo ítem en el inventario'}
				</Dialog.Description>
			</Dialog.Header>

			<form
				method="post"
				action="?/crud"
				class="space-y-4"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success' && result.data?.success) {
							closeItemModal();
							addToast(isEditing ? 'Ítem actualizado correctamente' : 'Ítem creado correctamente');
							await update();
						} else if (result.type === 'failure') {
							const d = (result.data as Record<string, unknown>) ?? {};
							const err = (d.error as string) ?? 'Error al guardar el ítem';
							const mapped = mapFieldErrors(err, fieldErrorMessages);
							fieldErrors = mapped.fields;
							formError = mapped.general;
						}
					};
				}}
			>
				<input type="hidden" name="_action" value={isEditing ? 'update' : 'create'} />
				{#if isEditing}
					<input type="hidden" name="id" value={editingItem!.id} />
				{/if}

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<FormField
						label="Nombre"
						name="nombre"
						bind:value={formNombre}
						required
						error={fieldErrors['nombre']}
					/>
					<FormField label="Código Parte" name="codigo_parte" bind:value={formCodigoParte} />
					<FormField
						label="Categoría"
						name="categoria"
						bind:value={formCategoria}
						required
						error={fieldErrors['categoria']}
					/>
					<FormField
						label="Tipo de Equipo"
						name="tipo_equipo_id"
						type="select"
						bind:value={formTipoEquipoId}
						options={[
							{ value: '', label: 'Sin tipo' },
							...tipos.map((t) => ({ value: t.id, label: t.nombre }))
						]}
					/>
					<FormField
						label="Stock Actual"
						name="stock_actual"
						type="text"
						bind:value={formStockActual}
					/>
					<FormField
						label="Stock Mínimo"
						name="stock_minimo"
						type="text"
						bind:value={formStockMinimo}
					/>
					<FormField label="Ubicación" name="ubicacion" bind:value={formUbicacion} />
				</div>

				<FormField
					label="Descripción"
					name="descripcion"
					type="textarea"
					bind:value={formDescripcion}
				/>

				{#if formError}
					<p class="text-xs text-red-500">{formError}</p>
				{/if}

				<Dialog.Footer>
					<Button variant="outline" onclick={closeItemModal}>Cancelar</Button>
					<Button type="submit">{isEditing ? 'Guardar Cambios' : 'Crear Ítem'}</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Movement dialog -->
	<Dialog.Root bind:open={showMovement}>
		<Dialog.Content class="sm:max-w-md">
			<Dialog.Header>
				<Dialog.Title>Registrar Movimiento</Dialog.Title>
				<Dialog.Description>
					{movementItem ? `Registrar movimiento para "${movementItem.nombre}"` : ''}
				</Dialog.Description>
			</Dialog.Header>

			<form
				method="post"
				action="?/crud"
				class="space-y-4"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success' && result.data?.success) {
							closeMovement();
							addToast('Movimiento registrado correctamente');
							await update();
						} else if (result.type === 'failure') {
							const d = (result.data as Record<string, unknown>) ?? {};
							const err = (d.error as string) ?? 'Error al registrar el movimiento';
							formError = err;
						}
					};
				}}
			>
				<input type="hidden" name="_action" value="movimiento" />
				{#if movementItem}
					<input type="hidden" name="inventory_item_id" value={movementItem.id} />
				{/if}

				<FormField
					label="Tipo"
					name="tipo"
					type="select"
					bind:value={formMovTipo}
					options={[
						{ value: 'entrada', label: 'Entrada' },
						{ value: 'salida', label: 'Salida' },
						{ value: 'ajuste', label: 'Ajuste' }
					]}
					required
				/>
				<FormField
					label="Cantidad"
					name="cantidad"
					type="text"
					bind:value={formMovCantidad}
					required
				/>
				<FormField
					label="Motivo"
					name="motivo"
					type="textarea"
					bind:value={formMovMotivo}
					required
				/>

				{#if formError}
					<p class="text-xs text-red-500">{formError}</p>
				{/if}

				<Dialog.Footer>
					<Button variant="outline" onclick={closeMovement}>Cancelar</Button>
					<Button type="submit">Registrar</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<!-- ConfirmDialog for delete -->
	<ConfirmDialog
		bind:open={showDelete}
		title="Eliminar Ítem"
		message={deletingItem
			? `¿Estás seguro de eliminar "${deletingItem.nombre}"? Esta acción no se puede deshacer.`
			: ''}
		confirmLabel="Eliminar"
		variant="danger"
		onconfirm={async () => {
			if (!deletingItem) return;
			const formData = new FormData();
			formData.set('_action', 'delete');
			formData.set('id', deletingItem.id);

			const res = await fetch(`${$page.url.pathname}?/crud`, {
				method: 'POST',
				body: formData
			});

			const body = (await res.json()) as Record<string, unknown>;
			const d = unwrapActionData(body);
			const targetId = deletingItem?.id;
			showDelete = false;
			deletingItem = null;

			if (d.success) {
				if (targetId) items = items.filter((i) => i.id !== targetId);
				addToast('Ítem eliminado correctamente');
				await invalidateAll();
			} else {
				addToast((d.error as string) ?? 'Error al eliminar el ítem', 'error');
			}
		}}
		oncancel={() => {
			showDelete = false;
			deletingItem = null;
		}}
	/>

	<!-- Floating action button -->
	{#if !isConsultor}
		<button
			onclick={openCreate}
			class="fab fixed right-6 bottom-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
			aria-label="Nuevo Ítem"
		>
			<Plus class="h-6 w-6" />
		</button>
	{/if}
</div>
