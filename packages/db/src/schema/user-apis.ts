import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const userApis = sqliteTable("user_apis", {
	id: text("id").primaryKey().notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	hash: text("hash").notNull().unique(),
	name: text("name").notNull().unique(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
});
