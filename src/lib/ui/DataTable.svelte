<script lang="ts" generics="T extends Record<string, unknown>">
	import type { Snippet } from 'svelte';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import SearchIcon from '@lucide/svelte/icons/search';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import gsap from 'gsap';

	let {
		columns,
		items,
		loading = false,
		search = $bindable(),
		onsearch,
		page,
		totalPages,
		total,
		onpagechange,
		children,
		empty,
		cell,
		hideSearch = false
	}: {
		columns: { key: string; label: string; sortable?: boolean }[];
		items: T[];
		loading?: boolean;
		search: string;
		onsearch: (value: string) => void;
		page: number;
		totalPages: number;
		total: number;
		onpagechange: (page: number) => void;
		children?: Snippet<[item: T]>;
		empty?: Snippet;
		cell?: Snippet<[item: T, column: { key: string; label: string }]>;
		hideSearch?: boolean;
	} = $props();

	let tableWrapperEl: HTMLElement;

	// Reactive stagger: re-triggers when items change (pagination, search)
	$effect(() => {
		if (items.length > 0 && tableWrapperEl) {
			const tbody = tableWrapperEl.querySelector('tbody');
			if (!tbody) return;
			const rows = tbody.querySelectorAll('tr');
			if (rows.length > 0) {
				gsap.fromTo(
					rows,
					{ opacity: 0, y: 6 },
					{ opacity: 1, y: 0, duration: 0.25, stagger: 0.03, ease: 'power2.out' }
				);
			}
		}
	});
</script>

<div class="space-y-4">
	<!-- Search toolbar -->
	{#if !hideSearch}
		<div class="relative w-full max-w-xs">
			<SearchIcon
				class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				type="text"
				placeholder="Buscar..."
				bind:value={search}
				oninput={() => onsearch(search)}
				class="pl-9!"
			/>
		</div>
	{/if}

	<!-- Table (with horizontal scroll on mobile) -->
	<div
		bind:this={tableWrapperEl}
		class="table-card-mobile overflow-x-auto rounded-xl border border-border shadow-sm"
	>
		<Table.Table>
			<Table.Header class="sticky top-0 z-10">
				<Table.Row class="bg-muted/80 backdrop-blur-sm">
					{#each columns as col (col.key)}
						<Table.Head
							class="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
						>
							{col.label}
						</Table.Head>
					{/each}
					<Table.Head
						class="text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase"
					>
						Acciones
					</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#if loading}
					{#each [0, 1, 2, 3, 4] as n (n)}
						<Table.Row class="animate-pulse">
							{#each columns as col (col.key)}
								<Table.Cell>
									<div class="h-4 w-3/4 rounded bg-muted"></div>
								</Table.Cell>
							{/each}
							<Table.Cell>
								<div class="ml-auto h-4 w-12 rounded bg-muted"></div>
							</Table.Cell>
						</Table.Row>
					{/each}
				{:else if items.length === 0}
					<Table.Row>
						<Table.Cell colspan={columns.length + 1} class="py-16 text-center">
							{#if empty}
								{@render empty()}
							{:else}
								<div class="mx-auto flex max-w-xs flex-col items-center gap-3">
									<div
										class="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 ring-1 ring-border"
									>
										<InboxIcon class="h-6 w-6 text-muted-foreground/40" />
									</div>
									<div>
										<p class="text-sm font-medium text-foreground">No hay datos</p>
										<p class="mt-0.5 text-xs text-muted-foreground/60">
											Agrega un registro para empezar
										</p>
									</div>
								</div>
							{/if}
						</Table.Cell>
					</Table.Row>
				{:else}
					{#each items as item (item.id)}
						<Table.Row
							tabindex={0}
							class="group cursor-pointer transition-[background-color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] even:bg-muted/20 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring active:scale-[0.999]"
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									const firstAction = e.currentTarget.querySelector(
										'button, a, [tabindex]:not([tabindex="-1"])'
									);
									if (firstAction) (firstAction as HTMLElement).focus();
								}
							}}
						>
							{#each columns as col (col.key)}
								<Table.Cell
									data-label={col.label}
									class="transition-colors duration-150 group-hover:text-foreground"
								>
									{#if cell}
										{@render cell(item, col)}
									{:else}
										{item[col.key] ?? ''}
									{/if}
								</Table.Cell>
							{/each}
							<Table.Cell
								data-label="Acciones"
								class="text-right opacity-0 transition-opacity duration-150 group-hover:opacity-100"
							>
								{#if children}{@render children(item)}{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				{/if}
			</Table.Body>
		</Table.Table>
	</div>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="flex items-center justify-between gap-2 pt-1">
			<p class="text-sm text-muted-foreground">
				{total} registro{total !== 1 ? 's' : ''}
			</p>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={page <= 1}
					onclick={() => onpagechange(page - 1)}
				>
					<ChevronLeftIcon class="h-4 w-4" />
					<span class="hidden sm:inline">Anterior</span>
				</Button>
				<span class="rounded-md bg-muted px-3 py-1.5 text-sm text-muted-foreground">
					Pág {page} de {totalPages}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={page >= totalPages}
					onclick={() => onpagechange(page + 1)}
				>
					<span class="hidden sm:inline">Siguiente</span>
					<ChevronRightIcon class="h-4 w-4" />
				</Button>
			</div>
		</div>
	{/if}
</div>
