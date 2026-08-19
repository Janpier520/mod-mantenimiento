<script lang="ts">
	import { enhance } from '$app/forms';
	import { addToast } from '$lib/stores/toast.svelte';

	let { data } = $props();

	let settings = $derived(data.settings);
	let saving = $state(false);
	let errorMessage = $state('');
</script>

<svelte:head>
	<title>Configuración — Módulo Mantenimiento de Equipos</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Parametrización General</h1>
		<p class="mt-1 text-sm text-muted-foreground">Parámetros generales del sistema</p>
	</div>

	<form
		method="post"
		use:enhance={() => {
			return async ({ result, update }) => {
				saving = true;
				errorMessage = '';
				if (result.type === 'success' && result.data?.success) {
					addToast('Configuración guardada correctamente');
					await update();
				} else if (result.type === 'failure') {
					errorMessage = String(result.data?.error || 'No se pudo guardar la configuración');
				}
				saving = false;
			};
		}}
		class="space-y-6 rounded-xl border border-border bg-card p-6 shadow-lg dark:border-border dark:bg-background"
	>
		{#if errorMessage}
			<div
				role="alert"
				class="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
			>
				{errorMessage}
			</div>
		{/if}
		<input type="hidden" name="_keys" value={settings.map((s) => s.key).join(',')} />

		{#each settings as setting (setting.key)}
			<div>
				<label for={setting.key} class="mb-1 block text-sm font-medium text-foreground">
					{setting.descripcion}
				</label>
				<input
					id={setting.key}
					name={setting.key}
					type={setting.tipo}
					value={setting.value}
					class="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none"
				/>
			</div>
		{/each}

		<div class="flex justify-end">
			<button
				type="submit"
				disabled={saving}
				class="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
			>
				{saving ? 'Guardando...' : 'Guardar Cambios'}
			</button>
		</div>
	</form>
</div>
