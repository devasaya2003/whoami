import {
	blogVersions,
	blogs,
	newId,
	now,
	userApis,
	userApps,
} from "@repo/db";
import { publicObjectUrl, putObject, uploadKey } from "@repo/storage";
import { and, desc, eq, max, ne, or } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { HttpError, requireClerkUser, resolveUserFromApiKey } from "./auth";
import { getDb, getR2, getR2PublicUrl } from "./cf";
import { generateApiKey, sha256Hex } from "./hash";

function toIso(ms: number | null | undefined): string {
	if (!ms) return "";
	return new Date(ms).toISOString();
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

async function ownedVersion(
	db: Awaited<ReturnType<typeof getDb>>,
	userId: string,
	versionId: string,
) {
	const rows = await db
		.select({
			version: blogVersions,
			blog: blogs,
			app: userApps,
		})
		.from(blogVersions)
		.innerJoin(blogs, eq(blogVersions.blogId, blogs.id))
		.innerJoin(userApps, eq(blogs.appId, userApps.id))
		.where(and(eq(blogVersions.id, versionId), eq(userApps.userId, userId)))
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
	.get(
		"/api/v1/posts",
		async ({ request, query }) => {
		const db = await getDb();
		const user = await resolveUserFromApiKey(db, request);
		if (!user) throw new HttpError(401, { error: "Invalid API key" });

		const appFilter = query.app?.trim();
		const conditions = [
			eq(userApps.userId, user.id),
			eq(blogVersions.status, "public"),
		];

		if (appFilter) {
			conditions.push(
				or(eq(userApps.id, appFilter), eq(userApps.name, appFilter))!,
			);
		}

		const rows = await db
			.select({
				slug: blogs.slug,
				title: blogVersions.title,
				description: blogVersions.description,
				publishedAt: blogVersions.publishedAt,
				version: blogVersions.version,
				blogId: blogs.id,
			})
			.from(blogVersions)
			.innerJoin(blogs, eq(blogVersions.blogId, blogs.id))
			.innerJoin(userApps, eq(blogs.appId, userApps.id))
			.where(and(...conditions))
			.orderBy(desc(blogVersions.publishedAt), desc(blogVersions.version));

		// latest public version per blog
		const latest = new Map<string, (typeof rows)[number]>();
		for (const row of rows) {
			const prev = latest.get(row.blogId);
			if (!prev || row.version > prev.version) {
				latest.set(row.blogId, row);
			}
		}

		return [...latest.values()].map((row) => ({
			slug: row.slug,
			title: row.title,
			description: row.description,
			publishedAt: toIso(row.publishedAt),
		}));
		},
		{
			query: t.Object({
				app: t.Optional(t.String()),
			}),
		},
	)
	.get(
		"/api/v1/posts/:slug",
		async ({ request, query, params }) => {
		const db = await getDb();
		const user = await resolveUserFromApiKey(db, request);
		if (!user) throw new HttpError(401, { error: "Invalid API key" });

		const appFilter = query.app?.trim();
		const conditions = [
			eq(userApps.userId, user.id),
			eq(blogs.slug, params.slug),
			eq(blogVersions.status, "public"),
		];
		if (appFilter) {
			conditions.push(
				or(eq(userApps.id, appFilter), eq(userApps.name, appFilter))!,
			);
		}

		const rows = await db
			.select({
				slug: blogs.slug,
				title: blogVersions.title,
				description: blogVersions.description,
				publishedAt: blogVersions.publishedAt,
				contentHtml: blogVersions.contentHtml,
				version: blogVersions.version,
			})
			.from(blogVersions)
			.innerJoin(blogs, eq(blogVersions.blogId, blogs.id))
			.innerJoin(userApps, eq(blogs.appId, userApps.id))
			.where(and(...conditions))
			.orderBy(desc(blogVersions.version))
			.limit(1);

		const row = rows[0];
		if (!row) throw new HttpError(404, { error: "Not found" });

		return {
			slug: row.slug,
			title: row.title,
			description: row.description,
			publishedAt: toIso(row.publishedAt),
			contentHtml: row.contentHtml,
		};
		},
		{
			query: t.Object({
				app: t.Optional(t.String()),
			}),
		},
	)
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
				url: body.url.trim(),
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
				...(body.url !== undefined ? { url: body.url.trim() } : {}),
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
	.get("/api/admin/apps/:appId/blogs", async ({ params }) => {
		const db = await getDb();
		const user = await requireClerkUser(db);
		const appRow = await ownedApp(db, user.id, params.appId);
		if (!appRow) throw new HttpError(404, { error: "App not found" });
		return db
			.select()
			.from(blogs)
			.where(eq(blogs.appId, appRow.id))
			.orderBy(desc(blogs.createdAt));
	})
	.post(
		"/api/admin/apps/:appId/blogs",
		async ({ params, body }) => {
			const db = await getDb();
			const user = await requireClerkUser(db);
			const appRow = await ownedApp(db, user.id, params.appId);
			if (!appRow) throw new HttpError(404, { error: "App not found" });
			const ts = now();
			const blog = {
				id: newId(),
				appId: appRow.id,
				slug: body.slug.trim(),
				createdAt: ts,
				updatedAt: ts,
			};
			await db.insert(blogs).values(blog);
			const version = {
				id: newId(),
				blogId: blog.id,
				version: 1,
				title: body.title?.trim() || "",
				description: body.description?.trim() || "",
				status: "draft" as const,
				publishedAt: null,
				docSnapshot: "{}",
				contentHtml: "",
				createdAt: ts,
				updatedAt: ts,
			};
			await db.insert(blogVersions).values(version);
			return { blog, version };
		},
		{
			body: t.Object({
				slug: t.String({ minLength: 1 }),
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
	// --- Admin: versions ---
	.get("/api/admin/blogs/:blogId/versions", async ({ params }) => {
		const db = await getDb();
		const user = await requireClerkUser(db);
		const owned = await ownedBlog(db, user.id, params.blogId);
		if (!owned) throw new HttpError(404, { error: "Blog not found" });
		return db
			.select()
			.from(blogVersions)
			.where(eq(blogVersions.blogId, owned.blog.id))
			.orderBy(desc(blogVersions.version));
	})
	.post("/api/admin/blogs/:blogId/versions", async ({ params }) => {
		const db = await getDb();
		const user = await requireClerkUser(db);
		const owned = await ownedBlog(db, user.id, params.blogId);
		if (!owned) throw new HttpError(404, { error: "Blog not found" });

		const maxRows = await db
			.select({ value: max(blogVersions.version) })
			.from(blogVersions)
			.where(eq(blogVersions.blogId, owned.blog.id));
		const nextVersion = (maxRows[0]?.value ?? 0) + 1;
		const latest = await db
			.select()
			.from(blogVersions)
			.where(eq(blogVersions.blogId, owned.blog.id))
			.orderBy(desc(blogVersions.version))
			.limit(1);

		const ts = now();
		const source = latest[0];
		const row = {
			id: newId(),
			blogId: owned.blog.id,
			version: nextVersion,
			title: source?.title ?? "",
			description: source?.description ?? "",
			status: "draft" as const,
			publishedAt: null,
			docSnapshot: source?.docSnapshot ?? "{}",
			contentHtml: source?.contentHtml ?? "",
			createdAt: ts,
			updatedAt: ts,
		};
		await db.insert(blogVersions).values(row);
		await db
			.update(blogs)
			.set({ updatedAt: ts })
			.where(eq(blogs.id, owned.blog.id));
		return row;
	})
	.get("/api/admin/versions/:versionId", async ({ params }) => {
		const db = await getDb();
		const user = await requireClerkUser(db);
		const owned = await ownedVersion(db, user.id, params.versionId);
		if (!owned) throw new HttpError(404, { error: "Version not found" });
		return owned.version;
	})
	.patch(
		"/api/admin/versions/:versionId",
		async ({ params, body }) => {
			const db = await getDb();
			const user = await requireClerkUser(db);
			const owned = await ownedVersion(db, user.id, params.versionId);
			if (!owned) throw new HttpError(404, { error: "Version not found" });

			const ts = now();
			const patch: Partial<typeof blogVersions.$inferInsert> = {
				updatedAt: ts,
			};
			if (body.title !== undefined) patch.title = body.title;
			if (body.description !== undefined) patch.description = body.description;
			if (body.status !== undefined) {
				patch.status = body.status;
				if (body.status === "public" && !owned.version.publishedAt) {
					patch.publishedAt = ts;
				}
			}
			if (body.docSnapshot !== undefined) patch.docSnapshot = body.docSnapshot;
			if (body.contentHtml !== undefined) patch.contentHtml = body.contentHtml;

			await db
				.update(blogVersions)
				.set(patch)
				.where(eq(blogVersions.id, owned.version.id));
			return { ...owned.version, ...patch };
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
	.post("/api/admin/versions/:versionId/publish", async ({ params }) => {
		const db = await getDb();
		const user = await requireClerkUser(db);
		const owned = await ownedVersion(db, user.id, params.versionId);
		if (!owned) throw new HttpError(404, { error: "Version not found" });

		const ts = now();
		await db
			.update(blogVersions)
			.set({ status: "draft", updatedAt: ts })
			.where(
				and(
					eq(blogVersions.blogId, owned.blog.id),
					eq(blogVersions.status, "public"),
					ne(blogVersions.id, owned.version.id),
				),
			);
		await db
			.update(blogVersions)
			.set({ status: "public", publishedAt: ts, updatedAt: ts })
			.where(eq(blogVersions.id, owned.version.id));

		return {
			...owned.version,
			status: "public" as const,
			publishedAt: ts,
			updatedAt: ts,
		};
	})
	.post("/api/admin/uploads", async ({ request }) => {
		const db = await getDb();
		const user = await requireClerkUser(db);
		const form = await request.formData();
		const file = form.get("file");
		if (!(file instanceof File)) {
			throw new HttpError(400, { error: "file is required" });
		}

		const r2 = await getR2();
		const publicBase = await getR2PublicUrl();
		if (!publicBase) {
			throw new HttpError(500, { error: "R2_PUBLIC_URL is not configured" });
		}

		const key = uploadKey(user.id, file.name || "upload.bin");
		const buffer = await file.arrayBuffer();
		await putObject(r2, key, buffer, file.type || undefined);
		return {
			key,
			url: publicObjectUrl(publicBase, key),
		};
	});

export type App = typeof app;

export async function handle(request: Request): Promise<Response> {
	try {
		return await app.fetch(request);
	} catch (error) {
		return errorResponse(error);
	}
}
