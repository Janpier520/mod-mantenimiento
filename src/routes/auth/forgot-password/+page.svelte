<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';

	let { form } = $props();
	let step = $state(1);
	let username = $state('');
	let error = $derived(form?.error || '');
	let logoEl: HTMLElement;
	let formEl: HTMLElement;

	onMount(() => {
		const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
		tl.fromTo(logoEl, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.4 }).fromTo(
			formEl,
			{ opacity: 0, y: 16 },
			{ opacity: 1, y: 0, duration: 0.35 },
			'-=0.15'
		);
	});
</script>

<div class="w-full max-w-sm px-4">
	<div bind:this={logoEl} class="mb-10 text-center">
		<div
			class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/25"
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
					d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
				/>
			</svg>
		</div>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Recuperar Contraseña</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			{step === 1 ? 'Ingresa tu usuario para empezar' : 'Responde las preguntas de seguridad'}
		</p>
	</div>

	<div bind:this={formEl}>
		{#if step === 1}
			<form method="POST" use:enhance>
				<div class="space-y-4">
					<div class="space-y-2">
						<label for="username" class="text-sm font-medium text-foreground"
							>Nombre de usuario</label
						>
						<Input
							id="username"
							name="username"
							type="text"
							required
							bind:value={username}
							placeholder="ej: admin"
						/>
					</div>

					{#if error}
						<div
							class="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
						>
							{error}
						</div>
					{/if}

					<Button type="submit" class="w-full">Continuar</Button>
				</div>
			</form>
		{/if}

		<div class="mt-6 text-center">
			<a href="/login" class="text-sm text-muted-foreground transition-colors hover:text-primary"
				>Volver al inicio de sesión</a
			>
		</div>
	</div>
</div>
