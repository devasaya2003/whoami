import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { MeService } from "../services/me.service";
import type { UserRow } from "../services/me.service";
import { createWorkerHono } from "./worker-hono.router";

const patchMeBody = z.object({
	name: z.string().min(1).max(120),
});

export function createMeRouter(deps: {
	service: MeService;
	requireUser: () => Promise<UserRow>;
}) {
	return createWorkerHono("me")
		.get("/api/admin/me", async (c) => {
			const user = await deps.requireUser();
			return c.json(deps.service.get(user));
		})
		.patch(
			"/api/admin/me",
			zValidator("json", patchMeBody),
			async (c) => {
				const user = await deps.requireUser();
				const body = c.req.valid("json");
				return c.json(await deps.service.update(user, body.name));
			},
		);
}
