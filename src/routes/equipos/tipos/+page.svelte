<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import DataTable from '$lib/ui/DataTable.svelte';
	import FormField from '$lib/ui/FormField.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import ConfirmDialog from '$lib/ui/ConfirmDialog.svelte';
	import { addToast } from '$lib/stores/toast.svelte';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	let tipos = $state(data.tipos);
	let showModal = $state(false);
	let editingTipo = $state<Record<string, string> | null>(null);
	let showDelete = $state(false);
	let deletingTipo = $state<Record<string, string> | null>(null);
	let formError = $state('');

	let formNombre = $state('');
	let formDescripcion = $state('');
	let formIcono = $state('');

	let isEditing = $derived(editingTipo !== null);
	let modalTitle = $derived(isEditing ? 'Editar Tipo de Equipo' : 'Nuevo Tipo de Equipo');

	const columns = [
		{ key: 'nombre', label: 'Nombre' },
		{ key: 'descripcion', label: 'Descripción' },
		{ key: 'icono', label: 'Icono' }
	];

	function openCreate() {
		editingTipo = null;
		formNombre = '';
		formDescripcion = '';
		formIcono = '';
		formError = '';
		showModal = true;
	}

	function openEdit(t: Record<string, string>) {
		editingTipo = t;
		formNombre = t.nombre ?? '';
		formDescripcion = t.descripcion ?? '';
		formIcono = t.icono ?? '';
		formError = '';
		showModal = true;
	}

	function openDelete(t: Record<string, string>) {
		deletingTipo = t;
		showDelete = true;
	}

	function closeModal() {
		showModal = false;
		formError = '';
	}

	$effect(() => {
		tipos = data.tipos;
	});
</script>

<svelte:head>
	<title>Tipos de Equipo — Módulo Mantenimiento de Equipos</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Tipos de Equipo</h1>
		<p class="mt-1 text-sm text-muted-foreground">Gestiona los tipos de equipo disponibles</p>
	</div>

	<!-- DataTable -->
	<DataTable
		{columns}
		items={tipos}
		page={1}
		totalPages={1}
		total={tipos.length}
		search={''}
		onsearch={() => {}}
		onpagechange={() => {}}
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
							addToast(isEditing ? 'Tipo actualizado correctamente' : 'Tipo creado correctamente');
							await update();
							await invalidate($page.url.pathname);
						} else if (result.type === 'failure') {
							const d = (result.data as Record<string, unknown>) ?? {};
							formError = (d.error as string) ?? 'Error al guardar el tipo';
						}
					};
				}}
			>
				<input type="hidden" name="_action" value={isEditing ? 'update' : 'create'} />
				{#if isEditing}
					<input type="hidden" name="id" value={editingTipo!.id} />
				{/if}

				<FormField
					label="Nombre"
					name="nombre"
					bind:value={formNombre}
					required
					error={formError && !formNombre ? formError : ''}
				/>
				<FormField
					label="Descripción"
					name="descripcion"
					type="textarea"
					bind:value={formDescripcion}
				/>
				<FormField label="Icono" name="icono" bind:value={formIcono} placeholder="Ej: 🔬" />

				{#if formError && formNombre}
					<p class="text-xs text-red-500">{formError}</p>
				{/if}

				<Dialog.Footer>
					<Button variant="outline" onclick={closeModal}>Cancelar</Button>
					<Button type="submit">{isEditing ? 'Guardar Cambios' : 'Crear Tipo'}</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<!-- ConfirmDialog for delete -->
	<ConfirmDialog
		bind:open={showDelete}
		title="Eliminar Tipo de Equipo"
		message={deletingTipo
			? `¿Estás seguro de eliminar "${deletingTipo.nombre}"? Esta acción no se puede deshacer.`
			: ''}
		confirmLabel="Eliminar"
		variant="danger"
		onconfirm={async () => {
			if (!deletingTipo) return;
			const formData = new FormData();
			formData.set('_action', 'delete');
			formData.set('id', deletingTipo.id);

			const res = await fetch($page.url.pathname, {
				method: 'POST',
				body: formData
			});

			const body = (await res.json()) as Record<string, unknown>;
			showDelete = false;
			deletingTipo = null;

			if (body.success) {
				addToast('Tipo eliminado correctamente');
				await invalidate($page.url.pathname);
			} else {
				addToast((body.error as string) ?? 'Error al eliminar el tipo', 'error');
			}
		}}
		oncancel={() => {
			showDelete = false;
			deletingTipo = null;
		}}
	/>

	<!-- Floating action button -->
	<button
		onclick={openCreate}
		class="fab fixed right-6 bottom-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/40 focus:ring-2 focus:ring-primary/50 focus:outline-none"
		aria-label="Nuevo Tipo de Equipo"
	>
		<Plus class="h-6 w-6" />
	</button>
</div>
