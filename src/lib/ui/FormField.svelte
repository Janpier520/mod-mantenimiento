<script lang="ts">
	import { browser } from '$app/environment';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import gsap from 'gsap';

	let {
		label,
		name,
		type = 'text',
		value = $bindable(),
		error = '',
		placeholder = '',
		required = false,
		disabled = false,
		options
	}: {
		label: string;
		name: string;
		type?: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'date' | 'password';
		value: string;
		error?: string;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		options?: { value: string; label: string }[];
	} = $props();

	let id = $derived(`field-${name}`);
	let errorEl: HTMLElement;

	// Emil + taste-skill: shake + fade on error, gate behind browser check
	$effect(() => {
		if (!browser || !errorEl || !error) return;
		// Kill any previous tweens to prevent accumulation on fast re-validation
		gsap.killTweensOf(errorEl);
		gsap.fromTo(
			errorEl,
			{ opacity: 0, y: -4 },
			{ opacity: 1, y: 0, duration: 0.2, ease: 'cubic-bezier(0.23, 1, 0.32, 1)' }
		);
		// taste-skill 4.5: shake the input for tactile feedback
		const inputEl = errorEl.parentElement?.querySelector('input, textarea, select');
		if (inputEl) {
			gsap.killTweensOf(inputEl);
			gsap.fromTo(
				inputEl,
				{ x: -4 },
				{
					x: 0,
					duration: 0.4,
					ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
					keyframes: [{ x: 4 }, { x: -3 }, { x: 2 }, { x: 0 }]
				}
			);
		}
	});
</script>

<div class="space-y-1.5">
	<Label for={id}>
		{label}
		{#if required}<span class="ml-0.5 text-destructive">*</span>{/if}
	</Label>

	{#if type === 'textarea'}
		<textarea
			{id}
			{name}
			bind:value
			{placeholder}
			{required}
			class="h-8 min-h-20 w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
			class:border-destructive={!!error}
			{disabled}></textarea>
	{:else if type === 'select'}
		<select
			{id}
			{name}
			bind:value
			{required}
			class="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
			class:border-destructive={!!error}
			{disabled}
		>
			{#if placeholder}
				<option value="" disabled>{placeholder}</option>
			{/if}
			{#each options ?? [] as opt}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</select>
	{:else}
		<Input
			{id}
			{name}
			{type}
			bind:value
			{placeholder}
			{required}
			class={error ? 'border-destructive' : ''}
			{disabled}
		/>
	{/if}

	{#if error}
		<p bind:this={errorEl} class="text-xs text-destructive">{error}</p>
	{/if}
</div>
