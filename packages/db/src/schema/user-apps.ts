import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const userApps = sqliteTable("user_apps", {
	id: text("id").primaryKey().notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull().unique(),
	url: text("url").notNull().unique(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
});
