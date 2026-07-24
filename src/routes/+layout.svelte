<script lang="ts">
	import './layout.css';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { fade } from 'svelte/transition';
	import type { NavItem } from '$lib/types';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Package from '@lucide/svelte/icons/package';
	import Ticket from '@lucide/svelte/icons/ticket';
	import Wrench from '@lucide/svelte/icons/wrench';
	import Building2 from '@lucide/svelte/icons/building-2';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Users from '@lucide/svelte/icons/users';
	import Settings from '@lucide/svelte/icons/settings';
	import History from '@lucide/svelte/icons/history';
	import { onNavigate } from '$app/navigation';
	import Toast from '$lib/ui/Toast.svelte';
	import { getToasts } from '$lib/stores/toast.svelte';
	import gsap from 'gsap';

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
	let mainEl = $state<HTMLElement | undefined>(undefined);

	// ponytail: localStorage dark mode persistence, default dark
	let darkMode = $state(browser ? localStorage.getItem('equip-lab-theme') !== 'light' : true);

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	$effect(() => {
		if (!browser) return;
		document.documentElement.classList.toggle('dark', darkMode);
		localStorage.setItem('equip-lab-theme', darkMode ? 'dark' : 'light');
	});

	// GSAP sidebar animation on mobile only
	$effect(() => {
		if (!browser || !sidebarEl) return;
		const isMobile = window.innerWidth < 1024;
		if (!isMobile) {
			gsap.set(sidebarEl, { clearProps: 'all' });
			return;
		}
		gsap.to(sidebarEl, {
			x: sidebarOpen ? '0%' : '-100%',
			duration: sidebarOpen ? 0.3 : 0.25,
			ease: sidebarOpen ? 'power3.out' : 'power2.in'
		});
	});

	function toggleDarkMode() {
		darkMode = !darkMode;
	}

	function isActive(href: string): boolean {
		return $page.url.pathname.startsWith(href);
	}

	const user = $derived(data.user);

	const iconMap: Record<string, any> = {
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

	const navItems: NavItem[] = [
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
		{ label: 'Reportes', icon: 'reportes', href: '/reportes', roles: ['admin', 'consultor'] },
		{ label: 'Usuarios', icon: 'usuarios', href: '/usuarios', roles: ['admin'] },
		{ label: 'Configuración', icon: 'config', href: '/config', roles: ['admin'] },
		{ label: 'Mis Sesiones', icon: 'sessions', href: '/sessions' }
	];

	const navGroups = $derived(
		user
			? [
					{
						label: 'OPERACIONES',
						items: navItems.filter(
							(item) =>
								['dashboard', 'equipos', 'tickets', 'mantenimiento'].includes(item.icon) &&
								(!item.roles || item.roles.includes(user.rol))
						)
					},
					{
						label: 'ADMINISTRACIÓN',
						items: navItems.filter(
							(item) =>
								['proveedores', 'reportes', 'usuarios', 'config'].includes(item.icon) &&
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
</script>

<!-- Toast container -->
<div
	class="pointer-events-none fixed inset-x-0 top-4 z-[999] flex flex-col items-center gap-2 px-4 sm:items-end"
>
	{#each toasts as t (t.id)}
		<Toast toast={t} />
	{/each}
</div>

{#if !user}
	<div class="bg-grain flex min-h-screen items-center justify-center bg-surface">
		{@render children()}
	</div>
{:else}
	<div class="bg-grain flex min-h-screen bg-surface">
		<!-- Mobile overlay -->
		{#if sidebarOpen}
			<button
				class="fixed inset-0 z-40 bg-black/30 lg:hidden"
				onclick={toggleSidebar}
				aria-label="Cerrar menú"
			></button>
		{/if}

		<!-- Sidebar -->
		<aside
			bind:this={sidebarEl}
			class="fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col bg-sidebar lg:static lg:z-auto lg:translate-x-0"
		>
			<!-- Logo -->
			<div class="flex h-16 items-center gap-3 border-b border-white/5 px-5">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-sm shadow-primary/30"
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
				<div>
					<h1 class="text-sm font-bold tracking-tight text-white">EquipLab</h1>
					<p class="text-[11px] text-sidebar-text/50">Gestión de Equipos</p>
				</div>
			</div>

			<!-- Navigation -->
			<nav class="flex-1 overflow-y-auto px-3 py-3">
				{#each navGroups as group}
					<div class="mb-4">
						<p
							class="mb-2 px-3 text-[10px] font-semibold tracking-widest text-sidebar-text/40 uppercase"
						>
							{group.label}
						</p>
						<ul class="space-y-0.5">
							{#each group.items as item}
								{@const IconCmp = iconMap[item.icon]}
								<li>
									<a
										href={item.href}
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
					</div>
				{/each}
			</nav>

			<!-- User info at bottom -->
			<div class="border-t border-white/5 px-4 py-3">
				<div class="flex items-center gap-2.5">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/80 text-xs font-bold tracking-tight text-white"
					>
						{user.nombre.charAt(0)}{user.apellido.charAt(0)}
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-white">
							{user.nombre}
							{user.apellido}
						</p>
						<p class="truncate text-[11px] text-sidebar-text/50">
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
		<div class="flex min-w-0 flex-1 flex-col">
			<!-- Topbar -->
			<header
				class="flex h-16 items-center gap-4 border-b border-border-light bg-card px-4 lg:px-6"
			>
				<button
					class="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
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

				<div class="flex-1"></div>

				<!-- Dark mode toggle -->
				<button
					class="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
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
						class="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-gray-500 hover:bg-gray-100"
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

			<!-- Page content -->
			<main bind:this={mainEl} class="flex-1 p-4 lg:p-6">
				{@render children()}
			</main>
		</div>
	</div>
{/if}
