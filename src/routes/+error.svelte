<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Home from '@lucide/svelte/icons/home';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';

	let iconEl: HTMLElement;
	let textEl: HTMLElement;
	let actionsEl: HTMLElement;

	let is404 = $derived($page.status === 404);

	let title = $derived(is404 ? 'Página no encontrada' : 'Algo salió mal');
	let description = $derived(
		is404
			? 'La página que buscas no existe o fue movida. Revisá la URL o volvé al inicio.'
			: 'Ocurrió un error inesperado. No te preocupes, nuestro equipo ya fue notificado.'
	);
	let code = $derived(String($page.status));

	onMount(() => {
		// Respect prefers-reduced-motion
		if (
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches
		)
			return;
		const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
		tl.fromTo(iconEl, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5 })
			.fromTo(textEl, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4 }, '-=0.25')
			.fromTo(actionsEl, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35 }, '-=0.15');
	});
</script>

<svelte:head>
	<title>{$page.status} — EquipLab</title>
</svelte:head>

<div class="bg-grain flex flex-col items-center justify-center bg-surface px-4 py-12">
	<div class="w-full max-w-md text-center">
		<!-- Error icon with status code -->
		<div bind:this={iconEl} class="mb-8">
			<div
				class="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl {is404
					? 'bg-amber-100 dark:bg-amber-900/30'
					: 'bg-red-100 dark:bg-red-900/30'}"
			>
				<span
					class="text-4xl font-extrabold tracking-tight {is404
						? 'text-amber-600 dark:text-amber-400'
						: 'text-red-600 dark:text-red-400'}"
				>
					{code}
				</span>
			</div>
		</div>

		<!-- Text content -->
		<div bind:this={textEl}>
			<!-- Brand logo -->
			<div class="mb-4 flex items-center justify-center gap-2">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-sm shadow-primary/30"
				>
					<svg
						class="h-4 w-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
						/>
					</svg>
				</div>
				<span class="text-sm font-bold tracking-tight text-foreground">EquipLab</span>
			</div>

			<h1 class="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
				{title}
			</h1>
			<p class="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
				{description}
			</p>

			{#if !is404 && $page.error}
				<div class="mx-auto mt-4 max-w-sm rounded-lg bg-muted px-4 py-2.5">
					<p class="text-xs text-muted-foreground">
						{$page.error.message}
					</p>
				</div>
			{/if}

			{#if browser && !is404}
				<p class="mt-3 text-xs text-muted-foreground/60">
					Si el problema persiste, contactá a soporte.
				</p>
			{/if}
		</div>

		<!-- Actions -->
		<div
			bind:this={actionsEl}
			class="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
		>
			<Button variant="default" onclick={() => window.history.back()} class="w-full sm:w-auto">
				<ArrowLeft class="h-4 w-4" />
				Volver atrás
			</Button>
			<Button variant="outline" href="/" class="w-full sm:w-auto">
				<Home class="h-4 w-4" />
				Ir al inicio
			</Button>
			{#if browser && !is404}
				<Button variant="ghost" onclick={() => window.location.reload()} class="w-full sm:w-auto">
					<RefreshCw class="h-4 w-4" />
					Reintentar
				</Button>
			{/if}
		</div>
	</div>
</div>
