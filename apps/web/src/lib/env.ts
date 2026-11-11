function firstDefined(
	...values: Array<string | undefined>
): string | undefined {
	for (const value of values) {
		if (value && value.trim()) return value.trim();
	}
	return undefined;
}

/** CMS origin. Supports legacy `.../blogs` basePath by stripping a trailing `/blogs`. */
export function getBlogsUrl(): string {
	const raw = firstDefined(
		import.meta.env.PUBLIC_BLOGS_URL,
		import.meta.env.NEXT_PUBLIC_BLOGS_URL,
		typeof process !== "undefined" ? process.env.PUBLIC_BLOGS_URL : undefined,
		typeof process !== "undefined"
			? process.env.NEXT_PUBLIC_BLOGS_URL
			: undefined,
	);

	const fallback = "http://localhost:3001";
	const url = (raw ?? fallback).replace(/\/$/, "");
	return url.replace(/\/blogs$/i, "");
}

export function getAppUrl(): string {
	const raw = firstDefined(
		import.meta.env.PUBLIC_APP_URL,
		import.meta.env.NEXT_PUBLIC_APP_URL,
		typeof process !== "undefined" ? process.env.PUBLIC_APP_URL : undefined,
		typeof process !== "undefined"
			? process.env.NEXT_PUBLIC_APP_URL
			: undefined,
	);
	return (raw ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Server-only API key — never expose via PUBLIC_*. */
export function getBlogsApiKey(): string | undefined {
	return firstDefined(
		import.meta.env.BLOGS_API_KEY,
		import.meta.env.BLOG_API_KEY,
		typeof process !== "undefined" ? process.env.BLOGS_API_KEY : undefined,
		typeof process !== "undefined" ? process.env.BLOG_API_KEY : undefined,
	);
}

/** Server-only app id for public blog API (`app-id` header). */
export function getBlogsAppId(): string | undefined {
	return firstDefined(
		import.meta.env.BLOGS_APP_ID,
		typeof process !== "undefined" ? process.env.BLOGS_APP_ID : undefined,
	);
}
