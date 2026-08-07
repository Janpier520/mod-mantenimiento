import { describe, it, expect } from 'vitest';
import {
	validateEmail,
	validateUsername,
	validatePasswordStrength,
	validateRequired,
	escapeLike
} from './validators';

// TC-4: pure validator coverage — boundary and edge cases. DB-backed validators
// are covered in validators.db.test.ts.

describe('validateEmail', () => {
	it('returns null for well-formed emails', () => {
		expect(validateEmail('user@example.com')).toBeNull();
		expect(validateEmail('user.name+tag@sub.domain.co')).toBeNull();
	});

	it('returns the format error for malformed emails', () => {
		expect(validateEmail('user@')).toBe('El formato del email no es válido');
		expect(validateEmail('@example.com')).toBe('El formato del email no es válido');
		expect(validateEmail('user example.com')).toBe('El formato del email no es válido');
		expect(validateEmail('user@domain')).toBe('El formato del email no es válido');
	});

	it('returns null for empty input (not required here)', () => {
		expect(validateEmail('')).toBeNull();
	});

	it('rejects whitespace-only input', () => {
		expect(validateEmail('   ')).toBe('El formato del email no es válido');
	});
});

describe('validateUsername', () => {
	it('rejects empty and whitespace-only usernames', () => {
		expect(validateUsername('')).toBe('El nombre de usuario es obligatorio');
		expect(validateUsername('   ')).toBe('El nombre de usuario es obligatorio');
	});

	it('rejects usernames shorter than 3 chars and accepts exactly 3', () => {
		expect(validateUsername('ab')).toBe('El nombre de usuario debe tener al menos 3 caracteres');
		expect(validateUsername('abc')).toBeNull();
	});

	it('accepts exactly 50 chars and rejects 51', () => {
		expect(validateUsername('a'.repeat(50))).toBeNull();
		expect(validateUsername('a'.repeat(51))).toBe(
			'El nombre de usuario no puede tener más de 50 caracteres'
		);
	});

	it('rejects chars outside [a-zA-Z0-9_.-]', () => {
		const error =
			'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos';
		expect(validateUsername('user name')).toBe(error);
		expect(validateUsername('user@name')).toBe(error);
		expect(validateUsername('user/name')).toBe(error);
	});

	it('accepts dots, dashes and underscores', () => {
		expect(validateUsername('user.name-1_x')).toBeNull();
	});
});

describe('validatePasswordStrength', () => {
	it('returns the required error for empty password', () => {
		expect(validatePasswordStrength('')).toBe('La contraseña es obligatoria');
	});

	it('rejects length 5 and accepts length 6 (TC-4 boundary)', () => {
		expect(validatePasswordStrength('a'.repeat(5))).toBe(
			'La contraseña debe tener al menos 6 caracteres'
		);
		expect(validatePasswordStrength('a'.repeat(6))).toBeNull();
	});

	it('accepts length 128 and rejects length 129 (TC-4 boundary)', () => {
		expect(validatePasswordStrength('a'.repeat(128))).toBeNull();
		expect(validatePasswordStrength('a'.repeat(129))).toBe(
			'La contraseña no puede tener más de 128 caracteres'
		);
	});
});

describe('validateRequired', () => {
	it('returns null for a present value', () => {
		expect(validateRequired('valor', 'nombre')).toBeNull();
	});

	it('returns the field error for empty, null and undefined', () => {
		expect(validateRequired('', 'modelo')).toBe('El campo modelo es obligatorio');
		expect(validateRequired('   ', 'modelo')).toBe('El campo modelo es obligatorio');
		expect(validateRequired(null, 'modelo')).toBe('El campo modelo es obligatorio');
		expect(validateRequired(undefined, 'modelo')).toBe('El campo modelo es obligatorio');
	});
});

describe('escapeLike', () => {
	it('escapes % to \\%', () => {
		expect(escapeLike('a%b')).toBe('a\\%b');
	});

	it('escapes _ to \\_', () => {
		expect(escapeLike('a_b')).toBe('a\\_b');
	});

	it('escapes both wildcards in the same string', () => {
		expect(escapeLike('%a_b%')).toBe('\\%a\\_b\\%');
	});

	it('leaves plain text unchanged', () => {
		expect(escapeLike('hello world')).toBe('hello world');
	});

	it('returns empty string for empty input', () => {
		expect(escapeLike('')).toBe('');
	});
});
