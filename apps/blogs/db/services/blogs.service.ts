import { HttpError } from "../schema/http-error";
import type { BlogsRepository } from "../repositories/blogs.repository";
import type { UserAppsRepository } from "../repositories/user-apps.repository";
import type { UserRow } from "../repositories/users.repository";

export function createBlogsService(deps: {
	blogs: BlogsRepository;
	apps: Pick<UserAppsRepository, "findOwned">;
	now: () => number;
	newId: () => string;
	makeBlogSlug: (title: string) => string;
}) {
	return {
		async listAll(user: UserRow) {
			const rows = await deps.blogs.listForUser(user.id);
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
		},

		async listForApp(user: UserRow, appId: string) {
			const appRow = await deps.apps.findOwned(user.id, appId);
			if (!appRow) throw new HttpError(404, { error: "App not found" });
			const rows = await deps.blogs.listForApp(appRow.id);
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
		},

		async create(
			user: UserRow,
			appId: string,
			input: { title?: string; description?: string },
		) {
			const appRow = await deps.apps.findOwned(user.id, appId);
			if (!appRow) throw new HttpError(404, { error: "App not found" });
			const ts = deps.now();
			const title = input.title?.trim() || "Untitled";
			let slug = deps.makeBlogSlug(title);
			for (let attempt = 0; attempt < 8; attempt++) {
				try {
					const blog = {
						id: deps.newId(),
						appId: appRow.id,
						slug,
						title,
						description: input.description?.trim() || "",
						status: "draft" as const,
						publishedAt: null as number | null,
						docSnapshot: "{}",
						contentHtml: "",
						createdAt: ts,
						updatedAt: ts,
					};
					await deps.blogs.create(blog);
					return { blog };
				} catch {
					slug = deps.makeBlogSlug(title);
				}
			}
			throw new HttpError(500, { error: "Failed to allocate unique slug" });
		},

		async get(user: UserRow, blogId: string) {
			const owned = await deps.blogs.findOwned(user.id, blogId);
			if (!owned) throw new HttpError(404, { error: "Blog not found" });
			return { ...owned.blog, appId: owned.app.id };
		},

		async remove(user: UserRow, blogId: string) {
			const owned = await deps.blogs.findOwned(user.id, blogId);
			if (!owned) throw new HttpError(404, { error: "Blog not found" });
			await deps.blogs.remove(owned.blog.id);
			return { ok: true as const };
		},

		async update(
			user: UserRow,
			blogId: string,
			body: {
				title?: string;
				description?: string;
				status?: "draft" | "public";
				docSnapshot?: string;
				contentHtml?: string;
			},
		) {
			const owned = await deps.blogs.findOwned(user.id, blogId);
			if (!owned) throw new HttpError(404, { error: "Blog not found" });

			const ts = deps.now();
			const patch: {
				updatedAt: number;
				title?: string;
				description?: string;
				status?: "draft" | "public";
				publishedAt?: number | null;
				docSnapshot?: string;
				contentHtml?: string;
				slug?: string;
			} = { updatedAt: ts };

			if (body.title !== undefined) patch.title = body.title;
			if (body.description !== undefined) patch.description = body.description;
			if (body.status !== undefined) {
				patch.status = body.status;
				if (body.status === "public" && !owned.blog.publishedAt) {
					patch.publishedAt = ts;
				}
			}
			if (body.docSnapshot !== undefined) patch.docSnapshot = body.docSnapshot;
			if (body.contentHtml !== undefined) patch.contentHtml = body.contentHtml;

			let nextSlug = owned.blog.slug;
			if (body.title !== undefined) {
				const titleForSlug = body.title.trim() || "Untitled";
				let allocated = false;
				for (let attempt = 0; attempt < 8; attempt++) {
					const candidate = deps.makeBlogSlug(titleForSlug);
					try {
						await deps.blogs.update(owned.blog.id, {
							...patch,
							slug: candidate,
						});
						nextSlug = candidate;
						allocated = true;
						break;
					} catch {
						// unique conflict — retry
					}
				}
				if (!allocated) {
					throw new HttpError(500, {
						error: "Failed to allocate unique slug",
					});
				}
			} else {
				await deps.blogs.update(owned.blog.id, patch);
			}

			return { ...owned.blog, ...patch, slug: nextSlug };
		},
	};
}

export type BlogsService = ReturnType<typeof createBlogsService>;
