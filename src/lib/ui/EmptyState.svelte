<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import Inbox from '@lucide/svelte/icons/inbox';

	let {
		title,
		description,
		children
	}: {
		title: string;
		description?: string;
		children?: any;
	} = $props();

	let el: HTMLElement;
	let iconEl: HTMLElement;

	onMount(() => {
		const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
		tl.fromTo(
			iconEl,
			{ opacity: 0, scale: 0.85, rotate: -5 },
			{ opacity: 1, scale: 1, rotate: 0, duration: 0.4 }
		)
			.fromTo(
				el.querySelector('h3'),
				{ opacity: 0, y: 8 },
				{ opacity: 1, y: 0, duration: 0.3 },
				'-=0.15'
			)
			.fromTo(
				el.querySelector('p'),
				{ opacity: 0, y: 6 },
				{ opacity: 1, y: 0, duration: 0.25 },
				'-=0.1'
			);
	});
</script>

<div bind:this={el} class="flex flex-col items-center justify-center py-16 text-center">
	{#if children}
		{@render children()}
	{:else}
		<div
			bind:this={iconEl}
			class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 ring-1 ring-border"
		>
			<Inbox class="h-7 w-7 text-muted-foreground/40" />
		</div>
	{/if}
	<h3 class="text-base font-semibold text-foreground">{title}</h3>
	{#if description}
		<p class="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
	{/if}
</div>
