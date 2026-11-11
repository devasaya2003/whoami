import type { Db } from "@repo/db";
import { eq } from "drizzle-orm";
import { users } from "../schema";

export type UserInsert = typeof users.$inferInsert;
export type UserRow = typeof users.$inferSelect;

export function createUsersRepository(db: Db) {
	return {
		async updateName(id: string, name: string, updatedAt: number) {
			await db.update(users).set({ name, updatedAt }).where(eq(users.id, id));
		},
	};
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;
