import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatDateShort, capitalize, hasAccess, statusLabel } from './utils';

// TC-5: utils coverage. es-AR date assertions are LOOSE — assert date parts
// (year/month presence), never exact locale strings (Node ICU variance).

describe('cn', () => {
	it('keeps only the last conflicting class', () => {
		expect(cn('px-2', 'px-4')).toBe('px-4');
		expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
	});

	it('merges non-conflicting classes and drops falsy values', () => {
		expect(cn('flex', '', 'items-center', null, undefined, 'gap-2')).toBe(
			'flex items-center gap-2'
		);
	});
});

describe('capitalize', () => {
	it('capitalizes the first letter', () => {
		expect(capitalize('hola')).toBe('Hola');
		expect(capitalize('en_reparacion')).toBe('En_reparacion');
	});

	it('returns empty string for empty input', () => {
		expect(capitalize('')).toBe('');
	});
});

describe('formatDate (es-AR, loose)', () => {
	it('renders a valid ISO date containing the year and a month name', () => {
		const out = formatDate('2026-07-28T10:15:00.000Z');
		expect(out).toContain('2026');
		// es-AR long month names — assert presence of a known month substring
		expect(out).toMatch(/jul|julio/i);
	});

	it('returns — for null and undefined', () => {
		expect(formatDate(null)).toBe('—');
		expect(formatDate(undefined)).toBe('—');
	});

	it('returns — for empty string', () => {
		expect(formatDate('')).toBe('—');
	});
});

describe('formatDateShort (es-AR, loose)', () => {
	it('renders a date containing the year', () => {
		const out = formatDateShort('2026-07-28T10:15:00.000Z');
		expect(out).toContain('2026');
	});

	it('returns — for null and undefined', () => {
		expect(formatDateShort(null)).toBe('—');
		expect(formatDateShort(undefined)).toBe('—');
	});
});

describe('hasAccess', () => {
	it('grants access when no allowed roles are specified', () => {
		expect(hasAccess('tecnico')).toBe(true);
		expect(hasAccess('admin', [])).toBe(true);
		expect(hasAccess(undefined, [])).toBe(true);
	});

	it('denies access for undefined role when roles are required', () => {
		expect(hasAccess(undefined, ['admin'])).toBe(false);
	});

	it('grants access for a matching role', () => {
		expect(hasAccess('admin', ['admin', 'consultor'])).toBe(true);
	});

	it('denies access for a non-matching role', () => {
		expect(hasAccess('tecnico', ['admin'])).toBe(false);
	});
});

describe('statusLabel', () => {
	it('returns known labels for known statuses', () => {
		expect(statusLabel('en_reparacion')).toBe('En Reparación');
		expect(statusLabel('critica')).toBe('Crítica');
		expect(statusLabel('operativo')).toBe('Operativo');
		expect(statusLabel('cerrado')).toBe('Cerrado');
		expect(statusLabel('fallido')).toBe('Fallido');
	});

	it('capitalizes the input for unknown statuses', () => {
		expect(statusLabel('weird')).toBe('Weird');
		expect(statusLabel('')).toBe('');
	});
});
