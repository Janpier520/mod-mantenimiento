<script lang="ts">
	let {
		icon: Icon,
		variant = 'default',
		onclick,
		label = ''
	}: {
		icon: any; // Lucide icon component
		variant?: 'default' | 'edit' | 'delete';
		onclick?: (e: MouseEvent) => void;
		label?: string;
	} = $props();
</script>

<button
	type="button"
	{onclick}
	aria-label={label}
	class="inline-flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-150
		{variant === 'default'
			? 'text-muted-foreground hover:text-foreground hover:bg-muted'
			: ''}
		{variant === 'edit'
			? 'text-primary/70 hover:text-primary hover:bg-primary/10'
			: ''}
		{variant === 'delete'
			? 'text-destructive/70 hover:text-destructive hover:bg-destructive/10'
			: ''}"
>
	<Icon class="h-4 w-4" />
</button>
