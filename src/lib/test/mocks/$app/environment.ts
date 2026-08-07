// Defensive $app mock (vitest alias target). No module under test imports $app at
// runtime today; these stubs keep the alias resolvable if that changes.
export const browser = false;
export const building = false;
export const dev = true;
export const version = 'test';
