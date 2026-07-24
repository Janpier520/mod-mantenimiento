import { browser } from '$app/environment';

export type ToastType = 'success' | 'error';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
}

let toasts = $state<Toast[]>([]);

export function addToast(message: string, type: ToastType = 'success') {
	const id = crypto.randomUUID();
	toasts.push({ id, message, type });
	if (browser) {
		setTimeout(() => {
			toasts = toasts.filter((t) => t.id !== id);
		}, 4000);
	}
}

export function dismissToast(id: string) {
	toasts = toasts.filter((t) => t.id !== id);
}

export function getToasts(): {
	toasts: Toast[];
	addToast: typeof addToast;
	dismissToast: typeof dismissToast;
} {
	return {
		get toasts() {
			return toasts;
		},
		addToast,
		dismissToast
	};
}
