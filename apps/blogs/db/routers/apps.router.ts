import { Elysia, t } from "elysia";
import type { AppsService } from "../services/apps.service";
import type { UserRow } from "../services/me.service";

export function createAppsRouter(deps: {
	service: AppsService;
	requireUser: () => Promise<UserRow>;
}) {
	return new Elysia({ name: "apps" })
		.get("/api/admin/apps", async () => {
			const user = await deps.requireUser();
			return deps.service.list(user);
		})
		.get("/api/admin/apps/:appId", async ({ params }) => {
			const user = await deps.requireUser();
			return deps.service.get(user, params.appId);
		})
		.post(
			"/api/admin/apps",
			async ({ body }) => {
				const user = await deps.requireUser();
				return deps.service.create(user, body);
			},
			{
				body: t.Object({
					name: t.String({ minLength: 1 }),
					url: t.String({ minLength: 1 }),
				}),
			},
		)
		.patch(
			"/api/admin/apps/:appId",
			async ({ params, body }) => {
				const user = await deps.requireUser();
				return deps.service.update(user, params.appId, body);
			},
			{
				body: t.Object({
					name: t.Optional(t.String({ minLength: 1 })),
					url: t.Optional(t.String({ minLength: 1 })),
				}),
			},
		)
		.delete("/api/admin/apps/:appId", async ({ params }) => {
			const user = await deps.requireUser();
			return deps.service.remove(user, params.appId);
		});
}
