import { HttpError } from "../services/http-error.service";
import type { PublicBlogsService } from "../services/public-blogs.service";
import type { UserRow } from "../services/me.service";
import { createWorkerHono } from "./worker-hono.router";

export function createPublicBlogsRouter(deps: {
	service: PublicBlogsService;
	resolveApiUser: (request: Request) => Promise<UserRow | null>;
}) {
	return createWorkerHono("public-blogs")
		.get("/api/v1/blogs", async (c) => {
			const user = await deps.resolveApiUser(c.req.raw);
			if (!user) throw new HttpError(401, { error: "Invalid API key" });
			const appId = c.req.header("app-id")?.trim() || null;
			return c.json(await deps.service.list(user, appId));
		})
		.get("/api/v1/blogs/:idOrSlug", async (c) => {
			const user = await deps.resolveApiUser(c.req.raw);
			if (!user) throw new HttpError(401, { error: "Invalid API key" });
			const appId = c.req.header("app-id")?.trim() || null;
			return c.json(
				await deps.service.get(
					user,
					appId,
					c.req.param("idOrSlug"),
					c.req.header("type") ?? null,
				),
			);
		});
}
