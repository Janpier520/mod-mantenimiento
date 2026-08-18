<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PathnameWithSearchOrHash, ResolvedPathname } from '$app/types';
	import { page } from '$app/stores';
	import gsap from 'gsap';
	import type { NavItem, UserRole } from '$lib/types';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Package from '@lucide/svelte/icons/package';
	import Ticket from '@lucide/svelte/icons/ticket';
	import Wrench from '@lucide/svelte/icons/wrench';
	import Building2 from '@lucide/svelte/icons/building-2';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Users from '@lucide/svelte/icons/users';
	import Settings from '@lucide/svelte/icons/settings';
	import History from '@lucide/svelte/icons/history';
	import Shapes from '@lucide/svelte/icons/shapes';
	import Search from '@lucide/svelte/icons/search';
	import Command from '@lucide/svelte/icons/command';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Plus from '@lucide/svelte/icons/plus';
	import Home from '@lucide/svelte/icons/home';

	let { userRole }: { userRole?: UserRole } = $props();

	let open = $state(false);
	let query = $state('');
	let selectedIndex = $state(0);
	let inputEl: HTMLInputElement | undefined = $state();
	let overlayEl: HTMLElement | undefined = $state();
	let panelEl: HTMLElement | undefined = $state();
	let paletteEl: HTMLElement | undefined = $state();
	let previouslyFocused: HTMLElement | null = null;

	const iconMap: Record<string, typeof LayoutDashboard> = {
		dashboard: LayoutDashboard,
		equipos: Package,
		tickets: Ticket,
		mantenimiento: Wrench,
		proveedores: Building2,
		reportes: BarChart3,
		usuarios: Users,
		config: Settings,
		sessions: History,
		tipos: Shapes
	};

	// ─── Navigation items ──────────────────────────────────────────────────────
	const allItems: (NavItem & { icon: string })[] = [
		{ label: 'Dashboard', icon: 'dashboard', href: '/' },
		{ label: 'Equipos', icon: 'equipos', href: '/equipos' },
		{ label: 'Tickets', icon: 'tickets', href: '/tickets' },
		{ label: 'Mantenimiento', icon: 'mantenimiento', href: '/mantenimiento' },
		{
			label: 'Proveedores',
			icon: 'proveedores',
			href: '/proveedores',
			roles: ['admin', 'consultor']
		},
		{
			label: 'Reportes',
			icon: 'reportes',
			href: '/reportes',
			roles: ['admin', 'consultor']
		},
		{
			label: 'Usuarios',
			icon: 'usuarios',
			href: '/usuarios',
			roles: ['admin']
		},
		{ label: 'Configuración', icon: 'config', href: '/config', roles: ['admin'] },
		{ label: 'Tipos de Equipo', icon: 'tipos', href: '/equipos/tipos', roles: ['admin'] },
		{ label: 'Mis Sesiones', icon: 'sessions', href: '/sessions' }
	];

	// ─── Action items — acceso rápido a creación + navegación clave ─────────────
	interface ActionItem {
		label: string;
		icon: string;
		action: string;
		href: PathnameWithSearchOrHash;
		roles?: UserRole[];
	}

	type PaletteItem = (NavItem | ActionItem) & {
		__type?: 'nav' | 'action';
		__section?: 'nav' | 'actions';
	};

	const actionItems: ActionItem[] = [
		{
			label: 'Volver al Dashboard',
			icon: 'home',
			action: 'navigate',
			href: '/'
		},
		{
			label: 'Nuevo Ticket',
			icon: 'plusTicket',
			action: 'create',
			href: '/tickets?nuevo=true'
		},
		{
			label: 'Nuevo Equipo',
			icon: 'plusEquipo',
			action: 'create',
			href: '/equipos?nuevo=true'
		},
		{
			label: 'Nuevo Proveedor',
			icon: 'plusProveedor',
			action: 'create',
			href: '/proveedores?nuevo=true',
			roles: ['admin', 'consultor']
		},
		{
			label: 'Nuevo Usuario',
			icon: 'plusUser',
			action: 'create',
			href: '/usuarios?nuevo=true',
			roles: ['admin']
		}
	];

	let filteredSections = $derived.by(() => {
		const q = query.toLowerCase();

		const filteredNav = allItems.filter(
			(item) =>
				(!item.roles || (userRole && item.roles.includes(userRole))) &&
				(!q || item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q))
		);

		const filteredActions = actionItems.filter(
			(item) =>
				(!item.roles || (userRole && item.roles.includes(userRole))) &&
				(!q || item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q))
		);

		// If there's a search query, merge everything together
		if (q) {
			const merged: PaletteItem[] = [
				...filteredNav.map((i) => ({ ...i, __type: 'nav' as const })),
				...filteredActions.map((i) => ({ ...i, __type: 'action' as const }))
			].slice(0, 8);
			// Return flat result in a single section
			return {
				hasQuery: true,
				merged,
				navCount: filteredNav.length,
				actionCount: filteredActions.length
			};
		}

		return {
			hasQuery: false,
			navItems: filteredNav.slice(0, 8),
			actionItems: filteredActions.slice(0, 4),
			navCount: filteredNav.length,
			actionCount: filteredActions.length
		};
	});

	let flatItems = $derived.by((): PaletteItem[] => {
		if (filteredSections.hasQuery) {
			return filteredSections.merged ?? [];
		}
		return [
			...(filteredSections.actionItems ?? []).map((i) => ({ ...i, __section: 'actions' as const })),
			...(filteredSections.navItems ?? []).map((i) => ({ ...i, __section: 'nav' as const }))
		];
	});

	let filteredItems = $derived(flatItems.slice(0, 12));

	// Keyboard listener: only Ctrl+K / Cmd+K opens the palette. Browser-default
	// shortcuts (Ctrl+T, Ctrl+N, Ctrl+P, etc.) are left untouched.
	function handleKeydown(e: KeyboardEvent) {
		// Ctrl+K / Cmd+K → open/close palette
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			if (open) close();
			else openPalette();
			return;
		}

		// Escape → close palette
		if (e.key === 'Escape' && open) {
			e.preventDefault();
			close();
			return;
		}
	}

	// Keyboard navigation within palette
	function handlePaletteKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, filteredItems.length - 1);
			scrollIntoView();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
			scrollIntoView();
		} else if (e.key === 'Tab') {
			e.preventDefault();
		} else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
			e.preventDefault();
			navigate(filteredItems[selectedIndex].href);
		}
	}

	function scrollIntoView() {
		const el = document.querySelector('[data-palette-index="' + selectedIndex + '"]');
		el?.scrollIntoView({ block: 'nearest' });
	}

	function openPalette() {
		open = true;
		query = '';
		selectedIndex = 0;
		previouslyFocused =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		// Animate entrance + focus. Focus the dialog container first (tabindex=-1
		// keeps focus inside the dialog), then the search input for immediate typing.
		requestAnimationFrame(() => {
			paletteEl?.focus();
			inputEl?.focus();
			gsap.fromTo(
				panelEl!,
				{ opacity: 0, scale: 0.96 },
				{ opacity: 1, scale: 1, duration: 0.15, ease: 'cubic-bezier(0.23, 1, 0.32, 1)' }
			);
			gsap.fromTo(overlayEl!, { opacity: 0 }, { opacity: 1, duration: 0.1 });
		});
	}

	function restoreFocus() {
		previouslyFocused?.focus();
		previouslyFocused = null;
	}

	function close() {
		if (!open) return;
		gsap.to(panelEl!, {
			opacity: 0,
			scale: 0.96,
			duration: 0.12,
			ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
			onComplete: () => {
				open = false;
				query = '';
				restoreFocus();
			}
		});
		gsap.to(overlayEl!, {
			opacity: 0,
			duration: 0.1,
			ease: 'linear'
		});
	}

	function navigate(href: PathnameWithSearchOrHash | ResolvedPathname) {
		close();
		// Small delay so close animation plays before navigation
		// ponytail: resolve() can't be typed for dynamic query-bearing hrefs
		// (candidate route union is not assignable), so bypass the check.
		// @ts-expect-error - dynamic PathnameWithSearchOrHash arg
		setTimeout(() => goto(resolve(href)), 100);
	}

	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});
</script>

{#if open}
	<div
		bind:this={overlayEl}
		bind:this={paletteEl}
		class="fixed inset-0 z-[999] flex items-start justify-center bg-black/30 pt-[15vh] backdrop-blur-sm"
		style="opacity: 1"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) close();
		}}
		onkeydown={handlePaletteKeydown}
		role="dialog"
		aria-modal="true"
		aria-label="Búsqueda global"
	>
		<div
			bind:this={panelEl}
			class="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/20"
			style="opacity: 1; transform: scale(1)"
		>
			<!-- Search input -->
			<div class="flex items-center gap-3 border-b border-border px-4">
				<Search class="h-4 w-4 shrink-0 text-muted-foreground" />
				<input
					bind:this={inputEl}
					type="text"
					placeholder="Busca páginas o acciones..."
					bind:value={query}
					onkeydown={handlePaletteKeydown}
					class="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
				/>
				<div
					class="flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-1"
				>
					<Command class="h-3 w-3 text-muted-foreground" />
					<span class="text-xs font-medium text-muted-foreground">K</span>
				</div>
			</div>

			<!-- Results -->
			<div class="max-h-80 overflow-y-auto px-2 py-3">
				{#if filteredItems.length === 0}
					<div class="flex flex-col items-center gap-2 px-4 py-8 text-center">
						<Search class="h-8 w-8 text-muted-foreground/30" />
						<p class="text-sm text-muted-foreground">
							No se encontraron resultados para "<span class="font-medium text-foreground"
								>{query}</span
							>"
						</p>
					</div>
				{:else}
					{#if !query}
						<!-- ── Acciones rápidas ── -->
						<p
							class="mb-2 px-3 text-[10px] font-semibold tracking-widest text-muted-foreground/50 uppercase"
						>
							Acciones rápidas
						</p>
						<ul class="mb-3 space-y-0.5">
							{#each filteredItems.filter((i) => i.__section === 'actions') as item, ai (item.href)}
								{@const idx = ai}
								{@const ActionIcon = item.icon === 'home' ? Home : Plus}
								<li>
									<button
										data-palette-index={idx}
										onclick={() => navigate(item.href)}
										onmouseenter={() => (selectedIndex = idx)}
										class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors {idx ===
										selectedIndex
											? 'bg-primary/10 text-primary'
											: 'text-foreground hover:bg-muted'}"
									>
										<ActionIcon
											class="h-4 w-4 shrink-0 {idx === selectedIndex
												? 'text-primary'
												: 'text-muted-foreground'}"
										/>
										<div class="flex-1 text-left">
											<span class="font-medium">{item.label}</span>
										</div>
										<div
											class="flex h-5 w-5 items-center justify-center rounded border border-border {idx ===
											selectedIndex
												? 'border-primary bg-primary/10'
												: ''}"
										>
											<ArrowRight class="h-3 w-3 text-muted-foreground" />
										</div>
									</button>
								</li>
							{/each}
						</ul>
						<hr class="mb-2 border-border" />

						<!-- ── Navegación ── -->
						<p
							class="mb-2 px-3 text-[10px] font-semibold tracking-widest text-muted-foreground/50 uppercase"
						>
							Navegación
						</p>
					{/if}
					<ul class="space-y-0.5">
						{#each filteredItems as item, i (item.href)}
							{@const globalIdx = i}
							{#if item.__section !== 'actions' || query}
								{@const IconCmp = iconMap[item.icon] || Plus}
								<li>
									<button
										data-palette-index={globalIdx}
										onclick={() => navigate(item.href)}
										onmouseenter={() => (selectedIndex = globalIdx)}
										class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors {globalIdx ===
										selectedIndex
											? 'bg-primary/10 text-primary'
											: 'text-foreground hover:bg-muted'}"
									>
										<IconCmp
											class="h-4 w-4 shrink-0 {globalIdx === selectedIndex
												? 'text-primary'
												: 'text-muted-foreground'}"
										/>
										<div class="flex-1 text-left">
											<span class="font-medium">{item.label}</span>
										</div>
										{#if isActive(item.href) && !query}
											<span
												class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
											>
												Actual
											</span>
										{/if}
										<div
											class="flex h-5 w-5 items-center justify-center rounded border border-border {globalIdx ===
											selectedIndex
												? 'border-primary bg-primary/10'
												: ''}"
										>
											<ArrowRight class="h-3 w-3 text-muted-foreground" />
										</div>
									</button>
								</li>
							{/if}
						{/each}
					</ul>

					<!-- Footer hint -->
					<div class="mt-3 border-t border-border px-3 pt-2.5">
						<div class="flex items-center gap-4 text-xs text-muted-foreground">
							<div class="flex items-center gap-1">
								<kbd
									class="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-medium"
									>&uarr;</kbd
								>
								<kbd
									class="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-medium"
									>&darr;</kbd
								>
								<span>navegar</span>
							</div>
							<div class="flex items-center gap-1">
								<kbd
									class="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium"
									>Enter</kbd
								>
								<span>ir</span>
							</div>
							<div class="flex items-center gap-1">
								<kbd
									class="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium"
									>Esc</kbd
								>
								<span>cerrar</span>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
