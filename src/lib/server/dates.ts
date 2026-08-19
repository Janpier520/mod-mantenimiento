// ─── Date helpers (UTC-based to avoid timezone shifts) ───────────────────────

export function todayISO(): string {
	return new Date().toISOString().slice(0, 10);
}

export function addDaysToDate(dateStr: string, days: number): string {
	const [year, month, day] = dateStr.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

export function isValidDateISO(dateStr: string): boolean {
	return (
		/^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !Number.isNaN(new Date(`${dateStr}T00:00:00Z`).getTime())
	);
}
