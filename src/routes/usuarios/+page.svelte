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
	import Badge from '$lib/ui/Badge.svelte';
	import { fade } from 'svelte/transition';
	import { addToast } from '$lib/stores/toast.svelte';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	let usuarios = $state(data.usuarios);
	// svelte-ignore state_referenced_locally
	let filterRol = $state(data.filterRol ?? '');
	// svelte-ignore state_referenced_locally
	let filterActivo = $state(data.filterActivo ?? '');

	let showModal = $state(false);
	let editingUser = $state<Record<string, any> | null>(null);
	let showDelete = $state(false);
	let deletingUser = $state<Record<string, any> | null>(null);
	let formError = $state('');

	// Form fields
	let formUsername = $state('');
	let formEmail = $state('');
	let formNombre = $state('');
	let formApellido = $state('');
	let formPassword = $state('');
	let formRol = $state('tecnico');
	let formActivo = $state(true);

	let isEditing = $derived(editingUser !== null);
	let modalTitle = $derived(isEditing ? 'Editar Usuario' : 'Nuevo Usuario');

	const columns = [
		{ key: 'nombre', label: 'Nombre' },
		{ key: 'apellido', label: 'Apellido' },
		{ key: 'username', label: 'Usuario' },
		{ key: 'email', label: 'Email' },
		{ key: 'rol', label: 'Rol' },
		{ key: 'activo', label: 'Activo' }
	];

	const roleVariants: Record<string, 'danger' | 'info' | 'warning'> = {
		admin: 'danger',
		tecnico: 'info',
		consultor: 'warning'
	};

	function roleLabel(rol: string): string {
		const map: Record<string, string> = {
			admin: 'Administrador',
			tecnico: 'Técnico',
			consultor: 'Consultor'
		};
		return map[rol] ?? rol;
	}

	function openCreate() {
		editingUser = null;
		formUsername = '';
		formEmail = '';
		formNombre = '';
		formApellido = '';
		formPassword = '';
		formRol = 'tecnico';
		formActivo = true;
		formError = '';
		showModal = true;
	}

	function openEdit(u: Record<string, any>) {
		editingUser = u;
		formUsername = u.username ?? '';
		formEmail = u.email ?? '';
		formNombre = u.nombre ?? '';
		formApellido = u.apellido ?? '';
		formPassword = '';
		formRol = u.rol ?? 'tecnico';
		formActivo = u.activo ?? true;
		formError = '';
		showModal = true;
	}

	function openDelete(u: Record<string, any>) {
		deletingUser = u;
		showDelete = true;
	}

	function closeModal() {
		showModal = false;
		formError = '';
	}

	async function reload() {
		const params = new URLSearchParams();
		if (filterRol) params.set('rol', filterRol);
		if (filterActivo) params.set('activo', filterActivo);
		const qs = params.toString();
		const url = qs ? `${$page.url.pathname}?${qs}` : $page.url.pathname;
		await goto(url, { keepFocus: true, noScroll: true, replaceState: true });
	}

	$effect(() => {
		usuarios = data.usuarios;
		filterRol = data.filterRol ?? '';
		filterActivo = data.filterActivo ?? '';
	});

	onMount(() => {
		if ($page.url.searchParams.get('nuevo') === 'true') {
			openCreate();
		}
	});
</script>

<svelte:head>
	<title>Usuarios — EquipLab</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Usuarios</h1>
		<p class="mt-1 text-sm text-muted-foreground">Gestioná los usuarios del sistema</p>
	</div>

	<!-- Filter bar with chips + URL params -->
	<FilterBar
		search={''}
		onsearch={() => {}}
		values={{
			rol: filterRol,
			activo: filterActivo
		}}
		filters={[
			{
				key: 'rol',
				label: 'Rol',
				options: [
					{ value: 'admin', label: 'Administrador' },
					{ value: 'tecnico', label: 'Técnico' },
					{ value: 'consultor', label: 'Consultor' }
				]
			},
			{
				key: 'activo',
				label: 'Estado',
				options: [
					{ value: 'si', label: 'Activo' },
					{ value: 'no', label: 'Inactivo' }
				]
			}
		]}
		onfilterchange={(key, value) => {
			if (key === 'rol') filterRol = value;
			if (key === 'activo') filterActivo = value;
			reload();
		}}
		onremovechip={(key) => {
			if (key === 'rol') filterRol = '';
			if (key === 'activo') filterActivo = '';
			reload();
		}}
		onclearall={() => {
			filterRol = '';
			filterActivo = '';
			goto($page.url.pathname, { keepFocus: true, noScroll: true, replaceState: true });
		}}
	/>

	<!-- DataTable -->
	<DataTable
		{columns}
		items={usuarios}
		page={1}
		totalPages={1}
		total={usuarios.length}
		search={''}
		onsearch={() => {}}
		onpagechange={() => {}}
		hideSearch
	>
		{#snippet cell(item: Record<string, any>, col: { key: string })}
			{#if col.key === 'rol'}
				<Badge text={roleLabel(item.rol)} variant={roleVariants[item.rol] ?? 'default'} />
			{:else if col.key === 'activo'}
				<Badge text={item.activo ? 'Sí' : 'No'} variant={item.activo ? 'success' : 'danger'} />
			{:else}
				{item[col.key] ?? ''}
			{/if}
		{/snippet}

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
				class="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
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
									isEditing ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente'
								);
								await update();
								await invalidate($page.url.pathname);
							} else if (result.type === 'failure') {
								const d = (result.data as Record<string, unknown>) ?? {};
								formError = (d.error as string) ?? 'Error al guardar el usuario';
							}
						};
					}}
				>
					<input type="hidden" name="_action" value={isEditing ? 'update' : 'create'} />
					{#if isEditing}
						<input type="hidden" name="id" value={editingUser!.id} />
					{/if}

					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<FormField
							label="Nombre de Usuario"
							name="username"
							bind:value={formUsername}
							required
							disabled={isEditing}
						/>
						<FormField label="Email" name="email" type="email" bind:value={formEmail} required />
					</div>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<FormField label="Nombre" name="nombre" bind:value={formNombre} required />
						<FormField label="Apellido" name="apellido" bind:value={formApellido} required />
					</div>

					{#if isEditing}
						<div class="space-y-1.5">
							<label
								for="field-password"
								class="block text-sm font-medium text-foreground"
							>
								Contraseña <span class="text-xs text-muted-foreground"
									>(dejá vacío para mantener la actual)</span
								>
							</label>
							<input
								id="field-password"
								type="password"
								name="password"
								bind:value={formPassword}
								class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
					{:else}
						<FormField
							label="Contraseña"
							name="password"
							type="text"
							bind:value={formPassword}
							required
						/>
					{/if}

					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div class="space-y-1.5">
							<label
								for="field-rol"
								class="block text-sm font-medium text-foreground"
							>
								Rol <span class="ml-0.5 text-red-500">*</span>
							</label>
							<select
								id="field-rol"
								name="rol"
								bind:value={formRol}
								required
								class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
							>
								<option value="admin">Administrador</option>
								<option value="tecnico">Técnico</option>
								<option value="consultor">Consultor</option>
							</select>
						</div>
						<div class="flex items-end pb-2.5">
							<label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
								<input
									type="checkbox"
									name="activo"
									bind:checked={formActivo}
									class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600"
								/>
								Usuario activo
							</label>
						</div>
					</div>

					{#if formError}
						<p class="text-xs text-red-500">{formError}</p>
					{/if}

					<div class="flex justify-end gap-3 pt-2">
						<button
							type="button"
							onclick={closeModal}
							class="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
						>
							Cancelar
						</button>
						<button
							type="submit"
							class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
						>
							{isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
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
		title="Eliminar Usuario"
		message={deletingUser
			? `¿Estás seguro de eliminar a "${deletingUser.nombre} ${deletingUser.apellido}"? Esta acción no se puede deshacer.`
			: ''}
		confirmLabel="Eliminar"
		variant="danger"
		onconfirm={async () => {
			if (!deletingUser) return;
			const formData = new FormData();
			formData.set('_action', 'delete');
			formData.set('id', deletingUser.id);

			const res = await fetch($page.url.pathname, {
				method: 'POST',
				body: formData
			});

			const body = (await res.json()) as Record<string, unknown>;
			showDelete = false;
			deletingUser = null;

			if (body.success) {
				addToast('Usuario eliminado correctamente');
				await invalidate($page.url.pathname);
			} else {
				addToast((body.error as string) ?? 'Error al eliminar el usuario', 'error');
			}
		}}
		oncancel={() => {
			showDelete = false;
			deletingUser = null;
		}}
	/>

	<!-- Floating action button -->
	<button
		onclick={openCreate}
		class="fab fixed right-6 bottom-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/40 focus:ring-2 focus:ring-primary/50 focus:outline-none"
		aria-label="Nuevo Usuario"
	>
		<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
		</svg>
	</button>
</div>
