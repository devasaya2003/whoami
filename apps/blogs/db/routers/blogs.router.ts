import { Elysia, t } from "elysia";
import type { BlogsService } from "../services/blogs.service";
import type { UserRow } from "../services/me.service";

export function createBlogsRouter(deps: {
	service: BlogsService;
	requireUser: () => Promise<UserRow>;
}) {
	return new Elysia({ name: "blogs" })
		.get("/api/admin/blogs", async () => {
			const user = await deps.requireUser();
			return deps.service.listAll(user);
		})
		.get("/api/admin/apps/:appId/blogs", async ({ params }) => {
			const user = await deps.requireUser();
			return deps.service.listForApp(user, params.appId);
		})
		.post(
			"/api/admin/apps/:appId/blogs",
			async ({ params, body }) => {
				const user = await deps.requireUser();
				return deps.service.create(user, params.appId, body);
			},
			{
				body: t.Object({
					title: t.Optional(t.String()),
					description: t.Optional(t.String()),
				}),
			},
		)
		.get("/api/admin/blogs/:blogId", async ({ params }) => {
			const user = await deps.requireUser();
			return deps.service.get(user, params.blogId);
		})
		.delete("/api/admin/blogs/:blogId", async ({ params }) => {
			const user = await deps.requireUser();
			return deps.service.remove(user, params.blogId);
		})
		.patch(
			"/api/admin/blogs/:blogId",
			async ({ params, body }) => {
				const user = await deps.requireUser();
				return deps.service.update(user, params.blogId, body);
			},
			{
				body: t.Object({
					title: t.Optional(t.String()),
					description: t.Optional(t.String()),
					status: t.Optional(
						t.Union([t.Literal("draft"), t.Literal("public")]),
					),
					docSnapshot: t.Optional(t.String()),
					contentHtml: t.Optional(t.String()),
				}),
			},
		);
}
