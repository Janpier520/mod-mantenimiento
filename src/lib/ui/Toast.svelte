<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { getToasts, type ToastType } from '$lib/stores/toast.svelte';
	import X from '@lucide/svelte/icons/x';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';

	const { dismissToast } = getToasts();

	let { toast }: { toast: { id: string; message: string; type: ToastType } } = $props();

	let el: HTMLElement;

	const bgClass = $derived(
		toast.type === 'success'
			? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300'
			: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-300'
	);

	onMount(() => {
		gsap.fromTo(
			el,
			{ opacity: 0, x: 50, scale: 0.95 },
			{ opacity: 1, x: 0, scale: 1, duration: 0.25, ease: 'power2.out' }
		);
	});

	function handleDismiss() {
		if (!el) return;
		gsap.to(el, {
			opacity: 0,
			x: 50,
			scale: 0.95,
			duration: 0.2,
			ease: 'power3.out',
			onComplete: () => dismissToast(toast.id)
		});
	}
</script>

<div
	bind:this={el}
	class="pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg {bgClass}"
	role="alert"
>
	{#if toast.type === 'success'}
		<CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0" />
	{:else}
		<AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
	{/if}
	<p class="flex-1 text-sm font-medium">{toast.message}</p>
	<button
		onclick={handleDismiss}
		class="shrink-0 rounded-lg p-1 opacity-60 transition-opacity hover:opacity-100"
	>
		<X class="h-3.5 w-3.5" />
	</button>
</div>
