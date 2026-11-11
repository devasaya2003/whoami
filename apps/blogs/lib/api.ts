export { blogsApi, createBlogsClient, type BlogsClient } from "./api-client";

/** Minimal response shape shared by fetch Response and hono/client ClientResponse. */
export type ApiResponse = {
	ok: boolean;
	status: number;
	statusText: string;
	text(): Promise<string>;
	json(): Promise<unknown>;
};

/** Throw on non-OK responses; return JSON (or undefined for 204). */
export async function okJson<T>(res: ApiResponse): Promise<T> {
	if (!res.ok) {
		const text = await res.text();
		throw new Error(text || res.statusText);
	}
	if (res.status === 204) return undefined as T;
	return (await res.json()) as T;
}

/** Prefer message from JSON `{ error }` bodies when present. */
export async function readApiError(res: ApiResponse): Promise<string> {
	const text = await res.text();
	try {
		const json = JSON.parse(text) as { error?: string };
		if (json.error) return json.error;
	} catch {
		// plain text
	}
	return text || res.statusText;
}
