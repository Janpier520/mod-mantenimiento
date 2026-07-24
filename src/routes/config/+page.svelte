<script lang="ts">
	import { enhance } from '$app/forms';
	import { fade } from 'svelte/transition';
	import { addToast } from '$lib/stores/toast.svelte';

	let { data } = $props();

	// svelte-ignore state_referenced_locally — intentional: capture server data into local state
	let settings = $state(data.settings);
	let saving = $state(false);

	$effect(() => {
		settings = data.settings;
	});
</script>

<svelte:head>
	<title>Configuración — EquipLab</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">
			Parametrización General
		</h1>
		<p class="mt-1 text-sm text-muted-foreground">Parámetros generales del sistema</p>
	</div>

	<form
		method="post"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'success' && result.data?.success) {
					addToast('Configuración guardada correctamente');
					await update();
				}
			};
		}}
		class="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
	>
		<input type="hidden" name="_keys" value={settings.map((s) => s.key).join(',')} />

		{#each settings as setting}
			<div>
				<label
					for={setting.key}
					class="mb-1 block text-sm font-medium text-foreground"
				>
					{setting.descripcion}
				</label>
				<input
					id={setting.key}
					name={setting.key}
					type={setting.tipo}
					value={setting.value}
					class="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>
		{/each}

		<div class="flex justify-end">
			<button
				type="submit"
				disabled={saving}
				class="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
			>
				Guardar Cambios
			</button>
		</div>
	</form>
</div>
