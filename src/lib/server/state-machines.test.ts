import { describe, it, expect } from 'vitest';
import {
	EQUIPMENT_TRANSITIONS,
	TICKET_TRANSITIONS,
	isValidTransition,
	getValidTransitions,
	canTransition,
	VALID_EQUIPMENT_STATES,
	VALID_TICKET_STATES
} from './state-machines';

// TC-3: State machine coverage — both machines, valid/invalid transitions,
// dado_de_baja sink, unknown-state safety, role guards, reopen.

describe('EQUIPMENT_TRANSITIONS', () => {
	it('maps all four equipment states', () => {
		expect(Object.keys(EQUIPMENT_TRANSITIONS).sort()).toEqual(
			['dado_de_baja', 'en_reparacion', 'operativo', 'prestado'].sort()
		);
	});

	it('dado_de_baja is a sink with no outgoing transitions', () => {
		expect(EQUIPMENT_TRANSITIONS.dado_de_baja).toEqual([]);
	});
});

describe('TICKET_TRANSITIONS', () => {
	it('maps all four ticket states', () => {
		expect(Object.keys(TICKET_TRANSITIONS).sort()).toEqual(
			['abierto', 'cerrado', 'en_proceso', 'resuelto'].sort()
		);
	});

	it('supports reopening cerrado → abierto', () => {
		expect(TICKET_TRANSITIONS.cerrado).toContain('abierto');
	});
});

describe('isValidTransition (equipment)', () => {
	it('allows operativo → en_reparacion (TC-3 happy path)', () => {
		expect(isValidTransition('operativo', 'en_reparacion', 'equipment')).toBe(true);
	});

	it('allows operativo → prestado and operativo → dado_de_baja', () => {
		expect(isValidTransition('operativo', 'prestado', 'equipment')).toBe(true);
		expect(isValidTransition('operativo', 'dado_de_baja', 'equipment')).toBe(true);
	});

	it('rejects self-transitions', () => {
		expect(isValidTransition('operativo', 'operativo', 'equipment')).toBe(false);
	});

	it('rejects transitions not in the map', () => {
		expect(isValidTransition('en_reparacion', 'prestado', 'equipment')).toBe(false);
		expect(isValidTransition('prestado', 'dado_de_baja', 'equipment')).toBe(false);
	});

	it('rejects any transition out of the dado_de_baja sink', () => {
		expect(isValidTransition('dado_de_baja', 'operativo', 'equipment')).toBe(false);
		expect(isValidTransition('dado_de_baja', 'prestado', 'equipment')).toBe(false);
	});

	it('returns false for unknown states without throwing (TC-3 unknown-state safety)', () => {
		expect(isValidTransition('inexistente', 'operativo', 'equipment')).toBe(false);
		expect(isValidTransition('operativo', 'inexistente', 'equipment')).toBe(false);
	});
});

describe('isValidTransition (ticket)', () => {
	it('allows abierto → en_proceso and abierto → cerrado', () => {
		expect(isValidTransition('abierto', 'en_proceso', 'ticket')).toBe(true);
		expect(isValidTransition('abierto', 'cerrado', 'ticket')).toBe(true);
	});

	it('rejects direct abierto → resuelto', () => {
		expect(isValidTransition('abierto', 'resuelto', 'ticket')).toBe(false);
	});

	it('allows en_proceso → resuelto and resuelto → cerrado', () => {
		expect(isValidTransition('en_proceso', 'resuelto', 'ticket')).toBe(true);
		expect(isValidTransition('resuelto', 'cerrado', 'ticket')).toBe(true);
	});

	it('allows reopening cerrado → abierto', () => {
		expect(isValidTransition('cerrado', 'abierto', 'ticket')).toBe(true);
	});

	it('rejects cerrado → resuelto (reopen only to abierto)', () => {
		expect(isValidTransition('cerrado', 'resuelto', 'ticket')).toBe(false);
	});

	it('returns false for unknown states without throwing', () => {
		expect(isValidTransition('inexistente', 'abierto', 'ticket')).toBe(false);
	});
});

describe('getValidTransitions', () => {
	it('returns all equipment targets for operativo', () => {
		expect(getValidTransitions('operativo', 'equipment')).toEqual([
			'en_reparacion',
			'prestado',
			'dado_de_baja'
		]);
	});

	it('returns empty array for the dado_de_baja sink', () => {
		expect(getValidTransitions('dado_de_baja', 'equipment')).toEqual([]);
	});

	it('returns empty array for unknown states (TC-3)', () => {
		expect(getValidTransitions('inexistente', 'equipment')).toEqual([]);
		expect(getValidTransitions('inexistente', 'ticket')).toEqual([]);
	});

	it('returns only cerrado for resuelto tickets', () => {
		expect(getValidTransitions('resuelto', 'ticket')).toEqual(['cerrado']);
	});

	it('returns abierto for cerrado tickets (reopen)', () => {
		expect(getValidTransitions('cerrado', 'ticket')).toEqual(['abierto']);
	});
});

describe('canTransition (equipment)', () => {
	it('blocks tecnico from dado_de_baja with the admin-only error (TC-3 role guard)', () => {
		const res = canTransition('operativo', 'dado_de_baja', 'tecnico', 'equipment');
		expect(res.allowed).toBe(false);
		expect(res.error).toBe('Solo los administradores pueden dar de baja equipos');
	});

	it('allows admin to dado_de_baja', () => {
		const res = canTransition('operativo', 'dado_de_baja', 'admin', 'equipment');
		expect(res.allowed).toBe(true);
	});

	it('allows any role for non-dado_de_baja transitions', () => {
		expect(canTransition('operativo', 'en_reparacion', 'tecnico', 'equipment').allowed).toBe(true);
		expect(canTransition('en_reparacion', 'operativo', 'consultor', 'equipment').allowed).toBe(
			true
		);
	});
});

describe('canTransition (ticket)', () => {
	it('blocks tecnico from cerrado (admin/consultor only)', () => {
		const res = canTransition('abierto', 'cerrado', 'tecnico', 'ticket');
		expect(res.allowed).toBe(false);
		expect(res.error).toContain('El rol');
	});

	it('allows admin and consultor to cerrado', () => {
		expect(canTransition('abierto', 'cerrado', 'admin', 'ticket').allowed).toBe(true);
		expect(canTransition('abierto', 'cerrado', 'consultor', 'ticket').allowed).toBe(true);
	});

	it('allows tecnico to en_proceso and resuelto', () => {
		expect(canTransition('abierto', 'en_proceso', 'tecnico', 'ticket').allowed).toBe(true);
		expect(canTransition('en_proceso', 'resuelto', 'tecnico', 'ticket').allowed).toBe(true);
	});

	it('blocks consultor from en_proceso (admin/tecnico only)', () => {
		const res = canTransition('abierto', 'en_proceso', 'consultor', 'ticket');
		expect(res.allowed).toBe(false);
	});

	it('blocks tecnico from reopening cerrado → abierto', () => {
		const res = canTransition('cerrado', 'abierto', 'tecnico', 'ticket');
		expect(res.allowed).toBe(false);
	});
});

describe('VALID state constants', () => {
	it('exposes all equipment and ticket states', () => {
		expect(VALID_EQUIPMENT_STATES).toEqual([
			'operativo',
			'en_reparacion',
			'prestado',
			'dado_de_baja'
		]);
		expect(VALID_TICKET_STATES).toEqual(['abierto', 'en_proceso', 'resuelto', 'cerrado']);
	});
});
