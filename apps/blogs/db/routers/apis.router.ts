import { t } from "elysia";
import type { ApisService } from "../services/apis.service";
import type { UserRow } from "../services/me.service";
import { createWorkerElysia } from "./worker-elysia.router";

export function createApisRouter(deps: {
	service: ApisService;
	requireUser: () => Promise<UserRow>;
}) {
	return createWorkerElysia("apis")
		.get("/api/admin/apis", async () => {
			const user = await deps.requireUser();
			return deps.service.list(user);
		})
		.post(
			"/api/admin/apis",
			async ({ body }) => {
				const user = await deps.requireUser();
				return deps.service.create(user, body.name);
			},
			{
				body: t.Object({
					name: t.String({ minLength: 1 }),
				}),
			},
		)
		.delete("/api/admin/apis/:apiId", async ({ params }) => {
			const user = await deps.requireUser();
			return deps.service.remove(user, params.apiId);
		});
}
