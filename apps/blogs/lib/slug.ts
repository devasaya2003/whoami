export function kebabCase(value: string) {
	const kebab = value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 72);
	return kebab || "untitled";
}

export function randomSevenDigits() {
	return String(Math.floor(1_000_000 + Math.random() * 9_000_000));
}

export function makeBlogSlug(title: string) {
	return `${kebabCase(title)}-${randomSevenDigits()}`;
}
