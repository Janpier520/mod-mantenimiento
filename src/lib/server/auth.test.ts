import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './auth';

// ponytail: one test file, covers the core auth flow
describe('auth', () => {
	it('should hash and verify passwords correctly', () => {
		const password = 'test-password-123';
		const hash = hashPassword(password);
		expect(hash).not.toBe(password);
		expect(verifyPassword(password, hash)).toBe(true);
		expect(verifyPassword('wrong-password', hash)).toBe(false);
	});
});
