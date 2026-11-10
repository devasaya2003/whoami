import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { blogs } from "./blogs";

export const blogVersions = sqliteTable(
	"blog_versions",
	{
		id: text("id").primaryKey().notNull(),
		blogId: text("blog_id")
			.notNull()
			.references(() => blogs.id, { onDelete: "cascade" }),
		version: integer("version").notNull(),
		title: text("title").notNull().default(""),
		description: text("description").notNull().default(""),
		status: text("status", { enum: ["draft", "public"] })
			.notNull()
			.default("draft"),
		publishedAt: integer("published_at"),
		docSnapshot: text("doc_snapshot").notNull().default("{}"),
		contentHtml: text("content_html").notNull().default(""),
		createdAt: integer("created_at").notNull(),
		updatedAt: integer("updated_at").notNull(),
	},
	(table) => [unique("blog_versions_blog_version").on(table.blogId, table.version)],
);
