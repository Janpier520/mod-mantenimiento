// Maps server-side form error strings to per-field error messages.
// Server actions return a single `error` string (possibly joined). This helper
// splits it and routes each fragment to the matching form field, keeping any
// non-field error for a general banner.

export type FieldErrors = Record<string, string>;

export function mapFieldErrors(
	err: string,
	fieldMessages: Record<string, string[]>
): { fields: FieldErrors; general: string } {
	const fields: FieldErrors = {};
	const general: string[] = [];
	for (const part of err.split('. ')) {
		const entry = Object.entries(fieldMessages).find(([, messages]) => messages.includes(part));
		if (entry) fields[entry[0]] = part;
		else general.push(part);
	}
	return { fields, general: general.join('. ') };
}
