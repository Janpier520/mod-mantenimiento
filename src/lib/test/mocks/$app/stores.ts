// Defensive $app mock (vitest alias target) — stores are not exercised in tests.
export const page = {
	subscribe: () => () => {}
};

export const navigating = {
	subscribe: () => () => {}
};

export const updated = {
	subscribe: () => () => {}
};
