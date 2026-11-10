import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { userApps } from "./user-apps";

export const blogs = sqliteTable(
	"blogs",
	{
		id: text("id").primaryKey().notNull(),
		appId: text("app_id")
			.notNull()
			.references(() => userApps.id, { onDelete: "cascade" }),
		slug: text("slug").notNull(),
		createdAt: integer("created_at").notNull(),
		updatedAt: integer("updated_at").notNull(),
	},
	(table) => [unique("blogs_app_slug").on(table.appId, table.slug)],
);
