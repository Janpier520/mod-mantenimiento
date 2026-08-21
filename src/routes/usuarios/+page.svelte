<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import DataTable from '$lib/ui/DataTable.svelte';
	import FilterBar from '$lib/ui/FilterBar.svelte';
	import FormField from '$lib/ui/FormField.svelte';
	import { mapFieldErrors } from '$lib/ui/formErrors';
	import ConfirmDialog from '$lib/ui/ConfirmDialog.svelte';
	import Badge from '$lib/ui/Badge.svelte';
	import ActionIconButton from '$lib/ui/ActionIconButton.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button/index.js';
	import { addToast } from '$lib/stores/toast.svelte';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { data } = $props();

	type UsuarioRow = (typeof data.usuarios)[number];

	// svelte-ignore state_referenced_locally
	let usuarios = $state(data.usuarios);
	// svelte-ignore state_referenced_locally
	let filterRol = $state(data.filterRol ?? '');
	// svelte-ignore state_referenced_locally
	let filterActivo = $state(data.filterActivo ?? '');
	// svelte-ignore state_referenced_locally
	let total = $state(data.total ?? 0);
	// svelte-ignore state_referenced_locally
	let currentPage = $state(data.page ?? 1);
	// svelte-ignore state_referenced_locally
	let totalPages = $state(data.totalPages ?? 1);
	// svelte-ignore state_referenced_locally
	let search = $state(data.search ?? '');

	let showModal = $state(false);
	let editingUser = $state<UsuarioRow | null>(null);
	let showDelete = $state(false);
	let deletingUser = $state<UsuarioRow | null>(null);
	let formError = $state('');
	let fieldErrors = $state<Record<string, string>>({});

	const SECURITY_QUESTIONS = [
		{ value: '¿Cuál es tu color favorito?', label: '¿Cuál es tu color favorito?' },
		{
			value: '¿Cuál es el nombre de tu primera mascota?',
			label: '¿Cuál es el nombre de tu primera mascota?'
		},
		{ value: '¿En qué ciudad naciste?', label: '¿En qué ciudad naciste?' },
		{ value: '¿Cuál es tu comida favorita?', label: '¿Cuál es tu comida favorita?' },
		{ value: '¿Cuál es tu apellido materno?', label: '¿Cuál es tu apellido materno?' }
	];

	// Server error messages routed to the matching form field
	const fieldErrorMessages: Record<string, string[]> = {
		username: [
			'El nombre de usuario es obligatorio',
			'Ya existe un usuario con ese nombre de usuario'
		],
		email: [
			'El email es obligatorio',
			'El formato del email no es válido',
			'Ya existe un usuario con ese email',
			'Ya existe otro usuario con ese email'
		],
		nombre: ['El nombre es obligatorio'],
		apellido: ['El apellido es obligatorio'],
		password: [
			'La contraseña es obligatoria',
			'debe tener al menos 6 caracteres',
			'no puede tener más de 128 caracteres'
		],
		rol: ['Rol no válido', 'No podés desactivar o cambiar el rol del último administrador'],
		security_question_1: [
			'La pregunta de seguridad 1 es obligatoria',
			'Debes seleccionar la pregunta de seguridad 1'
		],
		security_answer_1: ['La respuesta de seguridad 1 es obligatoria'],
		security_question_2: [
			'La pregunta de seguridad 2 es obligatoria',
			'Debes seleccionar la pregunta de seguridad 2'
		],
		security_answer_2: ['La respuesta de seguridad 2 es obligatoria']
	};

	// Form fields
	let formUsername = $state('');
	let formEmail = $state('');
	let formNombre = $state('');
	let formApellido = $state('');
	let formPassword = $state('');
	let formRol = $state('tecnico');
	let formActivo = $state(true);
	let formQuestion1 = $state('');
	let formAnswer1 = $state('');
	let formQuestion2 = $state('');
	let formAnswer2 = $state('');

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
		formQuestion1 = '';
		formAnswer1 = '';
		formQuestion2 = '';
		formAnswer2 = '';
		formError = '';
		fieldErrors = {};
		showModal = true;
	}

	function openEdit(u: UsuarioRow) {
		editingUser = u;
		formUsername = u.username ?? '';
		formEmail = u.email ?? '';
		formNombre = u.nombre ?? '';
		formApellido = u.apellido ?? '';
		formPassword = '';
		formRol = u.rol ?? 'tecnico';
		formActivo = u.activo ?? true;
		formQuestion1 = '';
		formAnswer1 = '';
		formQuestion2 = '';
		formAnswer2 = '';
		formError = '';
		fieldErrors = {};
		showModal = true;
	}

	function openDelete(u: UsuarioRow) {
		deletingUser = u;
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
		if (filterRol) params.set('rol', filterRol);
		if (filterActivo) params.set('activo', filterActivo);
		if (currentPage > 1) params.set('page', String(currentPage));
		const qs = params.toString();
		const url = qs ? `${$page.url.pathname}?${qs}` : $page.url.pathname;
		await goto(resolve(url as '/usuarios'), {
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
		usuarios = data.usuarios;
		total = data.total ?? 0;
		currentPage = data.page ?? 1;
		totalPages = data.totalPages ?? 1;
		search = data.search ?? '';
		filterRol = data.filterRol ?? '';
		filterActivo = data.filterActivo ?? '';
	});

	$effect(() => {
		if ($page.url.searchParams.get('nuevo') === 'true') {
			openCreate();
		}
	});
</script>

<svelte:head>
	<title>Usuarios — Módulo Mantenimiento de Equipos</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Usuarios</h1>
		<p class="mt-1 text-sm text-muted-foreground">Gestiona los usuarios del sistema</p>
	</div>

	<!-- Filter bar with chips + URL params -->
	<FilterBar
		{search}
		onsearch={handleSearch}
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
			currentPage = 1;
			reload();
		}}
		onremovechip={(key) => {
			if (key === 'search') {
				search = '';
				handleSearch('');
				return;
			}
			if (key === 'rol') filterRol = '';
			if (key === 'activo') filterActivo = '';
			currentPage = 1;
			reload();
		}}
		onclearall={() => {
			search = '';
			filterRol = '';
			filterActivo = '';
			currentPage = 1;
			goto($page.url.pathname, { keepFocus: true, noScroll: true, replaceState: true });
		}}
	/>

	<!-- DataTable -->
	<DataTable
		{columns}
		items={usuarios}
		page={currentPage}
		{totalPages}
		{total}
		{search}
		onsearch={handleSearch}
		onpagechange={handlePageChange}
		hideSearch
	>
		{#snippet cell(item: UsuarioRow, col: { key: string })}
			{#if col.key === 'rol'}
				<Badge text={roleLabel(item.rol)} variant={roleVariants[item.rol] ?? 'default'} />
			{:else if col.key === 'activo'}
				<Badge text={item.activo ? 'Sí' : 'No'} variant={item.activo ? 'success' : 'danger'} />
			{:else}
				{(item as unknown as Record<string, unknown>)[col.key] ?? ''}
			{/if}
		{/snippet}

		{#snippet children(item)}
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
		{/snippet}
	</DataTable>

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
								isEditing ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente'
							);
							await update();
							await invalidateAll();
						} else if (result.type === 'failure') {
							const d = (result.data as Record<string, unknown>) ?? {};
							const err = (d.error as string) ?? 'Error al guardar el usuario';
							const mapped = mapFieldErrors(err, fieldErrorMessages);
							fieldErrors = mapped.fields;
							formError = mapped.general;
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
						error={fieldErrors['username']}
					/>
					<FormField
						label="Email"
						name="email"
						type="email"
						bind:value={formEmail}
						required
						error={fieldErrors['email']}
					/>
				</div>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<FormField
						label="Nombre"
						name="nombre"
						bind:value={formNombre}
						required
						error={fieldErrors['nombre']}
					/>
					<FormField
						label="Apellido"
						name="apellido"
						bind:value={formApellido}
						required
						error={fieldErrors['apellido']}
					/>
				</div>

				{#if isEditing}
					<div class="space-y-1.5">
						<label for="field-password" class="block text-sm font-medium text-foreground">
							Contraseña <span class="text-xs text-muted-foreground"
								>(deja vacío para mantener la actual)</span
							>
						</label>
						<input
							id="field-password"
							type="password"
							name="password"
							bind:value={formPassword}
							class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
							class:border-destructive={!!fieldErrors['password']}
						/>
						{#if fieldErrors['password']}
							<p class="text-xs text-destructive">{fieldErrors['password']}</p>
						{/if}
					</div>
				{:else}
					<FormField
						label="Contraseña"
						name="password"
						type="password"
						bind:value={formPassword}
						required
						error={fieldErrors['password']}
					/>
				{/if}

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-1.5">
						<label
							for="field-security_question_1"
							class="block text-sm font-medium text-foreground"
						>
							Pregunta de Seguridad 1
							{#if !isEditing}<span class="ml-0.5 text-red-500">*</span>{/if}
						</label>
						<select
							id="field-security_question_1"
							name="security_question_1"
							bind:value={formQuestion1}
							required={!isEditing}
							class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
						>
							<option value="" disabled>Seleccionar pregunta</option>
							{#each SECURITY_QUESTIONS as q (q.value)}
								<option value={q.value}>{q.label}</option>
							{/each}
						</select>
						{#if fieldErrors['security_question_1']}
							<p class="text-xs text-destructive">{fieldErrors['security_question_1']}</p>
						{/if}
					</div>
					<div class="space-y-1.5">
						<label for="field-security_answer_1" class="block text-sm font-medium text-foreground">
							Respuesta de Seguridad 1
							{#if !isEditing}<span class="ml-0.5 text-red-500">*</span>{/if}
							{#if isEditing}
								<span class="text-xs text-muted-foreground">(vacía = mantener actual)</span>
							{/if}
						</label>
						<input
							id="field-security_answer_1"
							type="password"
							name="security_answer_1"
							bind:value={formAnswer1}
							required={!isEditing}
							class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
						/>
						{#if fieldErrors['security_answer_1']}
							<p class="text-xs text-destructive">{fieldErrors['security_answer_1']}</p>
						{/if}
					</div>
				</div>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-1.5">
						<label
							for="field-security_question_2"
							class="block text-sm font-medium text-foreground"
						>
							Pregunta de Seguridad 2
							{#if !isEditing}<span class="ml-0.5 text-red-500">*</span>{/if}
						</label>
						<select
							id="field-security_question_2"
							name="security_question_2"
							bind:value={formQuestion2}
							required={!isEditing}
							class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
						>
							<option value="" disabled>Seleccionar pregunta</option>
							{#each SECURITY_QUESTIONS as q (q.value)}
								<option value={q.value}>{q.label}</option>
							{/each}
						</select>
						{#if fieldErrors['security_question_2']}
							<p class="text-xs text-destructive">{fieldErrors['security_question_2']}</p>
						{/if}
					</div>
					<div class="space-y-1.5">
						<label for="field-security_answer_2" class="block text-sm font-medium text-foreground">
							Respuesta de Seguridad 2
							{#if !isEditing}<span class="ml-0.5 text-red-500">*</span>{/if}
							{#if isEditing}
								<span class="text-xs text-muted-foreground">(vacía = mantener actual)</span>
							{/if}
						</label>
						<input
							id="field-security_answer_2"
							type="password"
							name="security_answer_2"
							bind:value={formAnswer2}
							required={!isEditing}
							class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
						/>
						{#if fieldErrors['security_answer_2']}
							<p class="text-xs text-destructive">{fieldErrors['security_answer_2']}</p>
						{/if}
					</div>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-1.5">
						<label for="field-rol" class="block text-sm font-medium text-foreground">
							Rol <span class="ml-0.5 text-red-500">*</span>
						</label>
						<select
							id="field-rol"
							name="rol"
							bind:value={formRol}
							required
							class="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
						>
							<option value="admin">Administrador</option>
							<option value="tecnico">Técnico</option>
							<option value="consultor">Consultor</option>
						</select>
						{#if fieldErrors['rol']}
							<p class="text-xs text-destructive">{fieldErrors['rol']}</p>
						{/if}
					</div>
					<div class="flex items-end pb-2.5">
						<label class="flex items-center gap-2 text-sm text-popover-foreground/80">
							<input
								type="checkbox"
								name="activo"
								bind:checked={formActivo}
								class="h-4 w-4 rounded border-input text-primary focus-visible:ring-ring"
							/>
							Usuario activo
						</label>
					</div>
				</div>

				{#if formError}
					<p class="text-xs text-red-500">{formError}</p>
				{/if}

				<div class="flex justify-end gap-3">
					<Button variant="outline" onclick={closeModal}>Cancelar</Button>
					<Button type="submit">{isEditing ? 'Guardar Cambios' : 'Crear Usuario'}</Button>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Root>

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

			const res = await fetch(`${$page.url.pathname}?/crud`, {
				method: 'POST',
				body: formData
			});

			const body = (await res.json()) as Record<string, unknown>;
			// ponytail: action responses are wrapped in the ActionResult envelope
			const d = (body.data ?? {}) as Record<string, unknown>;
			const targetId = deletingUser?.id;
			showDelete = false;
			deletingUser = null;

			if (d.success) {
				if (targetId) usuarios = usuarios.filter((u) => u.id !== targetId);
				addToast('Usuario eliminado correctamente');
				await invalidateAll();
			} else {
				addToast((d.error as string) ?? 'Error al eliminar el usuario', 'error');
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
		class="fab fixed right-6 bottom-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
		aria-label="Nuevo Usuario"
	>
		<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
		</svg>
	</button>
</div>
