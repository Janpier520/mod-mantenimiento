<script lang="ts">
	import './layout.css';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import type { NavItem } from '$lib/types';
	import type { LucideIcon } from '@lucide/svelte';
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
	import Warehouse from '@lucide/svelte/icons/warehouse';
	import { onNavigate } from '$app/navigation';
	import Toast from '$lib/ui/Toast.svelte';
	import CommandPalette from '$lib/ui/CommandPalette.svelte';
	import { getToasts } from '$lib/stores/toast.svelte';
	import gsap from 'gsap';
	import { SvelteSet } from 'svelte/reactivity';

	const { toasts } = getToasts();

	onNavigate(() => {
		// ponytail: simple fade-in on every navigation
		if (!browser || !mainEl) return;
		gsap.fromTo(
			mainEl,
			{ opacity: 0, y: 8 },
			{ opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
		);
	});

	let { children, data } = $props();

	let sidebarOpen = $state(false);
	let sidebarEl = $state<HTMLElement | undefined>(undefined);
	let navEl = $state<HTMLElement | undefined>(undefined);
	let overlayEl = $state<HTMLElement | undefined>(undefined);
	let mainEl = $state<HTMLElement | undefined>(undefined);

	// Sidebar collapse (desktop only — persisted in localStorage)
	let sidebarCollapsed = $state(
		browser ? localStorage.getItem('overhaul-sidebar-collapsed') === 'true' : false
	);

	let sidebarTl: gsap.core.Timeline | null = null;

	// Collapsible nav groups — persisted in a Set
	let collapsedGroups = new SvelteSet<string>();

	function toggleGroup(label: string) {
		if (collapsedGroups.has(label)) {
			collapsedGroups.delete(label);
		} else {
			collapsedGroups.add(label);
		}
	}

	// ponytail: localStorage dark mode persistence, default dark
	let darkMode = $state(browser ? localStorage.getItem('overhaul-theme') !== 'light' : true);

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	function toggleCollapse() {
		sidebarCollapsed = !sidebarCollapsed;
	}

	$effect(() => {
		if (!browser) return;
		localStorage.setItem('overhaul-sidebar-collapsed', String(sidebarCollapsed));
	});

	$effect(() => {
		if (!browser) return;
		document.documentElement.classList.toggle('dark', darkMode);
		localStorage.setItem('overhaul-theme', darkMode ? 'dark' : 'light');
	});

	// GSAP sidebar + overlay + nav-item stagger on mobile only
	// Emil: stagger delays 35ms, never use ease-in for UI
	$effect(() => {
		if (!browser || !sidebarEl) return;
		// Kill any running timeline to prevent overlap on rapid toggle
		sidebarTl?.kill();

		const isMobile = window.innerWidth < 1024;
		if (!isMobile) {
			gsap.set(sidebarEl, { clearProps: 'all' });
			if (overlayEl) gsap.set(overlayEl, { clearProps: 'all' });
			if (navEl)
				gsap.set(navEl.querySelectorAll('.nav-item, :scope > div > button'), { clearProps: 'all' });
			return;
		}

		const items = navEl?.querySelectorAll<HTMLElement>('.nav-item, :scope > div > button') ?? [];

		if (sidebarOpen) {
			// Open: sidebar slides in, then items stagger in with a slight overlap
			sidebarTl = gsap.timeline({ defaults: { ease: 'cubic-bezier(0.23, 1, 0.32, 1)' } });
			sidebarTl.to(sidebarEl, { x: '0%', duration: 0.3, ease: 'power3.out' }, 0);
			if (overlayEl) sidebarTl.to(overlayEl, { opacity: 1, duration: 0.2 }, 0);
			if (items.length > 0) {
				sidebarTl.fromTo(
					items,
					{ opacity: 0, x: -14 },
					{ opacity: 1, x: 0, duration: 0.22, stagger: 0.035 },
					'-=0.08'
				);
			}
		} else {
			// Close: items out fast, then sidebar slides out
			sidebarTl = gsap.timeline({ defaults: { ease: 'cubic-bezier(0.23, 1, 0.32, 1)' } });
			if (items.length > 0) {
				sidebarTl.to(items, { opacity: 0, x: -14, duration: 0.1, stagger: 0.02 });
			}
			if (overlayEl) sidebarTl.to(overlayEl, { opacity: 0, duration: 0.15 }, 0);
			sidebarTl.to(sidebarEl, { x: '-100%', duration: 0.2, ease: 'power2.out' });
		}
	});

	function toggleDarkMode() {
		darkMode = !darkMode;
	}

	let activePath = $derived($page.url.pathname);

	function isActive(href: string): boolean {
		return activePath === href || activePath.startsWith(href + '/');
	}

	const user = $derived(data.user);

	const pageTitles: Record<string, string> = {
		'/': 'Dashboard',
		'/equipos': 'Equipos',
		'/equipos/tipos': 'Tipos de Equipo',
		'/tickets': 'Tickets',
		'/mantenimiento': 'Mantenimiento',
		'/inventario': 'Inventario',
		'/inventario/movimientos': 'Movimientos de Inventario',
		'/proveedores': 'Proveedores',
		'/reportes': 'Reportes',
		'/usuarios': 'Usuarios',
		'/config': 'Configuración',
		'/sessions': 'Mis Sesiones'
	};

	let pageTitle = $derived(
		Object.entries(pageTitles)
			.filter(([path]) => activePath === path || activePath.startsWith(path + '/'))
			.sort(([a], [b]) => b.length - a.length)[0]?.[1] ?? ''
	);

	const iconMap: Record<string, LucideIcon> = {
		dashboard: LayoutDashboard,
		equipos: Package,
		tickets: Ticket,
		mantenimiento: Wrench,
		inventario: Warehouse,
		proveedores: Building2,
		reportes: BarChart3,
		usuarios: Users,
		config: Settings,
		sessions: History,
		tipos: Shapes
	};

	const navItems: NavItem[] = [
		{ label: 'Dashboard', icon: 'dashboard', href: '/' },
		{ label: 'Equipos', icon: 'equipos', href: '/equipos' },
		{ label: 'Tickets', icon: 'tickets', href: '/tickets' },
		{ label: 'Mantenimiento', icon: 'mantenimiento', href: '/mantenimiento' },
		{ label: 'Inventario', icon: 'inventario', href: '/inventario' },
		{
			label: 'Proveedores',
			icon: 'proveedores',
			href: '/proveedores',
			roles: ['admin', 'consultor']
		},
		{ label: 'Reportes', icon: 'reportes', href: '/reportes', roles: ['admin', 'consultor'] },
		{ label: 'Usuarios', icon: 'usuarios', href: '/usuarios', roles: ['admin'] },
		{ label: 'Configuración', icon: 'config', href: '/config', roles: ['admin'] },
		{ label: 'Tipos de Equipo', icon: 'tipos', href: '/equipos/tipos', roles: ['admin'] },
		{ label: 'Mis Sesiones', icon: 'sessions', href: '/sessions' }
	];

	const navGroups = $derived(
		user
			? [
					{
						label: 'OPERACIONES',
						items: navItems.filter(
							(item) =>
								['dashboard', 'equipos', 'tickets', 'mantenimiento', 'inventario'].includes(
									item.icon
								) &&
								(!item.roles || item.roles.includes(user.rol))
						)
					},
					{
						label: 'ADMINISTRACIÓN',
						items: navItems.filter(
							(item) =>
								['proveedores', 'reportes', 'usuarios', 'config', 'tipos'].includes(item.icon) &&
								(!item.roles || item.roles.includes(user.rol))
						)
					},
					{
						label: 'SISTEMA',
						items: navItems.filter(
							(item) =>
								['sessions'].includes(item.icon) && (!item.roles || item.roles.includes(user.rol))
						)
					}
				].filter((g) => g.items.length > 0)
			: []
	);

	let pageTitleIcon = $state<LucideIcon | undefined>(undefined);

	$effect(() => {
		let best: NavItem | undefined;
		for (const group of navGroups) {
			for (const item of group.items) {
				if (activePath === item.href || activePath.startsWith(item.href + '/')) {
					if (!best || item.href.length > best.href.length) best = item;
				}
			}
		}
		pageTitleIcon = best ? iconMap[best.icon] : undefined;
	});
</script>

<!-- Skip-link for keyboard users -->
<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none"
>
	Saltar al contenido
</a>

<!-- Toast container: bottom-right (more standard) -->
<div
	class="toast-container pointer-events-none fixed right-4 bottom-4 z-[999] flex flex-col items-end gap-2"
>
	{#each toasts as t (t.id)}
		<Toast toast={t} />
	{/each}
</div>

{#if !user}
	<div class="bg-grain flex min-h-screen items-center justify-center bg-surface text-foreground">
		{@render children()}
	</div>
{:else}
	<div class="bg-grain flex min-h-screen bg-surface">
		<!-- Mobile overlay (GSAP-bound for fade transition) -->
		<button
			bind:this={overlayEl}
			class="fixed inset-0 z-40 bg-black/50 lg:hidden"
			class:pointer-events-auto={sidebarOpen}
			class:pointer-events-none={!sidebarOpen}
			tabindex={sidebarOpen ? 0 : -1}
			aria-hidden={!sidebarOpen}
			onclick={toggleSidebar}
			aria-label="Cerrar menú"
		></button>

		<!-- Sidebar -->
		<aside
			bind:this={sidebarEl}
			class="sidebar fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] lg:static lg:z-auto {sidebarCollapsed
				? 'w-16'
				: 'w-64'} {sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0"
		>
			<!-- Logo -->
			<div class="flex h-16 shrink-0 items-center gap-2 border-b border-white/5 px-3">
				<div
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-sm"
				>
					<svg
						class="h-4 w-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
						/>
					</svg>
				</div>
				<div class="min-w-0 flex-1 overflow-hidden {sidebarCollapsed ? 'hidden' : ''}">
					<span class="block truncate text-xs font-bold tracking-tight text-white">
						World Enterprise D&E
					</span>
					<span class="block truncate text-[11px] text-sidebar-text/70"
						>Módulo de Mantenimiento</span
					>
				</div>
				<!-- Desktop collapse toggle -->
				<button
					onclick={toggleCollapse}
					class="hidden shrink-0 items-center justify-center rounded-lg text-sidebar-text/40 transition-colors hover:text-sidebar-text-active/70 lg:flex {sidebarCollapsed
						? 'h-8 w-8'
						: 'h-6 w-6'}"
					aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
				>
					<svg
						class="h-3.5 w-3.5 transition-transform duration-200"
						class:rotate-180={sidebarCollapsed}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						stroke-width="2"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
			</div>

			<!-- Navigation -->
			<nav bind:this={navEl} class="flex-1 overflow-y-auto px-3 py-3">
				{#if sidebarCollapsed}
					<!-- Collapsed: flat icon list -->
					<ul class="flex flex-col items-center gap-1">
						{#each navGroups as group (group.label)}
							{#each group.items as item (item.href)}
								{@const IconCmp = iconMap[item.icon]}
								<li>
									<a
										href={item.href}
										aria-current={isActive(item.href) ? 'page' : undefined}
										aria-label={item.label}
										class="nav-item flex h-9 w-9 items-center justify-center rounded-lg transition-colors {isActive(
											item.href
										)
											? 'nav-item-active bg-primary-light/15 text-sidebar-text-active'
											: 'text-sidebar-text hover:bg-white/5 hover:text-sidebar-text-active'}"
									>
										<IconCmp class="nav-icon h-4 w-4" />
									</a>
								</li>
							{/each}
						{/each}
					</ul>
				{:else}
					{#each navGroups as group (group.label)}
						{@const isCollapsed = collapsedGroups.has(group.label)}
						<div class="mb-4">
							<!-- Collapsible group header -->
							<button
								onclick={() => toggleGroup(group.label)}
								class="mb-1 flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold tracking-widest text-sidebar-text/60 uppercase transition-colors hover:text-sidebar-text-active/70"
							>
								<svg
									class="group-arrow h-3 w-3 {isCollapsed ? 'collapsed' : ''}"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									stroke-width="2"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
								</svg>
								{group.label}
							</button>
							{#if !isCollapsed}
								<ul class="space-y-1">
									{#each group.items as item (item.href)}
										{@const IconCmp = iconMap[item.icon]}
										<li>
											<a
												href={item.href}
												aria-current={isActive(item.href) ? 'page' : undefined}
												class="nav-item flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors {isActive(
													item.href
												)
													? 'nav-item-active bg-primary-light/15 text-sidebar-text-active'
													: 'text-sidebar-text hover:bg-white/5 hover:text-sidebar-text-active'}"
											>
												<IconCmp class="nav-icon h-4 w-4 flex-shrink-0" />
												<span>{item.label}</span>
											</a>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/each}
				{/if}
			</nav>

			<!-- User info at bottom -->
			<div class="border-t border-white/5 px-3 py-3">
				<div class="flex items-center justify-center gap-2.5 {sidebarCollapsed ? '' : ''}">
					<div
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/80 text-xs font-bold tracking-tight text-white"
					>
						{user.nombre.charAt(0)}{user.apellido.charAt(0)}
					</div>
					<div class="min-w-0 flex-1 {sidebarCollapsed ? 'hidden' : ''}">
						<p class="truncate text-sm font-medium text-white">
							{user.nombre}
							{user.apellido}
						</p>
						<p class="truncate text-[11px] text-sidebar-text/60">
							{user.rol === 'admin'
								? 'Administrador'
								: user.rol === 'tecnico'
									? 'Técnico'
									: 'Consultor'}
						</p>
					</div>
				</div>
			</div>
		</aside>

		<!-- Main content -->
		<div class="flex min-w-0 flex-1 flex-col text-foreground">
			<!-- Topbar with page title + breadcrumb -->
			<header class="flex h-16 items-center gap-3 border-b border-border bg-card px-4 lg:px-6">
				<!-- Mobile hamburger -->
				<button
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
					onclick={toggleSidebar}
					aria-label="Abrir menú"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				</button>

				<!-- Current page title (desktop) -->
				<div class="hidden items-center gap-2.5 lg:flex">
					{#if pageTitleIcon}
						{@const PTIcon = pageTitleIcon}
						<PTIcon class="h-5 w-5 text-primary" />
					{/if}
					<h2 class="text-base font-bold tracking-tight text-foreground">{pageTitle}</h2>
				</div>

				<div class="flex-1"></div>

				<!-- Dark mode toggle -->
				<button
					class="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
					onclick={toggleDarkMode}
					aria-label="Cambiar tema"
				>
					{#if darkMode}
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
							/>
						</svg>
					{:else}
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
							/>
						</svg>
					{/if}
				</button>

				<!-- Logout -->
				<form action="/login?/logout" method="post">
					<button
						type="submit"
						class="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
							/>
						</svg>
						<span class="hidden sm:inline">Salir</span>
					</button>
				</form>
			</header>

			<!-- Command palette -->
			<CommandPalette userRole={user?.rol} />

			<!-- Page content -->
			<main id="main-content" bind:this={mainEl} class="flex-1 p-4 lg:p-6" tabindex="-1">
				{@render children()}
			</main>
		</div>
	</div>
{/if}
