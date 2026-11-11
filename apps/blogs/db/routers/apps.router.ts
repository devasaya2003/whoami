import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppsService } from "../services/apps.service";
import type { UserRow } from "../services/me.service";
import { createWorkerHono } from "./worker-hono.router";

const createAppBody = z.object({
	name: z.string().min(1),
	url: z.string().min(1),
});

const patchAppBody = z.object({
	name: z.string().min(1).optional(),
	url: z.string().min(1).optional(),
});

export function createAppsRouter(deps: {
	service: AppsService;
	requireUser: () => Promise<UserRow>;
}) {
	return createWorkerHono("apps")
		.get("/api/admin/apps", async (c) => {
			const user = await deps.requireUser();
			return c.json(await deps.service.list(user));
		})
		.get("/api/admin/apps/:appId", async (c) => {
			const user = await deps.requireUser();
			return c.json(await deps.service.get(user, c.req.param("appId")));
		})
		.post("/api/admin/apps", zValidator("json", createAppBody), async (c) => {
			const user = await deps.requireUser();
			return c.json(await deps.service.create(user, c.req.valid("json")));
		})
		.patch(
			"/api/admin/apps/:appId",
			zValidator("json", patchAppBody),
			async (c) => {
				const user = await deps.requireUser();
				return c.json(
					await deps.service.update(
						user,
						c.req.param("appId"),
						c.req.valid("json"),
					),
				);
			},
		)
		.delete("/api/admin/apps/:appId", async (c) => {
			const user = await deps.requireUser();
			return c.json(await deps.service.remove(user, c.req.param("appId")));
		});
}
