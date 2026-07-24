<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import DataTable from '$lib/ui/DataTable.svelte';
	import FilterBar from '$lib/ui/FilterBar.svelte';
	import FocusTrap from '$lib/ui/FocusTrap.svelte';
	import FormField from '$lib/ui/FormField.svelte';
	import ConfirmDialog from '$lib/ui/ConfirmDialog.svelte';
	import { fade } from 'svelte/transition';
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
	// svelte-ignore state_referenced_locally
	let filterEstado = $state(data.filterEstado ?? '');

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
	<title>Proveedores — EquipLab</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Proveedores</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Gestioná los proveedores de equipos y servicios
		</p>
	</div>

	<!-- Filter bar with chips + URL params -->
	<FilterBar
		search={search}
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
				<button
					onclick={() => openEdit(item)}
					class="inline-flex items-center gap-1 rounded-lg p-1.5 text-sm text-muted-foreground transition-colors hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-800"
					aria-label="Editar"
				>
					<Pencil class="h-4 w-4" />
				</button>
				<button
					onclick={() => openDelete(item)}
					class="inline-flex items-center gap-1 rounded-lg p-1.5 text-sm text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
					aria-label="Eliminar"
				>
					<Trash2 class="h-4 w-4" />
				</button>
			</div>
		{/snippet}
	</DataTable>

	<!-- Modal form (create/edit) — with focus trap (a11y) -->
	{#if showModal}
	<FocusTrap>
		<!-- svelte-ignore a11y_interactive_supports_focus a11y_click_events_have_key_events -->
		<div
			class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
			onclick={(e) => {
				if (e.target === e.currentTarget) closeModal();
			}}
			onkeydown={(e) => e.key === 'Escape' && closeModal()}
			transition:fade={{ duration: 200 }}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div
				class="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl"
				transition:fade={{ duration: 200 }}
			>
				<h2 class="text-lg font-bold text-foreground">{modalTitle}</h2>

				<form
					method="post"
					action="?/crud"
					class="mt-4 space-y-4"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success' && result.data?.success) {
								closeModal();
								addToast(
									isEditing
										? 'Proveedor actualizado correctamente'
										: 'Proveedor creado correctamente'
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

					<div class="flex justify-end gap-3 pt-2">
						<button
							type="button"
							onclick={closeModal}
							class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
						>
							Cancelar
						</button>
						<button
							type="submit"
							class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
						>
							{isEditing ? 'Guardar Cambios' : 'Crear Proveedor'}
						</button>
					</div>
				</form>
			</div>
		</div>
	</FocusTrap>
{/if}

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

			const res = await fetch($page.url.pathname, {
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
		class="fab fixed right-6 bottom-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/40 focus:ring-2 focus:ring-primary/50 focus:outline-none"
		aria-label="Nuevo Proveedor"
	>
		<Plus class="h-6 w-6" />
	</button>
</div>
