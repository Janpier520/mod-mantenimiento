<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import DataTable from '$lib/ui/DataTable.svelte';
	import FilterBar from '$lib/ui/FilterBar.svelte';
	import Badge from '$lib/ui/Badge.svelte';
	import { Button } from '$lib/components/ui/button';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	let movements = $state(data.movements);
	// svelte-ignore state_referenced_locally
	let items = $state(data.items);
	// svelte-ignore state_referenced_locally
	let total = $state(data.total);
	// svelte-ignore state_referenced_locally
	let currentPage = $state(data.page);
	// svelte-ignore state_referenced_locally
	let totalPages = $state(data.totalPages);
	// svelte-ignore state_referenced_locally
	let filterItemId = $state(data.filterItemId);
	// svelte-ignore state_referenced_locally
	let filterTipo = $state(data.filterTipo);

	const columns = [
		{ key: 'created_at', label: 'Fecha' },
		{ key: 'item_name', label: 'Ítem' },
		{ key: 'tipo', label: 'Tipo' },
		{ key: 'cantidad', label: 'Cantidad' },
		{ key: 'motivo', label: 'Motivo' },
		{ key: 'usuario_nombre', label: 'Usuario' }
	];

	const tipoBadgeVariant: Record<string, 'success' | 'warning' | 'info'> = {
		entrada: 'success',
		salida: 'warning',
		ajuste: 'info'
	};

	const tipoLabels: Record<string, string> = {
		entrada: 'Entrada',
		salida: 'Salida',
		ajuste: 'Ajuste'
	};

	function formatDate(iso: string): string {
		if (!iso) return '';
		return new Date(iso).toLocaleDateString('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function mapMovements(movs: typeof movements) {
		return movs.map((m) => {
			const item = items.find((i) => i.id === m.inventory_item_id);
			return {
				...m,
				item_name: item?.nombre ?? '—',
				usuario_nombre: m.usuario_id ? '—' : 'Sistema'
			};
		});
	}

	async function reload() {
		const params = new SvelteURLSearchParams();
		if (filterItemId) params.set('item', filterItemId);
		if (filterTipo) params.set('tipo', filterTipo);
		if (currentPage > 1) params.set('page', String(currentPage));
		const qs = params.toString();
		const url = qs ? `${$page.url.pathname}?${qs}` : $page.url.pathname;
		await goto(resolve(url as '/inventario/movimientos'), {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}

	async function handlePageChange(newPage: number) {
		currentPage = newPage;
		await reload();
	}

	$effect(() => {
		movements = data.movements;
		items = data.items;
		total = data.total;
		currentPage = data.page;
		totalPages = data.totalPages;
		filterItemId = data.filterItemId;
		filterTipo = data.filterTipo;
	});
</script>

{#snippet cell(item: ReturnType<typeof mapMovements>[number], col: { key: string })}
	{#if col.key === 'created_at'}
		{formatDate(item.created_at)}
	{:else if col.key === 'tipo'}
		<Badge
			text={tipoLabels[item.tipo] ?? item.tipo}
			variant={tipoBadgeVariant[item.tipo] ?? 'default'}
		/>
	{:else}
		{(item as unknown as Record<string, unknown>)[col.key] ?? ''}
	{/if}
{/snippet}

<svelte:head>
	<title>Movimientos de Inventario — Módulo Mantenimiento de Equipos</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<Button href="/inventario" variant="ghost" size="icon" aria-label="Volver">
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-foreground">Movimientos de Inventario</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Historial de entradas, salidas y ajustes de stock
			</p>
		</div>
	</div>

	<!-- Filter bar -->
	<FilterBar
		search=""
		onsearch={() => {}}
		values={{
			item: filterItemId,
			tipo: filterTipo
		}}
		filters={[
			{
				key: 'item',
				label: 'Ítem',
				options: items.map((i) => ({ value: i.id, label: i.nombre }))
			},
			{
				key: 'tipo',
				label: 'Tipo',
				options: [
					{ value: 'entrada', label: 'Entrada' },
					{ value: 'salida', label: 'Salida' },
					{ value: 'ajuste', label: 'Ajuste' }
				]
			}
		]}
		onfilterchange={(key, value) => {
			if (key === 'item') filterItemId = value;
			if (key === 'tipo') filterTipo = value;
			currentPage = 1;
			reload();
		}}
		onremovechip={(key) => {
			if (key === 'item') filterItemId = '';
			if (key === 'tipo') filterTipo = '';
			currentPage = 1;
			reload();
		}}
		onclearall={() => {
			filterItemId = '';
			filterTipo = '';
			currentPage = 1;
			goto($page.url.pathname, { keepFocus: true, noScroll: true, replaceState: true });
		}}
	/>

	<!-- DataTable -->
	<DataTable
		{columns}
		items={mapMovements(movements)}
		page={currentPage}
		{totalPages}
		{total}
		search=""
		onsearch={() => {}}
		onpagechange={handlePageChange}
		hideSearch
		{cell}
	/>
</div>
