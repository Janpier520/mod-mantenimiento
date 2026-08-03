<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import DataTable from '$lib/ui/DataTable.svelte';
	import FilterBar from '$lib/ui/FilterBar.svelte';
	import FormField from '$lib/ui/FormField.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import ConfirmDialog from '$lib/ui/ConfirmDialog.svelte';
	import ActionIconButton from '$lib/ui/ActionIconButton.svelte';
	import { addToast } from '$lib/stores/toast.svelte';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';

	let { data } = $props();

	// svelte-ignore state_referenced_locally — intentional: capture server data into local state
	let proveedores = $state(data.proveedores);
	// svelte-ignore state_referenced_locally
	let total = $state(data.total);
	// svelte-ignore state_referenced_locally
	let currentPage = $state(data.page);
	// svelte-ignore state_referenced_locally
	let totalPages = $state(data.totalPages);
	// svelte-ignore state_referenced_locally
	let search = $state(data.search);

	let showModal = $state(false);
	let editingProveedor = $state<Record<string, string> | null>(null);
	let showDelete = $state(false);
	let deletingProveedor = $state<Record<string, string> | null>(null);
	let formError = $state('');

	// Form fields
	let formNombre = $state('');
	let formContacto = $state('');
	let formTelefono = $state('');
	let formEmail = $state('');
	let formDireccion = $state('');

	let isEditing = $derived(editingProveedor !== null);
	let modalTitle = $derived(isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor');

	const columns = [
		{ key: 'nombre', label: 'Nombre' },
		{ key: 'contacto', label: 'Contacto' },
		{ key: 'telefono', label: 'Teléfono' },
		{ key: 'email', label: 'Email' }
	];

	function openCreate() {
		editingProveedor = null;
		formNombre = '';
		formContacto = '';
		formTelefono = '';
		formEmail = '';
		formDireccion = '';
		formError = '';
		showModal = true;
	}

	function openEdit(p: Record<string, string>) {
		editingProveedor = p;
		formNombre = p.nombre ?? '';
		formContacto = p.contacto ?? '';
		formTelefono = p.telefono ?? '';
		formEmail = p.email ?? '';
		formDireccion = p.direccion ?? '';
		formError = '';
		showModal = true;
	}

	function openDelete(p: Record<string, string>) {
		deletingProveedor = p;
		showDelete = true;
	}

	function closeModal() {
		showModal = false;
		formError = '';
	}

	async function reload() {
		const params = new URLSearchParams();
		if (search) params.set('search', search);
		if (currentPage > 1) params.set('page', String(currentPage));
		const qs = params.toString();
		const url = qs ? `${$page.url.pathname}?${qs}` : $page.url.pathname;
		await goto(url, { keepFocus: true, noScroll: true, replaceState: true });
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
		proveedores = data.proveedores;
		total = data.total;
		currentPage = data.page;
		totalPages = data.totalPages;
		search = data.search;
	});

	onMount(() => {
		if ($page.url.searchParams.get('nuevo') === 'true') {
			openCreate();
		}
	});
</script>

<svelte:head>
	<title>Proveedores — Módulo Mantenimiento de Equipos</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Proveedores</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Gestiona los proveedores de equipos y servicios
		</p>
	</div>

	<!-- Filter bar with chips + URL params -->
	<FilterBar
		{search}
		onsearch={handleSearch}
		filters={[]}
		values={{}}
		onclearall={() => {
			search = '';
			currentPage = 1;
			goto($page.url.pathname, { keepFocus: true, noScroll: true, replaceState: true });
		}}
	/>

	<!-- DataTable -->
	<DataTable
		{columns}
		items={proveedores}
		page={currentPage}
		{totalPages}
		{total}
		bind:search
		onsearch={handleSearch}
		onpagechange={handlePageChange}
		hideSearch
	>
		{#snippet children(item)}
			<div class="flex items-center gap-1">
				<ActionIconButton icon={Pencil} variant="edit" onclick={() => openEdit(item)} label="Editar" />
				<ActionIconButton icon={Trash2} variant="delete" onclick={() => openDelete(item)} label="Eliminar" />
			</div>
		{/snippet}
	</DataTable>

	<!-- Dialog form (create/edit) -->
	<Dialog.Root bind:open={showModal}>
		<Dialog.Content class="sm:max-w-lg">
			<Dialog.Header>
				<Dialog.Title>{modalTitle}</Dialog.Title>
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
								isEditing ? 'Proveedor actualizado correctamente' : 'Proveedor creado correctamente'
							);
							await update();
							await invalidate($page.url.pathname);
						} else if (result.type === 'failure') {
							const d = (result.data as Record<string, unknown>) ?? {};
							formError = (d.error as string) ?? 'Error al guardar el proveedor';
						}
					};
				}}
			>
				<input type="hidden" name="_action" value={isEditing ? 'update' : 'create'} />
				{#if isEditing}
					<input type="hidden" name="id" value={editingProveedor!.id} />
				{/if}

				<FormField
					label="Nombre"
					name="nombre"
					bind:value={formNombre}
					required
					error={formError && !formNombre ? formError : ''}
				/>
				<FormField label="Contacto" name="contacto" bind:value={formContacto} />
				<FormField label="Teléfono" name="telefono" type="tel" bind:value={formTelefono} />
				<FormField label="Email" name="email" type="email" bind:value={formEmail} />
				<FormField label="Dirección" name="direccion" bind:value={formDireccion} />

				{#if formError && formNombre}
					<p class="text-xs text-red-500">{formError}</p>
				{/if}

				<Dialog.Footer>
					<Button variant="outline" onclick={closeModal}>Cancelar</Button>
					<Button type="submit">{isEditing ? 'Guardar Cambios' : 'Crear Proveedor'}</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<!-- ConfirmDialog for delete -->
	<ConfirmDialog
		bind:open={showDelete}
		title="Eliminar Proveedor"
		message={deletingProveedor
			? `¿Estás seguro de eliminar "${deletingProveedor.nombre}"? Esta acción no se puede deshacer.`
			: ''}
		confirmLabel="Eliminar"
		variant="danger"
		onconfirm={async () => {
			if (!deletingProveedor) return;
			const formData = new FormData();
			formData.set('_action', 'delete');
			formData.set('id', deletingProveedor.id);

			const res = await fetch(`${$page.url.pathname}?/crud`, {
				method: 'POST',
				body: formData
			});

			const body = (await res.json()) as Record<string, unknown>;
			showDelete = false;
			deletingProveedor = null;

			if (body.success) {
				addToast('Proveedor eliminado correctamente');
				await invalidate($page.url.pathname);
			} else {
				addToast((body.error as string) ?? 'Error al eliminar el proveedor', 'error');
			}
		}}
		oncancel={() => {
			showDelete = false;
			deletingProveedor = null;
		}}
	/>

	<!-- Floating action button -->
	<button
		onclick={openCreate}
		class="fab fixed right-6 bottom-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
		aria-label="Nuevo Proveedor"
	>
		<Plus class="h-6 w-6" />
	</button>
</div>
