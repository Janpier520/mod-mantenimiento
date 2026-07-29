<script lang="ts">
	let {
		text,
		variant = 'default'
	}: {
		text: string;
		variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
	} = $props();

	// Bolder badge variants with ring accent + modern colors
	const classes: Record<string, string> = {
		default:
			'bg-gray-100 text-gray-700 ring-1 ring-gray-300/40 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600/40',
		success:
			'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-400/50 dark:bg-emerald-900/50 dark:text-emerald-300 dark:ring-emerald-700/40',
		warning:
			'bg-amber-100 text-amber-700 ring-1 ring-amber-400/50 dark:bg-amber-900/50 dark:text-amber-300 dark:ring-amber-700/40',
		danger:
			'bg-red-100 text-red-700 ring-1 ring-red-400/50 dark:bg-red-900/50 dark:text-red-300 dark:ring-red-700/40',
		info: 'bg-blue-100 text-blue-700 ring-1 ring-blue-400/50 dark:bg-blue-900/50 dark:text-blue-300 dark:ring-blue-700/40'
	};
</script>

<span
	class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide {classes[
		variant
	] ?? classes.default}"
>
	{text}
</span>
