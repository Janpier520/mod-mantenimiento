<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';

	let { data, form } = $props();
	let error = $derived(form?.error || '');
	let success = $derived(form?.success || '');

	let username = $derived(data?.username || $page.url.searchParams.get('username') || '');

	let answer1 = $state('');
	let answer2 = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
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
					d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
				/>
			</svg>
		</div>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">Restablecer Contraseña</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Respondé las preguntas de seguridad y creá una nueva contraseña
		</p>
	</div>

	<div bind:this={formEl}>
		{#if success}
			<div class="space-y-4">
				<div
					class="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
				>
					{success}
				</div>
				<a href="/login" class="block">
					<Button class="w-full">Volver al inicio de sesión</Button>
				</a>
			</div>
		{:else}
			<form method="POST" action="?/reset" use:enhance>
				<input type="hidden" name="username" value={username} />

				<div class="space-y-4">
					<div class="space-y-2">
						<label for="answer1" class="text-sm font-medium text-foreground"
							>Pregunta de seguridad 1</label
						>
						<p class="text-sm text-muted-foreground">{data?.question1 || 'Cargando...'}</p>
						<Input
							id="answer1"
							name="answer1"
							type="text"
							required
							bind:value={answer1}
							placeholder="Tu respuesta"
						/>
					</div>

					<div class="space-y-2">
						<label for="answer2" class="text-sm font-medium text-foreground"
							>Pregunta de seguridad 2</label
						>
						<p class="text-sm text-muted-foreground">{data?.question2 || 'Cargando...'}</p>
						<Input
							id="answer2"
							name="answer2"
							type="text"
							required
							bind:value={answer2}
							placeholder="Tu respuesta"
						/>
					</div>

					<div class="space-y-2">
						<label for="newPassword" class="text-sm font-medium text-foreground"
							>Nueva contraseña</label
						>
						<Input
							id="newPassword"
							name="newPassword"
							type="password"
							required
							minlength={6}
							bind:value={newPassword}
							placeholder="Mínimo 6 caracteres"
						/>
					</div>

					<div class="space-y-2">
						<label for="confirmPassword" class="text-sm font-medium text-foreground"
							>Confirmar contraseña</label
						>
						<Input
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							required
							bind:value={confirmPassword}
							placeholder="Repetí la contraseña"
						/>
					</div>

					{#if error}
						<div
							class="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
						>
							{error}
						</div>
					{/if}

					<Button type="submit" class="w-full">Restablecer Contraseña</Button>
				</div>
			</form>

			<div class="mt-6 text-center">
				<a href="/login" class="text-sm text-muted-foreground transition-colors hover:text-primary"
					>Volver al inicio de sesión</a
				>
			</div>
		{/if}
	</div>
</div>
