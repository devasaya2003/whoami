import { getBlogsApiKey, getBlogsUrl } from "./env";

export type BlogPostListItem = {
	slug: string;
	title: string;
	description: string;
	publishedAt: string;
};

export type BlogPost = BlogPostListItem & {
	contentHtml: string;
};

function authHeaders(): HeadersInit {
	const key = getBlogsApiKey();
	if (!key) return {};
	return {
		Authorization: `Bearer ${key}`,
		"x-api-key": key,
	};
}

function joinUrl(base: string, path: string): string {
	return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export async function listPosts(): Promise<BlogPostListItem[]> {
	const url = joinUrl(getBlogsUrl(), "/api/v1/posts");
	try {
		const res = await fetch(url, {
			headers: {
				Accept: "application/json",
				...authHeaders(),
			},
		});
		if (!res.ok) return [];
		const data: unknown = await res.json();
		if (Array.isArray(data)) return data as BlogPostListItem[];
		if (
			data &&
			typeof data === "object" &&
			"posts" in data &&
			Array.isArray((data as { posts: unknown }).posts)
		) {
			return (data as { posts: BlogPostListItem[] }).posts;
		}
		return [];
	} catch {
		return [];
	}
}

export async function getPost(slug: string): Promise<BlogPost | null> {
	const url = joinUrl(
		getBlogsUrl(),
		`/api/v1/posts/${encodeURIComponent(slug)}`,
	);
	try {
		const res = await fetch(url, {
			headers: {
				Accept: "application/json",
				...authHeaders(),
			},
		});
		if (res.status === 404) return null;
		if (!res.ok) return null;
		return (await res.json()) as BlogPost;
	} catch {
		return null;
	}
}

export function formatPostDate(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return new Intl.DateTimeFormat("en", {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}
