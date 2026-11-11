import {
	blogs,
	newId,
	now,
	userApis,
	userApps,
	users,
} from "@repo/db";
import {
	deleteObject,
	mediaProxyPath,
	publicObjectUrl,
	putObject,
	resolveUploadKey,
	uploadKey,
	userUploadPrefix,
} from "@repo/storage";
import { and, desc, eq, or } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { HttpError, requireClerkUser, resolveUserFromApiKey } from "./auth";
import { getDb, getR2, getR2PublicUrl } from "./cf";
import { generateApiKey, sha256Hex } from "./hash";
import { makeBlogSlug } from "./slug";

function assertHttpUrl(value: string) {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new HttpError(400, { error: "Invalid URL" });
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new HttpError(400, { error: "URL must use http or https" });
	}
	return url.toString();
}



function blogsOrigin() {
	return (process.env.NEXT_PUBLIC_BLOGS_URL || "").replace(/\/$/, "");
}

/** S3 API hosts are not publicly readable; require media proxy instead. */
function usablePublicBase(publicBase: string): string {
	const base = publicBase.trim();
	if (!base) return "";
	try {
		const host = new URL(base).hostname;
		if (host.endsWith(".r2.cloudflarestorage.com")) return "";
		return base.replace(/\/$/, "");
	} catch {
		return "";
	}
}

function publicOrProxyUrl(publicBase: string, key: string) {
	const usable = usablePublicBase(publicBase);
	if (usable) return publicObjectUrl(usable, key);
	const origin = blogsOrigin();
	const path = mediaProxyPath(key);
	return origin ? `${origin}${path}` : path;
}

function toIso(ms: number | null | undefined): string {
	if (!ms) return "";
	return new Date(ms).toISOString();
}

/** Lexical editor state from stored `docSnapshot` (`{ format, json }`). */
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

function errorResponse(error: unknown) {
	if (error instanceof HttpError) {
		return new Response(JSON.stringify(error.body), {
			status: error.status,
			headers: { "content-type": "application/json" },
		});
	}
	console.error(error);
	return new Response(JSON.stringify({ error: "Internal Server Error" }), {
		status: 500,
		headers: { "content-type": "application/json" },
	});
}

async function ownedApp(db: Awaited<ReturnType<typeof getDb>>, userId: string, appId: string) {
	const rows = await db
		.select()
		.from(userApps)
		.where(and(eq(userApps.id, appId), eq(userApps.userId, userId)))
		.limit(1);
	return rows[0] ?? null;
}

async function ownedBlog(
	db: Awaited<ReturnType<typeof getDb>>,
	userId: string,
	blogId: string,
) {
	const rows = await db
		.select({ blog: blogs, app: userApps })
		.from(blogs)
		.innerJoin(userApps, eq(blogs.appId, userApps.id))
		.where(and(eq(blogs.id, blogId), eq(userApps.userId, userId)))
		.limit(1);
	return rows[0] ?? null;
}

export const app = new Elysia({ name: "blogs-api" })
	.onError(({ error, set }) => {
		if (error instanceof HttpError) {
			set.status = error.status;
			return error.body;
		}
		console.error(error);
		set.status = 500;
		return { error: "Internal Server Error" };
	})
	.get("/api/v1/blogs", async ({ request }) => {
		const db = await getDb();
		const user = await resolveUserFromApiKey(db, request);
		if (!user) throw new HttpError(401, { error: "Invalid API key" });

		const appId = request.headers.get("app-id")?.trim();
		if (!appId) throw new HttpError(400, { error: "Missing app-id header" });

		const rows = await db
			.select({
				id: blogs.id,
				slug: blogs.slug,
				title: blogs.title,
				desc: blogs.description,
				createdAt: blogs.createdAt,
				updatedAt: blogs.updatedAt,
				publishedAt: blogs.publishedAt,
			})
			.from(blogs)
			.innerJoin(userApps, eq(blogs.appId, userApps.id))
			.where(
				and(
					eq(userApps.userId, user.id),
					eq(userApps.id, appId),
					eq(blogs.status, "public"),
				),
			)
			.orderBy(desc(blogs.publishedAt), desc(blogs.updatedAt));

		return rows.map((row) => ({
			id: row.id,
			slug: row.slug,
			title: row.title,
			desc: row.desc,
			published_at: toIso(row.publishedAt),
			created_at: toIso(row.createdAt),
			updated_at: toIso(row.updatedAt),
		}));
	})
	.get("/api/v1/blogs/:idOrSlug", async ({ request, params }) => {
		const db = await getDb();
		const user = await resolveUserFromApiKey(db, request);
		if (!user) throw new HttpError(401, { error: "Invalid API key" });

		const appId = request.headers.get("app-id")?.trim();
		if (!appId) throw new HttpError(400, { error: "Missing app-id header" });

		const idOrSlug = params.idOrSlug.trim();
		const rows = await db
			.select({
				id: blogs.id,
				slug: blogs.slug,
				title: blogs.title,
				desc: blogs.description,
				content: blogs.contentHtml,
				docSnapshot: blogs.docSnapshot,
				createdAt: blogs.createdAt,
				updatedAt: blogs.updatedAt,
				publishedAt: blogs.publishedAt,
			})
			.from(blogs)
			.innerJoin(userApps, eq(blogs.appId, userApps.id))
			.where(
				and(
					eq(userApps.userId, user.id),
					eq(userApps.id, appId),
					eq(blogs.status, "public"),
					or(eq(blogs.id, idOrSlug), eq(blogs.slug, idOrSlug))!,
				),
			)
			.limit(1);

		const row = rows[0];
		if (!row) throw new HttpError(404, { error: "Not found" });

		return {
			id: row.id,
			slug: row.slug,
			title: row.title,
			desc: row.desc,
			content: row.content,
			content_json: toContentJson(row.docSnapshot),
			published_at: toIso(row.publishedAt),
			created_at: toIso(row.createdAt),
			updated_at: toIso(row.updatedAt),
		};
	})
	// --- Admin: current user ---
	.get("/api/admin/me", async () => {
		const db = await getDb();
		const user = await requireClerkUser(db);
		return {
			id: user.id,
			email: user.email,
			name: user.name,
		};
	})
	.patch(
		"/api/admin/me",
		async ({ body }) => {
			const db = await getDb();
			const user = await requireClerkUser(db);
			const name = body.name.trim();
			const ts = now();
			await db
				.update(users)
				.set({ name, updatedAt: ts })
				.where(eq(users.id, user.id));
			return { id: user.id, email: user.email, name };
		},
		{
			body: t.Object({
				name: t.String({ minLength: 1, maxLength: 120 }),
			}),
		},
	)
	// --- Admin: all blogs for signed-in user ---
	.get("/api/admin/blogs", async () => {
		const db = await getDb();
		const user = await requireClerkUser(db);
		const rows = await db
			.select({
				id: blogs.id,
				slug: blogs.slug,
				appId: blogs.appId,
				appName: userApps.name,
				createdAt: blogs.createdAt,
				updatedAt: blogs.updatedAt,
				title: blogs.title,
				description: blogs.description,
				status: blogs.status,
				publishedAt: blogs.publishedAt,
			})
			.from(blogs)
			.innerJoin(userApps, eq(blogs.appId, userApps.id))
			.where(eq(userApps.userId, user.id))
			.orderBy(desc(blogs.updatedAt));

		return rows.map((row) => ({
			id: row.id,
			slug: row.slug,
			appId: row.appId,
			appName: row.appName,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			title: row.title || row.slug,
			description: row.description || "",
			status: row.status,
			publishedAt: row.publishedAt,
		}));
	})
	// --- Admin: apps ---
	.get("/api/admin/apps", async () => {
		const db = await getDb();
		const user = await requireClerkUser(db);
		return db
			.select()
			.from(userApps)
			.where(eq(userApps.userId, user.id))
			.orderBy(desc(userApps.createdAt));
	})
	.post(
		"/api/admin/apps",
		async ({ body }) => {
			const db = await getDb();
			const user = await requireClerkUser(db);
			const ts = now();
			const row = {
				id: newId(),
				userId: user.id,
				name: body.name.trim(),
				url: assertHttpUrl(body.url.trim()),
				createdAt: ts,
				updatedAt: ts,
			};
			await db.insert(userApps).values(row);
			return row;
		},
		{
			body: t.Object({
				name: t.String({ minLength: 1 }),
				url: t.String({ minLength: 1 }),
			}),
		},
	)
	.patch(
		"/api/admin/apps/:appId",
		async ({ params, body }) => {
			const db = await getDb();
			const user = await requireClerkUser(db);
			const existing = await ownedApp(db, user.id, params.appId);
			if (!existing) throw new HttpError(404, { error: "App not found" });
			const ts = now();
			const patch = {
				...(body.name !== undefined ? { name: body.name.trim() } : {}),
				...(body.url !== undefined ? { url: assertHttpUrl(body.url.trim()) } : {}),
				updatedAt: ts,
			};
			await db
				.update(userApps)
				.set(patch)
				.where(eq(userApps.id, existing.id));
			return { ...existing, ...patch };
		},
		{
			body: t.Object({
				name: t.Optional(t.String({ minLength: 1 })),
				url: t.Optional(t.String({ minLength: 1 })),
			}),
		},
	)
	.delete("/api/admin/apps/:appId", async ({ params }) => {
		const db = await getDb();
		const user = await requireClerkUser(db);
		const existing = await ownedApp(db, user.id, params.appId);
		if (!existing) throw new HttpError(404, { error: "App not found" });
		await db.delete(userApps).where(eq(userApps.id, existing.id));
		return { ok: true };
	})
	// --- Admin: API keys ---
	.get("/api/admin/apis", async () => {
		const db = await getDb();
		const user = await requireClerkUser(db);
		const rows = await db
			.select({
				id: userApis.id,
				name: userApis.name,
				createdAt: userApis.createdAt,
				updatedAt: userApis.updatedAt,
			})
			.from(userApis)
			.where(eq(userApis.userId, user.id))
			.orderBy(desc(userApis.createdAt));
		return rows;
	})
	.post(
		"/api/admin/apis",
		async ({ body }) => {
			const db = await getDb();
			const user = await requireClerkUser(db);
			const key = generateApiKey();
			const hash = await sha256Hex(key);
			const ts = now();
			const row = {
				id: newId(),
				userId: user.id,
				hash,
				name: body.name.trim(),
				createdAt: ts,
				updatedAt: ts,
			};
			await db.insert(userApis).values(row);
			return {
				id: row.id,
				name: row.name,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
				key,
			};
		},
		{
			body: t.Object({
				name: t.String({ minLength: 1 }),
			}),
		},
	)
	.delete("/api/admin/apis/:apiId", async ({ params }) => {
		const db = await getDb();
		const user = await requireClerkUser(db);
		const rows = await db
			.select()
			.from(userApis)
			.where(and(eq(userApis.id, params.apiId), eq(userApis.userId, user.id)))
			.limit(1);
		if (!rows[0]) throw new HttpError(404, { error: "API key not found" });
		await db.delete(userApis).where(eq(userApis.id, params.apiId));
		return { ok: true };
	})
	// --- Admin: blogs ---
	.get("/api/admin/apps/:appId", async ({ params }) => {
		const db = await getDb();
		const user = await requireClerkUser(db);
		const appRow = await ownedApp(db, user.id, params.appId);
		if (!appRow) throw new HttpError(404, { error: "App not found" });
		return appRow;
	})
	.get("/api/admin/apps/:appId/blogs", async ({ params }) => {
		const db = await getDb();
		const user = await requireClerkUser(db);
		const appRow = await ownedApp(db, user.id, params.appId);
		if (!appRow) throw new HttpError(404, { error: "App not found" });
		const rows = await db
			.select({
				id: blogs.id,
				slug: blogs.slug,
				appId: blogs.appId,
				createdAt: blogs.createdAt,
				updatedAt: blogs.updatedAt,
				title: blogs.title,
				description: blogs.description,
				status: blogs.status,
			})
			.from(blogs)
			.where(eq(blogs.appId, appRow.id))
			.orderBy(desc(blogs.updatedAt));

		return rows.map((row) => ({
			id: row.id,
			slug: row.slug,
			appId: row.appId,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			title: row.title || row.slug,
			description: row.description || "",
			status: row.status,
		}));
	})
	.post(
		"/api/admin/apps/:appId/blogs",
		async ({ params, body }) => {
			const db = await getDb();
			const user = await requireClerkUser(db);
			const appRow = await ownedApp(db, user.id, params.appId);
			if (!appRow) throw new HttpError(404, { error: "App not found" });
			const ts = now();
			const title = body.title?.trim() || "Untitled";
			let slug = makeBlogSlug(title);
			for (let attempt = 0; attempt < 8; attempt++) {
				try {
					const blog = {
						id: newId(),
						appId: appRow.id,
						slug,
						title,
						description: body.description?.trim() || "",
						status: "draft" as const,
						publishedAt: null as number | null,
						docSnapshot: "{}",
						contentHtml: "",
						createdAt: ts,
						updatedAt: ts,
					};
					await db.insert(blogs).values(blog);
					return { blog };
				} catch {
					slug = makeBlogSlug(title);
				}
			}
			throw new HttpError(500, { error: "Failed to allocate unique slug" });
		},
		{
			body: t.Object({
				title: t.Optional(t.String()),
				description: t.Optional(t.String()),
			}),
		},
	)
	.delete("/api/admin/blogs/:blogId", async ({ params }) => {
		const db = await getDb();
		const user = await requireClerkUser(db);
		const owned = await ownedBlog(db, user.id, params.blogId);
		if (!owned) throw new HttpError(404, { error: "Blog not found" });
		await db.delete(blogs).where(eq(blogs.id, owned.blog.id));
		return { ok: true };
	})
	.get("/api/admin/blogs/:blogId", async ({ params }) => {
		const db = await getDb();
		const user = await requireClerkUser(db);
		const owned = await ownedBlog(db, user.id, params.blogId);
		if (!owned) throw new HttpError(404, { error: "Blog not found" });
		return {
			...owned.blog,
			appId: owned.app.id,
		};
	})
	.patch(
		"/api/admin/blogs/:blogId",
		async ({ params, body }) => {
			const db = await getDb();
			const user = await requireClerkUser(db);
			const owned = await ownedBlog(db, user.id, params.blogId);
			if (!owned) throw new HttpError(404, { error: "Blog not found" });

			const ts = now();
			const patch: Partial<typeof blogs.$inferInsert> = {
				updatedAt: ts,
			};
			if (body.title !== undefined) patch.title = body.title;
			if (body.description !== undefined) patch.description = body.description;
			if (body.status !== undefined) {
				patch.status = body.status;
				if (body.status === "public" && !owned.blog.publishedAt) {
					patch.publishedAt = ts;
				}
				if (body.status === "draft") {
					// keep publishedAt history; only flip status
				}
			}
			if (body.docSnapshot !== undefined) patch.docSnapshot = body.docSnapshot;
			if (body.contentHtml !== undefined) patch.contentHtml = body.contentHtml;

			let nextSlug = owned.blog.slug;
			if (body.title !== undefined) {
				const titleForSlug = body.title.trim() || "Untitled";
				let allocated = false;
				for (let attempt = 0; attempt < 8; attempt++) {
					const candidate = makeBlogSlug(titleForSlug);
					try {
						await db
							.update(blogs)
							.set({ ...patch, slug: candidate })
							.where(eq(blogs.id, owned.blog.id));
						nextSlug = candidate;
						allocated = true;
						break;
					} catch {
						// unique conflict — retry
					}
				}
				if (!allocated) {
					throw new HttpError(500, { error: "Failed to allocate unique slug" });
				}
			} else {
				await db
					.update(blogs)
					.set(patch)
					.where(eq(blogs.id, owned.blog.id));
			}

			return { ...owned.blog, ...patch, slug: nextSlug };
		},
		{
			body: t.Object({
				title: t.Optional(t.String()),
				description: t.Optional(t.String()),
				status: t.Optional(t.Union([t.Literal("draft"), t.Literal("public")])),
				docSnapshot: t.Optional(t.String()),
				contentHtml: t.Optional(t.String()),
			}),
		},
	)
	.get("/api/media/*", async ({ params }) => {
		try {
			const key = decodeURIComponent(String(params["*"] ?? "")).replace(/^\/+/, "");
			if (!key.startsWith("uploads/")) {
				throw new HttpError(400, { error: "Invalid media key" });
			}
			const r2 = await getR2();
			const object = await r2.get(key);
			if (!object) {
				throw new HttpError(404, { error: "Not found" });
			}
			const headers = new Headers();
			headers.set(
				"content-type",
				object.httpMetadata?.contentType || "application/octet-stream",
			);
			headers.set("cache-control", "public, max-age=31536000, immutable");
			if (object.httpEtag) headers.set("etag", object.httpEtag);
			return new Response(object.body, { headers });
		} catch (error) {
			if (error instanceof HttpError) throw error;
			console.error("[media] GET failed", error);
			const message =
				error instanceof Error ? error.message : "Failed to load media";
			throw new HttpError(500, { error: message });
		}
	})
	.post("/api/admin/uploads", async ({ request }) => {
		try {
			const db = await getDb();
			const user = await requireClerkUser(db);
			const form = await request.formData();
			const file = form.get("file");
			if (!(file instanceof File)) {
				throw new HttpError(400, { error: "file is required" });
			}
			if (!file.type.startsWith("image/") && file.type !== "") {
				throw new HttpError(400, { error: "Only image uploads are supported" });
			}

			const r2 = await getR2();
			const publicBase = await getR2PublicUrl();
			const key = uploadKey(user.id, file.name || "upload.bin");
			const buffer = await file.arrayBuffer();
			await putObject(r2, key, buffer, file.type || "application/octet-stream");

			return {
				key,
				url: publicOrProxyUrl(publicBase, key),
			};
		} catch (error) {
			if (error instanceof HttpError) throw error;
			console.error("[uploads] POST failed", error);
			const message =
				error instanceof Error ? error.message : "Upload failed";
			throw new HttpError(500, { error: message });
		}
	})
	.delete("/api/admin/uploads", async ({ request }) => {
		try {
			const db = await getDb();
			const user = await requireClerkUser(db);
			const body = (await request.json()) as { url?: string; key?: string };
			const r2 = await getR2();
			const publicBase = await getR2PublicUrl();

			const raw =
				(typeof body.key === "string" && body.key.trim()) ||
				(typeof body.url === "string" && body.url.trim()) ||
				"";
			const key = resolveUploadKey(raw, publicBase || undefined) ?? "";
			if (!key) {
				throw new HttpError(400, { error: "url or key is required" });
			}

			const prefix = userUploadPrefix(user.id);
			if (!key.startsWith(prefix)) {
				throw new HttpError(403, { error: "Not allowed to delete this object" });
			}

			await deleteObject(r2, key);
			return { ok: true as const, key };
		} catch (error) {
			if (error instanceof HttpError) throw error;
			console.error("[uploads] DELETE failed", error);
			const message =
				error instanceof Error ? error.message : "Delete failed";
			throw new HttpError(500, { error: message });
		}
	});

export type App = typeof app;

export async function handle(request: Request): Promise<Response> {
	try {
		return await app.fetch(request);
	} catch (error) {
		return errorResponse(error);
	}
}
