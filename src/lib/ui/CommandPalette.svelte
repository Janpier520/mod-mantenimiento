<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
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
	import Search from '@lucide/svelte/icons/search';
	import Command from '@lucide/svelte/icons/command';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Plus from '@lucide/svelte/icons/plus';
	import Home from '@lucide/svelte/icons/home';

	let { userRole }: { userRole?: UserRole } = $props();

	let open = $state(false);
	let query = $state('');
	let selectedIndex = $state(0);
	let inputEl: HTMLInputElement;
	let overlayEl: HTMLElement;
	let panelEl: HTMLElement;

	const iconMap: Record<string, typeof LayoutDashboard> = {
		dashboard: LayoutDashboard,
		equipos: Package,
		tickets: Ticket,
		mantenimiento: Wrench,
		proveedores: Building2,
		reportes: BarChart3,
		usuarios: Users,
		config: Settings,
		sessions: History
	};

	// ─── Shortcut registry — maps keyboard combo → href, with role check ───
	interface Shortcut {
		key: string;
		ctrl?: boolean;
		shift?: boolean;
		href: string;
		label: string;
		roles?: UserRole[];
		display: string;
	}

	const shortcuts: Shortcut[] = [
		{ key: 'D', ctrl: true, href: '/', label: 'Dashboard', display: 'Ctrl+D' },
		{ key: 'E', ctrl: true, href: '/equipos', label: 'Equipos', display: 'Ctrl+E' },
		{ key: 'T', ctrl: true, href: '/tickets', label: 'Tickets', display: 'Ctrl+T' },
		{ key: 'M', ctrl: true, href: '/mantenimiento', label: 'Mantenimiento', display: 'Ctrl+M' },
		{
			key: 'P',
			ctrl: true,
			href: '/proveedores',
			label: 'Proveedores',
			roles: ['admin', 'consultor'],
			display: 'Ctrl+P'
		},
		{
			key: 'R',
			ctrl: true,
			href: '/reportes',
			label: 'Reportes',
			roles: ['admin', 'consultor'],
			display: 'Ctrl+R'
		},
		{
			key: 'U',
			ctrl: true,
			href: '/usuarios',
			label: 'Usuarios',
			roles: ['admin'],
			display: 'Ctrl+U'
		},
		{
			key: 'N',
			ctrl: true,
			href: '/tickets?nuevo=true',
			label: 'Nuevo Ticket',
			display: 'Ctrl+N'
		},
		{
			key: 'E',
			ctrl: true,
			shift: true,
			href: '/equipos?nuevo=true',
			label: 'Nuevo Equipo',
			display: 'Ctrl+Shift+E'
		}
	];

	// ─── Authorized shortcut helper ────────────────────────────────────────────
	function isAuthorized(shortcut: Shortcut): boolean {
		return !shortcut.roles || (userRole ? shortcut.roles.includes(userRole) : false);
	}

	// ─── Navigation items ──────────────────────────────────────────────────────
	const allItems: (NavItem & { icon: string })[] = [
		{ label: 'Dashboard', icon: 'dashboard', href: '/', shortcut: 'Ctrl+D' },
		{ label: 'Equipos', icon: 'equipos', href: '/equipos', shortcut: 'Ctrl+E' },
		{ label: 'Tickets', icon: 'tickets', href: '/tickets', shortcut: 'Ctrl+T' },
		{ label: 'Mantenimiento', icon: 'mantenimiento', href: '/mantenimiento', shortcut: 'Ctrl+M' },
		{
			label: 'Proveedores',
			icon: 'proveedores',
			href: '/proveedores',
			roles: ['admin', 'consultor'],
			shortcut: 'Ctrl+P'
		},
		{
			label: 'Reportes',
			icon: 'reportes',
			href: '/reportes',
			roles: ['admin', 'consultor'],
			shortcut: 'Ctrl+R'
		},
		{
			label: 'Usuarios',
			icon: 'usuarios',
			href: '/usuarios',
			roles: ['admin'],
			shortcut: 'Ctrl+U'
		},
		{ label: 'Configuración', icon: 'config', href: '/config', roles: ['admin'] },
		{ label: 'Mis Sesiones', icon: 'sessions', href: '/sessions' }
	];

	// ─── Action items — acceso rápido a creación + navegación clave ─────────────
	interface ActionItem {
		label: string;
		icon: string;
		action: string;
		href: string;
		roles?: UserRole[];
		shortcut?: string;
	}

	const actionItems: ActionItem[] = [
		{
			label: 'Volver al Dashboard',
			icon: 'home',
			action: 'navigate',
			href: '/',
			shortcut: 'Ctrl+D'
		},
		{
			label: 'Nuevo Ticket',
			icon: 'plusTicket',
			action: 'create',
			href: '/tickets?nuevo=true',
			shortcut: 'Ctrl+N'
		},
		{
			label: 'Nuevo Equipo',
			icon: 'plusEquipo',
			action: 'create',
			href: '/equipos?nuevo=true',
			shortcut: 'Ctrl+Shift+E'
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

	interface FilteredSection {
		type: 'nav' | 'actions';
		items: (NavItem & { icon: string })[] | ActionItem[];
	}

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

		const sections: FilteredSection[] = [];

		// If there's a search query, merge everything together
		if (q) {
			const merged = [
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

	let flatItems = $derived.by((): any[] => {
		if (filteredSections.hasQuery) {
			return filteredSections.merged ?? [];
		}
		return [
			...(filteredSections.actionItems ?? []).map((i: any) => ({ ...i, __section: 'actions' })),
			...(filteredSections.navItems ?? []).map((i: any) => ({ ...i, __section: 'nav' }))
		];
	});

	let filteredItems = $derived(flatItems.slice(0, 12));

	// Reset selection when filter changes
	$effect(() => {
		selectedIndex = 0;
	});

	// Keyboard listener for Ctrl+K / Cmd+K and global shortcuts
	function handleKeydown(e: KeyboardEvent) {
		// Don't trigger global shortcuts when typing in inputs
		const tag = (e.target as HTMLElement)?.tagName;
		const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

		// Ctrl+K / Cmd+K → open/close palette
		if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
			e.preventDefault();
			open ? close() : openPalette();
			return;
		}

		// Escape → close palette
		if (e.key === 'Escape' && open) {
			e.preventDefault();
			close();
			return;
		}

		// Global shortcuts: Ctrl+Letter / Ctrl+Shift+Letter → direct navigation
		// Skip if palette is open (palette handles its own keyboard) or user is typing
		if (open || isInput) return;

		if (e.ctrlKey || e.metaKey) {
			const key = e.key.toUpperCase();
			// Normalize: if Shift is held, key is already uppercase; if not, still match
			for (const shortcut of shortcuts) {
				if (shortcut.key === key && e.shiftKey === !!shortcut.shift && isAuthorized(shortcut)) {
					e.preventDefault();
					goto(shortcut.href);
					return;
				}
			}
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
		// Animate entrance + focus
		requestAnimationFrame(() => {
			inputEl?.focus();
			gsap.fromTo(
				panelEl,
				{ opacity: 0, scale: 0.96 },
				{ opacity: 1, scale: 1, duration: 0.15, ease: 'cubic-bezier(0.23, 1, 0.32, 1)' }
			);
			gsap.fromTo(overlayEl, { opacity: 0 }, { opacity: 1, duration: 0.1 });
		});
	}

	function close() {
		if (!open) return;
		gsap.to(panelEl, {
			opacity: 0,
			scale: 0.96,
			duration: 0.12,
			ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
			onComplete: () => {
				open = false;
				query = '';
			}
		});
		gsap.to(overlayEl, {
			opacity: 0,
			duration: 0.1,
			ease: 'linear'
		});
	}

	function navigate(href: string) {
		close();
		// Small delay so close animation plays before navigation
		setTimeout(() => goto(href), 100);
	}

	function isActive(href: string): boolean {
		return $page.url.pathname.startsWith(href);
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});
</script>

{#if open}
	<!-- svelte-ignore a11y_interactive_supports_focus a11y_click_events_have_key_events -->
	<div
		bind:this={overlayEl}
		class="fixed inset-0 z-[999] flex items-start justify-center bg-black/30 pt-[15vh] backdrop-blur-sm"
		style="opacity: 1"
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
							{#each filteredItems.filter((i) => i.__section === 'actions') as item, ai}
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
										{#if item.shortcut}
											<kbd
												class="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
												>{item.shortcut}</kbd
											>
										{/if}
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
						{#each filteredItems as item, i}
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
										{#if item.shortcut && query}
											<kbd
												class="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
												>{item.shortcut}</kbd
											>
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
