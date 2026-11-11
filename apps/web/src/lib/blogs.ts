import { getBlogsApiKey, getBlogsAppId, getBlogsUrl } from "./env";

export type BlogPostListItem = {
	slug: string;
	title: string;
	description: string;
	publishedAt: string;
};

export type BlogPost = BlogPostListItem & {
	contentHtml: string;
};

type PublicBlogListItem = {
	id: string;
	slug: string;
	title: string;
	desc: string;
	published_at: string | null;
	created_at?: string | null;
	updated_at?: string | null;
};

type PublicBlog = PublicBlogListItem & {
	content: string;
	content_json?: unknown;
};

function authHeaders(): HeadersInit {
	const key = getBlogsApiKey();
	const appId = getBlogsAppId();
	const headers: Record<string, string> = {};
	if (key) {
		headers.Authorization = `Bearer ${key}`;
		headers["x-api-key"] = key;
	}
	if (appId) headers["app-id"] = appId;
	return headers;
}

function joinUrl(base: string, path: string): string {
	return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function toListItem(row: PublicBlogListItem): BlogPostListItem {
	return {
		slug: row.slug,
		title: row.title,
		description: row.desc ?? "",
		publishedAt: row.published_at ?? "",
	};
}

export async function listPosts(): Promise<BlogPostListItem[]> {
	const url = joinUrl(getBlogsUrl(), "/api/v1/blogs");
	try {
		const res = await fetch(url, {
			headers: {
				Accept: "application/json",
				...authHeaders(),
			},
		});
		if (!res.ok) return [];
		const data: unknown = await res.json();
		if (!Array.isArray(data)) return [];
		return (data as PublicBlogListItem[]).map(toListItem);
	} catch {
		return [];
	}
}

export async function getPost(slug: string): Promise<BlogPost | null> {
	const url = joinUrl(
		getBlogsUrl(),
		`/api/v1/blogs/${encodeURIComponent(slug)}`,
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
		const row = (await res.json()) as PublicBlog;
		return {
			...toListItem(row),
			contentHtml: row.content ?? "",
		};
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
