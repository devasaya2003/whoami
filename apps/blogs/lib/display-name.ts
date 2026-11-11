/** Prefer a real person name; never treat email as a display name. */
export function resolvePersonName(options: {
	dbName?: string | null;
	fullName?: string | null;
	firstName?: string | null;
	lastName?: string | null;
}): string {
	const dbName = options.dbName?.trim();
	if (dbName) return dbName;

	const fullName = options.fullName?.trim();
	if (fullName && !fullName.includes("@")) return fullName;

	const joined = [options.firstName, options.lastName]
		.map((part) => part?.trim())
		.filter(Boolean)
		.join(" ")
		.trim();
	if (joined && !joined.includes("@")) return joined;

	return "";
}
