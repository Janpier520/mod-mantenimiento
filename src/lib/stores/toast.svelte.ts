import { browser } from '$app/environment';

export type ToastType = 'success' | 'error';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration: number; // ms
}

let toasts = $state<Toast[]>([]);

// Internal timer tracking for pause/resume
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const remaining = new Map<string, number>();
const startedAt = new Map<string, number>();
const DEFAULT_DURATION = 4000;

function startTimer(id: string, ms: number) {
	startedAt.set(id, Date.now());
	remaining.set(id, ms);
	timers.set(
		id,
		setTimeout(() => {
			dismissToast(id);
		}, ms)
	);
}

export function addToast(
	message: string,
	type: ToastType = 'success',
	duration = DEFAULT_DURATION
) {
	const id = crypto.randomUUID();
	toasts.push({ id, message, type, duration });
	if (browser) {
		startTimer(id, duration);
	}
	return id;
}

export function pauseAutoDismiss(id: string) {
	const timer = timers.get(id);
	if (timer) {
		clearTimeout(timer);
		timers.delete(id);
		const elapsed = Date.now() - (startedAt.get(id) ?? Date.now());
		const left = Math.max(0, (remaining.get(id) ?? DEFAULT_DURATION) - elapsed);
		remaining.set(id, left);
	}
}

export function resumeAutoDismiss(id: string) {
	const ms = remaining.get(id);
	if (ms && ms > 0) {
		startTimer(id, ms);
	}
}

export function dismissToast(id: string) {
	clearTimeout(timers.get(id));
	timers.delete(id);
	remaining.delete(id);
	startedAt.delete(id);
	toasts = toasts.filter((t) => t.id !== id);
}

export function getToasts(): {
	toasts: Toast[];
	addToast: typeof addToast;
	dismissToast: typeof dismissToast;
	pauseAutoDismiss: typeof pauseAutoDismiss;
	resumeAutoDismiss: typeof resumeAutoDismiss;
} {
	return {
		get toasts() {
			return toasts;
		},
		addToast,
		dismissToast,
		pauseAutoDismiss,
		resumeAutoDismiss
	};
}
