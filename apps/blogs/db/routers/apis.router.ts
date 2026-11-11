import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { ApisService } from "../services/apis.service";
import type { UserRow } from "../services/me.service";
import { createWorkerHono } from "./worker-hono.router";

const createApiBody = z.object({
	name: z.string().min(1),
});

export function createApisRouter(deps: {
	service: ApisService;
	requireUser: () => Promise<UserRow>;
}) {
	return createWorkerHono("apis")
		.get("/api/admin/apis", async (c) => {
			const user = await deps.requireUser();
			return c.json(await deps.service.list(user));
		})
		.post("/api/admin/apis", zValidator("json", createApiBody), async (c) => {
			const user = await deps.requireUser();
			const body = c.req.valid("json");
			return c.json(await deps.service.create(user, body.name));
		})
		.delete("/api/admin/apis/:apiId", async (c) => {
			const user = await deps.requireUser();
			return c.json(await deps.service.remove(user, c.req.param("apiId")));
		});
}
