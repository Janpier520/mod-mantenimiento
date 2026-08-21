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
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import ConfirmDialog from '$lib/ui/ConfirmDialog.svelte';
	import ActionIconButton from '$lib/ui/ActionIconButton.svelte';
	import { addToast } from '$lib/stores/toast.svelte';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';

	let { data } = $props();

	type ProveedorRow = (typeof data.proveedores)[number];

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

	let showModal = $state(false);
	let editingProveedor = $state<ProveedorRow | null>(null);
	let showDelete = $state(false);
	let deletingProveedor = $state<ProveedorRow | null>(null);
	let formError = $state('');
	let fieldErrors = $state<Record<string, string>>({});

	// Read-only role: consultors can view but not create/edit records
	let isConsultor = $derived($page.data.user?.rol === 'consultor');

	// Server error messages routed to the matching form field
	const fieldErrorMessages: Record<string, string[]> = {
		nombre: ['El nombre del proveedor es obligatorio'],
		email: ['El formato del email no es válido']
	};

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
		fieldErrors = {};
		showModal = true;
	}

	function openEdit(p: ProveedorRow) {
		editingProveedor = p;
		formNombre = p.nombre ?? '';
		formContacto = p.contacto ?? '';
		formTelefono = p.telefono ?? '';
		formEmail = p.email ?? '';
		formDireccion = p.direccion ?? '';
		formError = '';
		fieldErrors = {};
		showModal = true;
	}

	function openDelete(p: ProveedorRow) {
		deletingProveedor = p;
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
		if (currentPage > 1) params.set('page', String(currentPage));
		const qs = params.toString();
		const url = qs ? `${$page.url.pathname}?${qs}` : $page.url.pathname;
		await goto(resolve(url as '/proveedores'), {
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
		proveedores = data.proveedores;
		total = data.total;
		currentPage = data.page;
		totalPages = data.totalPages;
		search = data.search;
	});

	$effect(() => {
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
			{#if !isConsultor}
				<div class="flex items-center gap-1">
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
				</div>
			{/if}
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
						} else if (result.type === 'failure') {
							const d = (result.data as Record<string, unknown>) ?? {};
							const err = (d.error as string) ?? 'Error al guardar el proveedor';
							const mapped = mapFieldErrors(err, fieldErrorMessages);
							fieldErrors = mapped.fields;
							formError = mapped.general;
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
					error={fieldErrors['nombre']}
				/>
				<FormField
					label="Contacto"
					name="contacto"
					bind:value={formContacto}
					error={fieldErrors['contacto']}
				/>
				<FormField
					label="Teléfono"
					name="telefono"
					type="tel"
					bind:value={formTelefono}
					error={fieldErrors['telefono']}
				/>
				<FormField
					label="Email"
					name="email"
					type="email"
					bind:value={formEmail}
					error={fieldErrors['email']}
				/>
				<FormField
					label="Dirección"
					name="direccion"
					bind:value={formDireccion}
					error={fieldErrors['direccion']}
				/>

				{#if formError}
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
			// ponytail: action responses are wrapped in the ActionResult envelope
			const d = (body.data ?? {}) as Record<string, unknown>;
			showDelete = false;
			deletingProveedor = null;

			if (d.success) {
				addToast('Proveedor eliminado correctamente');
				await invalidate($page.url.pathname);
			} else {
				addToast((d.error as string) ?? 'Error al eliminar el proveedor', 'error');
			}
		}}
		oncancel={() => {
			showDelete = false;
			deletingProveedor = null;
		}}
	/>

	<!-- Floating action button -->
	{#if !isConsultor}
		<button
			onclick={openCreate}
			class="fab fixed right-6 bottom-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
			aria-label="Nuevo Proveedor"
		>
			<Plus class="h-6 w-6" />
		</button>
	{/if}
</div>
