<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { getToasts, type ToastType } from '$lib/stores/toast.svelte';
	import X from '@lucide/svelte/icons/x';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';

	const { dismissToast, pauseAutoDismiss, resumeAutoDismiss } = getToasts();

	let {
		toast
	}: {
		toast: { id: string; message: string; type: ToastType; duration: number };
	} = $props();

	let el: HTMLElement;
	let progressEl: HTMLElement;
	let progressTween: gsap.core.Tween | null = null;

	// ── Per-type styling — bolder colors + ring accents ──────────
	const style = $derived(
		toast.type === 'success'
			? {
					bg: 'bg-emerald-50 dark:bg-emerald-950/90',
					border: 'border-emerald-200 dark:border-emerald-800',
					text: 'text-emerald-800 dark:text-emerald-300',
					icon: CheckCircle2,
					bar: 'bg-emerald-400 dark:bg-emerald-600'
				}
			: {
					bg: 'bg-red-50 dark:bg-red-950/90',
					border: 'border-red-200 dark:border-red-800',
					text: 'text-red-800 dark:text-red-300',
					icon: AlertCircle,
					bar: 'bg-red-400 dark:bg-red-600'
				}
	);

	const IconCmp = $derived(style.icon);

	onMount(() => {
		// Emil: scale(0.95) + opacity entrance — never from scale(0)
		gsap.fromTo(
			el,
			{ opacity: 0, x: 50, scale: 0.95 },
			{ opacity: 1, x: 0, scale: 1, duration: 0.25, ease: 'cubic-bezier(0.23, 1, 0.32, 1)' }
		);

		// Emil: progress bar — linear timing to match the timer exactly
		if (progressEl && toast.duration > 0) {
			progressTween = gsap.fromTo(
				progressEl,
				{ scaleX: 1, transformOrigin: 'left center' },
				{
					scaleX: 0,
					duration: toast.duration / 1000,
					ease: 'none',
					transformOrigin: 'left center'
				}
			);
		}
	});

	function handleDismiss() {
		if (!el) return;
		progressTween?.kill();
		// Emil: exit faster than enter
		gsap.to(el, {
			opacity: 0,
			x: 50,
			scale: 0.95,
			duration: 0.15,
			ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
			onComplete: () => dismissToast(toast.id)
		});
	}

	// ── Pause/resume on hover (Emil: invisible details) ────────────
	function handlePointerEnter() {
		progressTween?.pause();
		pauseAutoDismiss(toast.id);
	}

	function handlePointerLeave() {
		progressTween?.resume();
		resumeAutoDismiss(toast.id);
	}

	// ── Swipe-to-dismiss gesture ────────────────────────────────────
	let isSwiping = $state(false);
	let swipeStartX = 0;
	let swipeStartY = 0;
	let dragStartTime = 0;

	function handlePointerDown(e: PointerEvent) {
		isSwiping = true;
		swipeStartX = e.clientX;
		swipeStartY = e.clientY;
		dragStartTime = Date.now();
		el.setPointerCapture(e.pointerId);
		progressTween?.pause();
		pauseAutoDismiss(toast.id);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isSwiping) return;
		const dx = e.clientX - swipeStartX;
		const dy = e.clientY - swipeStartY;
		// Horizontal swipe only (ignore mostly-vertical drags)
		if (Math.abs(dx) > Math.abs(dy) + 10) {
			gsap.set(el, {
				x: dx,
				opacity: 1 - Math.min(Math.abs(dx) / 300, 0.8)
			});
		} else {
			isSwiping = false;
			el.releasePointerCapture(e.pointerId);
		}
	}

	function handlePointerUp(e: PointerEvent) {
		if (!isSwiping) return;
		isSwiping = false;
		const dx = e.clientX - swipeStartX;
		// Emil: momentum-based dismissal — quick flick dismisses regardless of distance
		const elapsed = Math.max(1, Date.now() - dragStartTime);
		const velocity = Math.abs(dx) / elapsed;

		if (Math.abs(dx) > 80 || velocity > 0.11) {
			// Commit dismiss
			gsap.to(el, {
				x: dx > 0 ? 400 : -400,
				opacity: 0,
				duration: 0.2,
				ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
				onComplete: () => dismissToast(toast.id)
			});
		} else {
			// Snap back
			gsap.to(el, {
				x: 0,
				opacity: 1,
				duration: 0.3,
				ease: 'cubic-bezier(0.23, 1, 0.32, 1)'
			});
			progressTween?.resume();
			resumeAutoDismiss(toast.id);
		}
		try {
			el.releasePointerCapture(e.pointerId);
		} catch {}
	}
</script>

<div
	bind:this={el}
	class="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border shadow-lg {style.bg} {style.border} {style.text} select-none"
	role="alert"
	tabindex="0"
	style="touch-action: pan-y;"
	onpointerenter={handlePointerEnter}
	onpointerleave={handlePointerLeave}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerUp}
>
	<!-- Progress bar -->
	<div
		bind:this={progressEl}
		class="absolute bottom-0 left-0 h-0.5 w-full origin-left {style.bar} rounded-full opacity-60"
	></div>

	<div class="z-10 flex items-start gap-3 px-4 py-3">
		<IconCmp class="mt-0.5 h-4 w-4 shrink-0" />
		<p class="flex-1 text-sm font-medium">{toast.message}</p>
		<button
			onclick={handleDismiss}
			class="shrink-0 rounded-lg p-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
		>
			<X class="h-3.5 w-3.5" />
		</button>
	</div>
</div>
