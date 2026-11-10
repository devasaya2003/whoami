import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
	id: text("id").primaryKey().notNull(),
	authId: text("auth_id").notNull().unique(),
	email: text("email").notNull().unique(),
	name: text("name"),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
});
