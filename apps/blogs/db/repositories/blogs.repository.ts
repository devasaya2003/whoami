import type { Db } from "@repo/db";
import { and, desc, eq, or } from "drizzle-orm";
import { blogs, userApps } from "../schema";

export type BlogInsert = typeof blogs.$inferInsert;
export type BlogRow = typeof blogs.$inferSelect;

export function createBlogsRepository(db: Db) {
	return {
		listPublicForApp(userId: string, appId: string) {
			return db
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
						eq(userApps.userId, userId),
						eq(userApps.id, appId),
						eq(blogs.status, "public"),
					),
				)
				.orderBy(desc(blogs.publishedAt), desc(blogs.updatedAt));
		},

		findPublicByIdOrSlug(userId: string, appId: string, idOrSlug: string) {
			return db
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
						eq(userApps.userId, userId),
						eq(userApps.id, appId),
						eq(blogs.status, "public"),
						or(eq(blogs.id, idOrSlug), eq(blogs.slug, idOrSlug))!,
					),
				)
				.limit(1)
				.then((rows) => rows[0] ?? null);
		},

		listForUser(userId: string) {
			return db
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
				.where(eq(userApps.userId, userId))
				.orderBy(desc(blogs.updatedAt));
		},

		listForApp(appId: string) {
			return db
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
				.where(eq(blogs.appId, appId))
				.orderBy(desc(blogs.updatedAt));
		},

		findOwned(userId: string, blogId: string) {
			return db
				.select({ blog: blogs, app: userApps })
				.from(blogs)
				.innerJoin(userApps, eq(blogs.appId, userApps.id))
				.where(and(eq(blogs.id, blogId), eq(userApps.userId, userId)))
				.limit(1)
				.then((rows) => rows[0] ?? null);
		},

		async create(row: BlogInsert) {
			await db.insert(blogs).values(row);
			return row;
		},

		async update(id: string, patch: Partial<BlogInsert>) {
			await db.update(blogs).set(patch).where(eq(blogs.id, id));
		},

		async remove(id: string) {
			await db.delete(blogs).where(eq(blogs.id, id));
		},
	};
}

export type BlogsRepository = ReturnType<typeof createBlogsRepository>;
