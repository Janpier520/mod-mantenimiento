<script lang="ts">
	import { browser } from '$app/environment';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';
	import gsap from 'gsap';

	type FilterOption = { value: string; label: string };

	let {
		search = '',
		onsearch,
		filters = [],
		values = {} as Record<string, string>,
		onfilterchange,
		onremovechip,
		onclearall,
		children
	}: {
		search?: string;
		onsearch?: (value: string) => void;
		filters?: { key: string; label: string; options: FilterOption[] }[];
		values?: Record<string, string>;
		onfilterchange?: (key: string, value: string) => void;
		onremovechip?: (key: string) => void;
		onclearall?: () => void;
		children?: import('svelte').Snippet;
	} = $props();

	// Derive chips from current values prop (NOT from URL — avoids desync)
	let activeChips = $derived.by(() => {
		const chips: { key: string; label: string; value: string; display: string }[] = [];
		if (search) {
			chips.push({ key: 'search', label: 'Búsqueda', value: search, display: search });
		}
		for (const f of filters) {
			const val = values[f.key];
			if (val) {
				const opt = f.options.find((o) => o.value === val);
				chips.push({
					key: f.key,
					label: f.label,
					value: val,
					display: opt?.label ?? val
				});
			}
		}
		return chips;
	});

	// Stagger chip entrance when they change
	let chipContainerEl: HTMLElement | undefined = $state();
	$effect(() => {
		if (!browser || !chipContainerEl || activeChips.length === 0) return;
		const chips = chipContainerEl.querySelectorAll<HTMLElement>('[data-chip]');
		if (chips.length > 0) {
			gsap.fromTo(
				chips,
				{ opacity: 0, scale: 0.9 },
				{ opacity: 1, scale: 1, duration: 0.18, stagger: 0.025, ease: 'back.out(1.7)' }
			);
		}
	});
</script>

<div class="flex flex-wrap items-start gap-3">
	<!-- Search input -->
	<div class="relative w-full max-w-xs">
		<SearchIcon
			class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
		/>
		<input
			type="text"
			placeholder="Buscar..."
			value={search}
			oninput={(e) => onsearch?.((e.target as HTMLInputElement).value)}
			class="block w-full rounded-xl border border-border bg-card py-2 pr-4 pl-9 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
		/>
	</div>

	<!-- Dynamic filter selects -->
	{#each filters as f}
		<select
			value={values[f.key] ?? ''}
			onchange={(e) => onfilterchange?.(f.key, (e.target as HTMLSelectElement).value)}
			class="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 {values[
				f.key
			]
				? 'border-primary/40 bg-primary/5'
				: ''}"
		>
			<option value="">{f.label}</option>
			{#each f.options as opt}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</select>
	{/each}

	<!-- Slot for extra buttons (e.g. "Nuevo Ticket") -->
	{#if children}
		{@render children()}
	{/if}

	<!-- Clear all (only when any filter is active) -->
	{#if activeChips.length > 0}
		<button
			onclick={onclearall}
			class="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
		>
			<XIcon class="h-3.5 w-3.5" />
			Limpiar todo
		</button>
	{/if}
</div>

<!-- Active filter chips -->
{#if activeChips.length > 0}
	<div bind:this={chipContainerEl} class="flex flex-wrap items-center gap-2">
		{#each activeChips as chip (chip.key + chip.value)}
			<button
				data-chip
				onclick={() => onremovechip?.(chip.key)}
				class="filter-chip inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary transition-all duration-200 hover:border-primary/30 hover:bg-primary/10 active:scale-95"
				aria-label={`Quitar filtro: ${chip.label}`}
			>
				<span class="text-muted-foreground">{chip.label}:</span>
				<span class="font-semibold">{chip.display}</span>
				<XIcon class="h-3 w-3 shrink-0 text-primary/60 hover:text-primary" />
			</button>
		{/each}
	</div>
{/if}
