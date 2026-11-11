import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { BlogsService } from "../services/blogs.service";
import type { UserRow } from "../services/me.service";
import { createWorkerHono } from "./worker-hono.router";

const createBlogBody = z.object({
	title: z.string().optional(),
	description: z.string().optional(),
});

const patchBlogBody = z.object({
	title: z.string().optional(),
	description: z.string().optional(),
	status: z.enum(["draft", "public"]).optional(),
	docSnapshot: z.string().optional(),
	contentHtml: z.string().optional(),
});

export function createBlogsRouter(deps: {
	service: BlogsService;
	requireUser: () => Promise<UserRow>;
}) {
	return createWorkerHono("blogs")
		.get("/api/admin/blogs", async (c) => {
			const user = await deps.requireUser();
			return c.json(await deps.service.listAll(user));
		})
		.get("/api/admin/apps/:appId/blogs", async (c) => {
			const user = await deps.requireUser();
			return c.json(await deps.service.listForApp(user, c.req.param("appId")));
		})
		.post(
			"/api/admin/apps/:appId/blogs",
			zValidator("json", createBlogBody),
			async (c) => {
				const user = await deps.requireUser();
				return c.json(
					await deps.service.create(
						user,
						c.req.param("appId"),
						c.req.valid("json"),
					),
				);
			},
		)
		.get("/api/admin/blogs/:blogId", async (c) => {
			const user = await deps.requireUser();
			return c.json(await deps.service.get(user, c.req.param("blogId")));
		})
		.delete("/api/admin/blogs/:blogId", async (c) => {
			const user = await deps.requireUser();
			return c.json(await deps.service.remove(user, c.req.param("blogId")));
		})
		.patch(
			"/api/admin/blogs/:blogId",
			zValidator("json", patchBlogBody),
			async (c) => {
				const user = await deps.requireUser();
				return c.json(
					await deps.service.update(
						user,
						c.req.param("blogId"),
						c.req.valid("json"),
					),
				);
			},
		);
}
