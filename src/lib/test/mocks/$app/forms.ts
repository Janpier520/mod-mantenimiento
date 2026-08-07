// Defensive $app mock (vitest alias target) — server-side forms are not used in tests.
export const enhance = () => {
	throw new Error('$app/forms enhance is not available in tests');
};

export const applyAction = async () => {
	throw new Error('$app/forms applyAction is not available in tests');
};
