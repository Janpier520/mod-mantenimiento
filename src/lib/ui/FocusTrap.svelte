<script lang="ts">
	import { browser } from '$app/environment';

	let {
		active = false,
		children
	}: {
		active?: boolean;
		children?: import('svelte').Snippet;
	} = $props();

	let containerEl: HTMLElement;

	/** Selector for all focusable elements */
	const FOCUSABLE =
		'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

	function getFocusable(): HTMLElement[] {
		if (!containerEl) return [];
		return Array.from(containerEl.querySelectorAll<HTMLElement>(FOCUSABLE));
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key !== 'Tab') return;
		const focusable = getFocusable();
		if (focusable.length === 0) return;

		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		if (e.shiftKey) {
			// Shift+Tab: if focus is on first element, wrap to last
			if (document.activeElement === first) {
				e.preventDefault();
				last.focus();
			}
		} else {
			// Tab: if focus is on last element, wrap to first
			if (document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	/** The element that had focus before the trap activated */
	let previousFocus: HTMLElement | null = null;

	// Activate/deactivate focus trap
	$effect(() => {
		if (!browser) return;

		if (active && containerEl) {
			// Save currently focused element to restore later
			previousFocus = document.activeElement as HTMLElement | null;

			// Focus the first focusable element
			const focusable = getFocusable();
			if (focusable.length > 0) {
				// Small delay to let the DOM settle (Svelte conditional rendering)
				requestAnimationFrame(() => {
					focusable[0].focus();
				});
			} else {
				// If no focusable elements, focus the container itself
				requestAnimationFrame(() => {
					containerEl?.focus();
				});
			}

			// Add the keyboard listener
			document.addEventListener('keydown', handleKeydown);

			return () => {
				document.removeEventListener('keydown', handleKeydown);
				// Restore focus to the trigger element when trap deactivates
				if (previousFocus && typeof previousFocus.focus === 'function') {
					previousFocus.focus();
				}
			};
		}
	});
</script>

<div bind:this={containerEl} class="contents">
	{@render children()}
</div>
