<script lang="ts">
	let {
		text,
		variant = 'default'
	}: {
		text: string;
		variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
	} = $props();

	// Semantic token colors (auto-adapt to dark mode)
	const classes: Record<string, string> = {
		default: 'bg-muted text-muted-foreground ring-1 ring-border',
		success: 'bg-success/15 text-success ring-1 ring-success/40',
		warning: 'bg-warning/15 text-warning ring-1 ring-warning/40',
		danger: 'bg-destructive/15 text-destructive ring-1 ring-destructive/40',
		info: 'bg-info/15 text-info ring-1 ring-info/40'
	};
</script>

<span
	class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide {classes[
		variant
	] ?? classes.default}"
>
	{text}
</span>
