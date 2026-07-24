<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import SearchIcon from '@lucide/svelte/icons/search';
	import InboxIcon from '@lucide/svelte/icons/inbox';

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
		items: any[];
		loading?: boolean;
		search: string;
		onsearch: (value: string) => void;
		page: number;
		totalPages: number;
		total: number;
		onpagechange: (page: number) => void;
		children?: Snippet<[item: any]>;
		empty?: Snippet;
		cell?: Snippet<[item: any, column: { key: string; label: string }]>;
		hideSearch?: boolean;
	} = $props();
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

	<!-- Table -->
	<div class="overflow-hidden rounded-xl border border-border">
		<Table.Table>
			<Table.Header>
				<Table.Row>
					{#each columns as col}
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
					{#each { length: 5 } as _, i}
						<Table.Row class="animate-pulse">
							{#each columns as col}
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
								<div class="mx-auto flex max-w-xs flex-col items-center gap-2">
									<InboxIcon class="h-10 w-10 text-muted-foreground/40" />
									<p class="text-sm text-muted-foreground">No hay datos</p>
									<p class="text-xs text-muted-foreground/60">Agregá un registro para empezar</p>
								</div>
							{/if}
						</Table.Cell>
					</Table.Row>
				{:else}
					{#each items as item}
						<Table.Row class="hover:bg-primary/5">
							{#each columns as col}
								<Table.Cell>
									{#if cell}
										{@render cell(item, col)}
									{:else}
										{item[col.key] ?? ''}
									{/if}
								</Table.Cell>
							{/each}
							<Table.Cell class="text-right">
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
				<span class="text-sm text-muted-foreground">
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
