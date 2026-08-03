<script lang="ts">
	let {
		icon: Icon,
		variant = 'default',
		size = 'md',
		onclick,
		label = ''
	}: {
		icon: any; // Lucide icon component
		variant?: 'default' | 'edit' | 'delete';
		size?: 'sm' | 'md' | 'lg';
		onclick?: (e: MouseEvent) => void;
		label?: string;
	} = $props();

	const btnClass = $derived(
		`inline-flex items-center justify-center rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px
			${size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-9 w-9' : 'h-8 w-8'}
			${size === 'sm' ? '[&>:global(svg)]:h-3.5 [&>:global(svg)]:w-3.5' : ''}
			${variant === 'default'
				? 'text-muted-foreground hover:text-foreground hover:bg-muted'
				: ''}
			${variant === 'edit'
				? 'text-primary/70 hover:text-primary hover:bg-primary/10'
				: ''}
			${variant === 'delete'
				? 'text-destructive/70 hover:text-destructive hover:bg-destructive/10'
				: ''}`
	);
</script>

<button
	type="button"
	{onclick}
	aria-label={label}
	class={btnClass}
>
	<Icon class="h-4 w-4" />
</button>
