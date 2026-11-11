import type { Db } from "@repo/db";
import { and, desc, eq } from "drizzle-orm";
import { userApps } from "../schema";

export type UserAppInsert = typeof userApps.$inferInsert;
export type UserAppRow = typeof userApps.$inferSelect;

export function createUserAppsRepository(db: Db) {
	return {
		listForUser(userId: string) {
			return db
				.select()
				.from(userApps)
				.where(eq(userApps.userId, userId))
				.orderBy(desc(userApps.createdAt));
		},

		findOwned(userId: string, appId: string) {
			return db
				.select()
				.from(userApps)
				.where(and(eq(userApps.id, appId), eq(userApps.userId, userId)))
				.limit(1)
				.then((rows) => rows[0] ?? null);
		},

		async create(row: UserAppInsert) {
			await db.insert(userApps).values(row);
			return row;
		},

		async update(id: string, patch: Partial<UserAppInsert>) {
			await db.update(userApps).set(patch).where(eq(userApps.id, id));
		},

		async remove(id: string) {
			await db.delete(userApps).where(eq(userApps.id, id));
		},
	};
}

export type UserAppsRepository = ReturnType<typeof createUserAppsRepository>;
