import { HttpError } from "../services/http-error.service";
import type { PublicBlogsService } from "../services/public-blogs.service";
import type { UserRow } from "../services/me.service";
import { createWorkerElysia } from "./worker-elysia.router";

export function createPublicBlogsRouter(deps: {
	service: PublicBlogsService;
	resolveApiUser: (request: Request) => Promise<UserRow | null>;
}) {
	return createWorkerElysia("public-blogs")
		.get("/api/v1/blogs", async ({ request }) => {
			const user = await deps.resolveApiUser(request);
			if (!user) throw new HttpError(401, { error: "Invalid API key" });
			const appId = request.headers.get("app-id")?.trim() || null;
			return deps.service.list(user, appId);
		})
		.get("/api/v1/blogs/:idOrSlug", async ({ request, params }) => {
			const user = await deps.resolveApiUser(request);
			if (!user) throw new HttpError(401, { error: "Invalid API key" });
			const appId = request.headers.get("app-id")?.trim() || null;
			return deps.service.get(
				user,
				appId,
				params.idOrSlug,
				request.headers.get("type"),
			);
		});
}
