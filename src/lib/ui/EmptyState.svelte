<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';

	let { title, description, children }: { title: string; description?: string; children?: any } =
		$props();

	let el: HTMLElement;

	onMount(() => {
		gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
	});
</script>

<div bind:this={el} class="flex flex-col items-center justify-center py-16 text-center">
	{@render children?.()}
	<h3 class="text-base font-semibold text-foreground">{title}</h3>
	{#if description}
		<p class="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
	{/if}
</div>
