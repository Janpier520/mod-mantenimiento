<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import { addToast } from '$lib/stores/toast.svelte';
	import EmptyState from '$lib/ui/EmptyState.svelte';

	let { data } = $props();

	// svelte-ignore state_referenced_locally — intentional: capture server data into local state
	let sessions = $state(data.sessions);

	$effect(() => {
		sessions = data.sessions;
	});
</script>

<svelte:head>
	<title>Mis Sesiones — EquipLab</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Mis Sesiones</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Dispositivos y sesiones activas en tu cuenta
		</p>
	</div>

	<div class="space-y-3">
		{#each sessions as session}
			<div
				class="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900"
			>
				<div>
					<p class="text-sm font-medium text-foreground">
						Sesión iniciada {new Date(session.created_at).toLocaleString('es-AR')}
					</p>
					<p class="text-xs text-muted-foreground">
						Expira {new Date(session.expires_at).toLocaleString('es-AR')}
					</p>
				</div>
				<form
					method="post"
					action="?/revoke"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success' && result.data?.success) {
								addToast('Sesión cerrada');
								await invalidate($page.url.pathname);
							}
						};
					}}
				>
					<input type="hidden" name="sessionId" value={session.id} />
					<button
						type="submit"
						class="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
					>
						Cerrar
					</button>
				</form>
			</div>
		{:else}
			<EmptyState
				title="No hay sesiones activas"
				description="Las sesiones aparecen cuando iniciás sesión desde un nuevo dispositivo."
			/>
		{/each}
	</div>
</div>
