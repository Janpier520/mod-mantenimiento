<script lang="ts">
	import { Badge as ShadcnBadge } from '$lib/components/ui/badge/index.js';

	let {
		text,
		variant = 'default'
	}: {
		text: string;
		variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
	} = $props();

	const classMap = $derived(() => {
		const map: Record<string, string> = {
			default: 'bg-gray-100 text-gray-700 dark:bg-gray-200 dark:text-gray-800 border-transparent',
			success:
				'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-transparent',
			warning:
				'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-transparent',
			danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-transparent',
			info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-transparent'
		};
		return map[variant] ?? map.default;
	});
</script>

<ShadcnBadge class={classMap()}>{text}</ShadcnBadge>
