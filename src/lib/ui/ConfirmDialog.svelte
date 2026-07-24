<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let {
		open = $bindable(),
		title = 'Confirmar',
		message,
		confirmLabel = 'Eliminar',
		cancelLabel = 'Cancelar',
		variant = 'danger',
		onconfirm,
		oncancel
	}: {
		open: boolean;
		title?: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'default' | 'danger';
		onconfirm: () => void;
		oncancel: () => void;
	} = $props();

	function handleConfirm() {
		onconfirm();
		open = false;
	}

	function handleCancel() {
		oncancel();
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content showCloseButton={false}>
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			{#if message}
				<Dialog.Description>{message}</Dialog.Description>
			{/if}
		</Dialog.Header>
		<div class="flex justify-end gap-2">
			<Button variant="outline" onclick={handleCancel}>{cancelLabel}</Button>
			<Button variant={variant === 'danger' ? 'destructive' : 'default'} onclick={handleConfirm}>
				{confirmLabel}
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
