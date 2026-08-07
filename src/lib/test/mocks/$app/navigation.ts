// Defensive $app mock (vitest alias target) — navigation is not exercised in tests.
export const goto = async () => {
	throw new Error('$app/navigation goto is not available in tests');
};

export const invalidate = async () => {
	throw new Error('$app/navigation invalidate is not available in tests');
};

export const invalidateAll = async () => {
	throw new Error('$app/navigation invalidateAll is not available in tests');
};

export const afterNavigate = () => {};

export const beforeNavigate = () => {};

export const onNavigate = () => {};
