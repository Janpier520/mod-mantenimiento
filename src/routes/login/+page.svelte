<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';

	let { form } = $props();

	let username = $state('');
	let password = $state('');
	let error = $derived(form?.error || '');

	let logoEl: HTMLElement;
	let formEl: HTMLElement;
	let footerEl: HTMLElement;

	onMount(() => {
		const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
		tl.fromTo(
			logoEl,
			{ opacity: 0, y: -20, scale: 0.96 },
			{ opacity: 1, y: 0, scale: 1, duration: 0.5 }
		)
			.fromTo(formEl, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4 }, '-=0.2')
			.fromTo(
				formEl.querySelectorAll('input'),
				{ opacity: 0, x: -8 },
				{ opacity: 1, x: 0, duration: 0.3, stagger: 0.08 },
				'-=0.15'
			)
			.fromTo(footerEl, { opacity: 0 }, { opacity: 1, duration: 0.3 }, '-=0.15');
	});
</script>

<div class="w-full max-w-sm px-4">
	<!-- Logo -->
	<div bind:this={logoEl} class="mb-10 text-center">
		<div
			class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-700 shadow-lg ring-1 ring-white/10"
		>
			<svg
				class="h-6 w-6 text-white"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				stroke-width="1.5"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
				/>
			</svg>
		</div>
		<h1 class="text-3xl font-extrabold tracking-tight text-foreground">
			Módulo Mantenimiento de Equipos
		</h1>
		<p class="mt-1.5 text-sm text-muted-foreground">
			Gestiona tu laboratorio, equipos y mantenimiento desde un solo lugar
		</p>
	</div>

	<!-- Form -->
	<div bind:this={formEl}>
		<form method="POST" action="?/login" use:enhance>
			<div class="space-y-4">
				<div class="space-y-2">
					<label for="username" class="text-sm font-medium text-foreground">Usuario</label>
					<Input
						id="username"
						name="username"
						type="text"
						autocomplete="username"
						required
						bind:value={username}
						placeholder="Ingresa tu usuario"
					/>
				</div>

				<div class="space-y-2">
					<label for="password" class="text-sm font-medium text-foreground">Contraseña</label>
					<Input
						id="password"
						name="password"
						type="password"
						autocomplete="current-password"
						required
						bind:value={password}
						placeholder="Ingresa tu contraseña"
					/>
				</div>

				{#if error}
					<div class="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
						{error}
					</div>
				{/if}

				<Button type="submit" class="w-full shadow-lg hover:shadow-xl">Iniciar Sesión</Button>
			</div>
		</form>
	</div>

	<!-- Footer -->
	<div bind:this={footerEl} class="mt-8 text-center">
		<a
			href="/auth/forgot-password"
			class="text-sm text-muted-foreground underline-offset-2 transition-colors hover:text-primary hover:underline"
		>
			¿Olvidaste tu contraseña?
		</a>
	</div>
</div>
