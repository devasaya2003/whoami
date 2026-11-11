import type { Db } from "@repo/db";
import { and, desc, eq } from "drizzle-orm";
import { userApis } from "../schema";

export type UserApiInsert = typeof userApis.$inferInsert;
export type UserApiRow = typeof userApis.$inferSelect;

export function createUserApisRepository(db: Db) {
	return {
		listForUser(userId: string) {
			return db
				.select({
					id: userApis.id,
					name: userApis.name,
					createdAt: userApis.createdAt,
					updatedAt: userApis.updatedAt,
				})
				.from(userApis)
				.where(eq(userApis.userId, userId))
				.orderBy(desc(userApis.createdAt));
		},

		findOwned(userId: string, apiId: string) {
			return db
				.select()
				.from(userApis)
				.where(and(eq(userApis.id, apiId), eq(userApis.userId, userId)))
				.limit(1)
				.then((rows) => rows[0] ?? null);
		},

		async create(row: UserApiInsert) {
			await db.insert(userApis).values(row);
			return row;
		},

		async remove(id: string) {
			await db.delete(userApis).where(eq(userApis.id, id));
		},
	};
}

export type UserApisRepository = ReturnType<typeof createUserApisRepository>;
