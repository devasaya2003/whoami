import { HttpError } from "../schema/http-error";
import type { BlogsRepository } from "../repositories/blogs.repository";
import type { UserRow } from "../repositories/users.repository";

export type ContentFormat = "html" | "json" | "md";

const VALID = new Set<ContentFormat>(["html", "json", "md"]);

export function parseContentFormats(raw: string | null): ContentFormat[] {
	if (!raw?.trim()) return ["html"];
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new HttpError(400, {
			error: "Invalid type header: expected JSON array",
		});
	}
	if (!Array.isArray(parsed) || parsed.length === 0) {
		throw new HttpError(400, {
			error: "Invalid type header: expected non-empty JSON array",
		});
	}
	const formats: ContentFormat[] = [];
	for (const item of parsed) {
		if (typeof item !== "string" || !VALID.has(item as ContentFormat)) {
			throw new HttpError(400, {
				error: `Invalid type token: ${String(item)}`,
			});
		}
		const format = item as ContentFormat;
		if (!formats.includes(format)) formats.push(format);
	}
	return formats;
}

function toIso(ms: number | null | undefined): string {
	if (!ms) return "";
	return new Date(ms).toISOString();
}

function toContentJson(docSnapshot: string | null | undefined): unknown {
	if (!docSnapshot?.trim()) return null;
	try {
		const parsed = JSON.parse(docSnapshot) as {
			format?: string;
			json?: unknown;
		};
		if (
			parsed &&
			typeof parsed === "object" &&
			parsed.format === "lexical-json-v1" &&
			parsed.json !== undefined
		) {
			return parsed.json;
		}
		return parsed;
	} catch {
		return null;
	}
}

export function createPublicBlogsService(deps: {
	blogs: Pick<BlogsRepository, "listPublicForApp" | "findPublicByIdOrSlug">;
	htmlToMarkdown: (html: string) => string;
}) {
	return {
		async list(user: UserRow, appId: string | null) {
			if (!appId) {
				throw new HttpError(400, { error: "Missing app-id header" });
			}
			const rows = await deps.blogs.listPublicForApp(user.id, appId);
			return rows.map((row) => ({
				id: row.id,
				slug: row.slug,
				title: row.title,
				desc: row.desc,
				published_at: toIso(row.publishedAt),
				created_at: toIso(row.createdAt),
				updated_at: toIso(row.updatedAt),
			}));
		},

		async get(
			user: UserRow,
			appId: string | null,
			idOrSlug: string,
			typeHeader: string | null,
		) {
			if (!appId) {
				throw new HttpError(400, { error: "Missing app-id header" });
			}
			const formats = parseContentFormats(typeHeader);
			const row = await deps.blogs.findPublicByIdOrSlug(
				user.id,
				appId,
				idOrSlug.trim(),
			);
			if (!row) throw new HttpError(404, { error: "Not found" });

			const payload: Record<string, unknown> = {
				id: row.id,
				slug: row.slug,
				title: row.title,
				desc: row.desc,
				published_at: toIso(row.publishedAt),
				created_at: toIso(row.createdAt),
				updated_at: toIso(row.updatedAt),
			};
			if (formats.includes("html")) payload.content = row.content;
			if (formats.includes("json")) {
				payload.content_json = toContentJson(row.docSnapshot);
			}
			if (formats.includes("md")) {
				payload.content_md = deps.htmlToMarkdown(row.content || "");
			}
			return payload;
		},
	};
}

export type PublicBlogsService = ReturnType<typeof createPublicBlogsService>;
